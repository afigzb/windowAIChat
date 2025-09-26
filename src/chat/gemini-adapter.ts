import type { FlatMessage, AIConfig, ChatMode, ApiProviderConfig } from './types'

/**
 * Gemini 系适配器 - 专门处理 Google Gemini API
 */
export class GeminiAdapter {
  private provider: ApiProviderConfig

  constructor(provider: ApiProviderConfig) {
    this.provider = provider
  }

  /**
   * 构建通用消息列表
   */
  private buildMessages(messages: FlatMessage[], config: AIConfig): Array<{ role: string; content: string }> {
    const currentDate = new Date().toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
    
    // 使用配置中的系统提示
    const systemPrompt = `${config.systemPrompt}\n今天是${currentDate}。`
    
    // 处理消息，仅保留用户和助手消息
    const allProcessedMessages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))
    
    // 根据配置限制保留的历史消息数量
    const recentMessages = allProcessedMessages.slice(-config.historyLimit)
    
    const finalMessages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages
    ]
    
    return finalMessages
  }

  /**
   * 构建 Gemini 格式的请求体
   */
  private buildRequestBody(
    messages: FlatMessage[],
    _currentMode: ChatMode,
    config: AIConfig
  ): Record<string, any> {
    const commonMessages = this.buildMessages(messages, config)
    
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
      maxOutputTokens: this.provider.maxTokens || 2048 
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
    currentMode: ChatMode,
    config: AIConfig,
    abortSignal: AbortSignal,
    onThinkingUpdate: (thinking: string) => void,
    onAnswerUpdate: (answer: string) => void
  ): Promise<{ reasoning_content?: string; content: string }> {
    const requestBody = this.buildRequestBody(messages, currentMode, config)
    
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
