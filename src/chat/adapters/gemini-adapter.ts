import type { FlatMessage, AIConfig, ApiProviderConfig } from '../types'
import { contextEngine } from '../core/context'

/**
 * Gemini 系适配器 - 专门处理 Google Gemini API
 * 
 * 特性：
 * - 自动转换消息格式：将通用格式转换为 Gemini 的 contents/systemInstruction 格式
 * - 支持流式响应：处理 Gemini 的 JSON 数组流式格式
 * - 支持思考模式：提取并展示 AI 的思考过程（thought）和最终答案（answer）
 * - 灵活配置：通过 extraParams 或 codeConfigJson 自定义请求参数
 * 
 * 常用配置参数（通过 codeConfigJson）：
 * ```json
 * {
 *   "generationConfig": {
 *     "temperature": 0.7,           // 温度参数（0.0-2.0）
 *     "topP": 0.9,                  // nucleus sampling
 *     "topK": 40,                   // top-k sampling
 *     "maxOutputTokens": 8192,      // 最大输出令牌数
 *     "thinkingConfig": {
 *       "includeThoughts": true,    // 是否包含思考过程
 *       "thinkingBudget": -1        // 思考预算（-1 为动态）
 *     }
 *   },
 *   "safetySettings": [              // 安全设置
 *     { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" }
 *   ]
 * }
 * ```
 */
export class GeminiAdapter {
  private provider: ApiProviderConfig

  constructor(provider: ApiProviderConfig) {
    this.provider = provider
  }

  // 统一由 ContextEngine 负责消息组装

  /**
   * 构建完整的请求数据（用于预览和实际请求）
   * 默认使用流式端点以提供更好的用户体验
   */
  buildRequestData(
    messages: FlatMessage[],
    config: AIConfig,
    tempContent?: string,
    tempPlacement: 'append' | 'after_system' = 'append',
    tempContentList?: string[]
  ): { url: string; headers: Record<string, string>; body: Record<string, any> } {
    const body = this.buildRequestBody(messages, config, tempContent, tempPlacement, tempContentList)
    
    // 根据官方文档，API 密钥应该在 header 中使用 x-goog-api-key
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-goog-api-key': this.provider.apiKey
    }

    if (this.provider.extraHeaders) {
      Object.assign(headers, this.provider.extraHeaders)
    }

    // 始终使用流式端点 streamGenerateContent
    const url = this.provider.baseUrl.includes(':generateContent') || this.provider.baseUrl.includes(':streamGenerateContent')
      ? this.provider.baseUrl.replace(/:(?:stream)?generateContent.*$/, ':streamGenerateContent')
      : `${this.provider.baseUrl}:streamGenerateContent`

    return {
      url,
      headers,
      body
    }
  }

  /**
   * 构建 Gemini 格式的请求体
   * 
   * 消息格式转换：
   * - system 消息 -> systemInstruction.parts
   * - user/assistant 消息 -> contents (role: user/model)
   * 
   * 参数优先级（从高到低）：
   * 1. codeConfigJson 中的自定义配置（除了 contents 和 systemInstruction）
   * 2. extraParams 中的参数
   * 3. 默认配置（maxOutputTokens, thinkingConfig）
   */
  private buildRequestBody(
    messages: FlatMessage[],
    config: AIConfig,
    tempContent?: string,
    tempPlacement: 'append' | 'after_system' = 'append',
    tempContentList?: string[]
  ): Record<string, any> {
    const commonMessages = contextEngine.buildRequestMessages(messages, config, tempContent, tempPlacement, tempContentList)
    
    // 分离 system 消息和其他消息
    const systemMessages: string[] = []
    const contents = []
    
    for (const msg of commonMessages) {
      if (msg.role === 'system') {
        // 收集所有 system 消息
        systemMessages.push(msg.content)
      } else {
        // 转换为 Gemini 格式
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })
      }
    }
    
    // 构建生成配置，优先使用provider配置的maxTokens
    const generationConfig: Record<string, any> = { 
      maxOutputTokens: this.provider.maxTokens || 8192
    }
    
    // 只在需要时添加 thinkingConfig（Gemini 2.5 Pro/Flash 支持思考功能）
    // 默认启用以支持推理模式，用户可通过 codeConfigJson 覆盖
    if (!this.provider.extraParams?.generationConfig?.thinkingConfig) {
      generationConfig.thinkingConfig = {
        thinkingBudget: -1,      // 启用动态思考，模型根据问题复杂度自动调整预算
        includeThoughts: true    // 在响应中包含思考摘要
      }
    }
    
    let base: Record<string, any> = {
      contents,
      generationConfig
    }
    
    // 如果有 system 消息，添加 systemInstruction
    if (systemMessages.length > 0) {
      base.systemInstruction = {
        parts: systemMessages.map(text => ({ text }))
      }
    }
    
    base = this.provider.extraParams ? { ...base, ...this.provider.extraParams } : base

    // 代码配置模式：允许用户以JSON覆盖或扩展请求体
    if (this.provider.enableCodeConfig && this.provider.codeConfigJson) {
      try {
        const userJson = JSON.parse(this.provider.codeConfigJson)
        // 更新策略：
        // 1. 始终用我们构建的 contents 覆盖用户提供的 contents
        // 2. 始终用我们构建的 systemInstruction 覆盖用户提供的（如果有）
        const result = {
          ...base,
          ...userJson,
          contents: base.contents
        }
        
        // 如果我们有 systemInstruction，覆盖用户的
        if (base.systemInstruction) {
          result.systemInstruction = base.systemInstruction
        }
        
        base = result
      } catch (e) {
        // 忽略JSON解析失败，继续使用表单模式
      }
    }

    return base
  }

  /**
   * 从 Gemini 响应中提取思考和答案内容
   * @returns { thought: string, answer: string }
   */
  private extractContent(result: any): { thought: string; answer: string } {
    const parts = result?.candidates?.[0]?.content?.parts || []
    
    let thought = ''
    let answer = ''
    
    for (const part of parts) {
      if (!part || typeof part.text !== 'string') continue
      
      if (part.thought === true) {
        // 这是思考内容
        thought += part.text
      } else {
        // 这是答案内容
        answer += part.text
      }
    }
    
    return {
      thought: thought.trim(),
      answer: answer.trim()
    }
  }

  /**
   * 调用 Gemini API（流式响应）
   */
  async callAPI(
    messages: FlatMessage[],
    config: AIConfig,
    abortSignal: AbortSignal,
    onThinkingUpdate: (thinking: string) => void,
    onAnswerUpdate: (answer: string) => void,
    tempContent?: string,
    tempPlacement: 'append' | 'after_system' = 'append',
    tempContentList?: string[]
  ): Promise<{ reasoning_content?: string; content: string }> {
    const { url, headers, body } = this.buildRequestData(messages, config, tempContent, tempPlacement, tempContentList)

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: abortSignal
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API 请求失败: ${response.status} - ${errorText}`)
    }

    // 处理 Gemini 流式响应（JSON 数组格式）
    let thinking = ''  // 累积的思考内容
    let content = ''   // 累积的答案内容
    let buffer = ''

    const reader = response.body?.getReader()
    if (!reader) throw new Error('无法获取响应流')

    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // 将新数据追加到缓冲区
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // Gemini 流式响应是 JSON 数组格式: [{obj1}, {obj2}, ...]
        // 我们需要逐个提取 JSON 对象
        let processedUpTo = 0
        
        // 跳过开头的 '['
        if (buffer.startsWith('[')) {
          processedUpTo = 1
        }

        while (true) {
          // 跳过空白和逗号
          while (processedUpTo < buffer.length && 
                 (buffer[processedUpTo] === ',' || buffer[processedUpTo] === '\n' || 
                  buffer[processedUpTo] === ' ' || buffer[processedUpTo] === '\r')) {
            processedUpTo++
          }

          if (processedUpTo >= buffer.length) break
          
          // 如果遇到 ']'，说明结束了
          if (buffer[processedUpTo] === ']') break

          // 尝试找到一个完整的 JSON 对象
          if (buffer[processedUpTo] === '{') {
            let braceCount = 0
            let i = processedUpTo
            let inString = false
            let escape = false

            // 找到匹配的 '}'
            for (; i < buffer.length; i++) {
              const char = buffer[i]
              
              if (escape) {
                escape = false
                continue
              }

              if (char === '\\') {
                escape = true
                continue
              }

              if (char === '"') {
                inString = !inString
                continue
              }

              if (!inString) {
                if (char === '{') braceCount++
                else if (char === '}') {
                  braceCount--
                  if (braceCount === 0) {
                    // 找到完整的 JSON 对象
                    const jsonStr = buffer.substring(processedUpTo, i + 1)
                    try {
                      const parsed = JSON.parse(jsonStr)
                      const { thought, answer } = this.extractContent(parsed)
                      
                      // 更新思考内容
                      if (thought) {
                        thinking += thought
                        onThinkingUpdate(thinking)
                      }
                      
                      // 更新答案内容
                      if (answer) {
                        content += answer
                        onAnswerUpdate(content)
                      }
                    } catch (e) {
                      // 忽略解析错误
                    }
                    processedUpTo = i + 1
                    break
                  }
                }
              }
            }

            // 如果没找到完整的对象，说明还需要更多数据
            if (braceCount > 0) break
          } else {
            // 不是 '{' 开头，跳过这个字符
            processedUpTo++
          }
        }

        // 清理已处理的部分
        buffer = buffer.substring(processedUpTo)
      }
    } finally {
      reader.releaseLock()
    }

    if (!content) {
      throw new Error('Gemini API 返回空响应内容')
    }

    return { 
      reasoning_content: thinking || undefined,
      content 
    }
  }
}
