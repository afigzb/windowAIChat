import type { FlatMessage, AIConfig, ApiProviderConfig } from '../types'
import { composeMessages } from '../core/request-composer'

/**
 * Gemini 系适配器 - 专门处理 Google Gemini API
 */
export class GeminiAdapter {
  private provider: ApiProviderConfig

  constructor(provider: ApiProviderConfig) {
    this.provider = provider
  }

  // 统一由 RequestComposer 负责消息组装

  /**
   * 构建 Gemini 格式的请求体
   */
  private buildRequestBody(
    messages: FlatMessage[],
    config: AIConfig,
    extraContextText?: string
  ): Record<string, any> {
    const commonMessages = composeMessages({ history: messages, config, extraContextText })
    
    // 转换为 Gemini 格式
    const contents = []
    for (const msg of commonMessages) {
      if (msg.role === 'system') {
        // 系统消息转为用户消息+模型回复
        contents.push({ role: 'user', parts: [{ text: msg.content }] })
        contents.push({ role: 'model', parts: [{ text: '好的，我明白了。' }] })
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })
      }
    }
    
    // 构建生成配置，优先使用provider配置的maxTokens
    const generationConfig: Record<string, any> = { 
      temperature: 0.9, 
      maxOutputTokens: this.provider.maxTokens || 8192 
    }
    
    let base: Record<string, any> = {
      contents,
      generationConfig
    }
    
    base = this.provider.extraParams ? { ...base, ...this.provider.extraParams } : base

    // 代码配置模式：允许用户以JSON覆盖或扩展请求体
    if (this.provider.enableCodeConfig && this.provider.codeConfigJson) {
      try {
        const userJson = JSON.parse(this.provider.codeConfigJson)
        // 更新策略：始终用我们构建的 contents 覆盖用户提供的 contents
        base = {
          ...base,
          ...userJson,
          contents: base.contents
        }
      } catch (e) {
        // 忽略JSON解析失败，继续使用表单模式
      }
    }

    return base
  }

  // 简化提取：仅从 parts[].text 聚合为最终答案
  private extractAnswer(result: any): string {
    const parts = result?.candidates?.[0]?.content?.parts || []
    const texts = parts
      .map((p: any) => (p && typeof p.text === 'string' ? p.text : ''))
      .filter((t: string) => !!t)
    return texts.join('\n').trim()
  }

  /**
   * 调用 Gemini API
   */
  async callAPI(
    messages: FlatMessage[],
    config: AIConfig,
    abortSignal: AbortSignal,
    onThinkingUpdate: (thinking: string) => void,
    onAnswerUpdate: (answer: string) => void,
    extraContextText?: string
  ): Promise<{ reasoning_content?: string; content: string }> {
    const requestBody = this.buildRequestBody(messages, config, extraContextText)
    
    // 构建请求URL（包含API Key）
    const fetchUrl = `${this.provider.baseUrl}?key=${this.provider.apiKey}`
    
    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.provider.extraHeaders) {
      Object.assign(headers, this.provider.extraHeaders)
    }

    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: abortSignal
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API 请求失败: ${response.status} - ${errorText}`)
    }

    // Gemini 非流式响应
    const result = await response.json()
    const content = this.extractAnswer(result)
    if (!content) {
      throw new Error('Gemini API 返回空响应内容')
    }

    onAnswerUpdate(content)

    return { content }
  }
}
