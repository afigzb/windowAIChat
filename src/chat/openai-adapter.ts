import type { FlatMessage, ChatStreamResponse, AIConfig, ChatMode, ApiProviderConfig } from './types'

/**
 * OpenAI 系适配器 - 处理 OpenAI 兼容的 API (DeepSeek、Kimi 等)
 */
export class OpenAIAdapter {
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
   * 构建 OpenAI 格式的请求体
   */
  private buildRequestBody(
    messages: FlatMessage[],
    _currentMode: ChatMode,
    config: AIConfig
  ): Record<string, any> {
    const commonMessages = this.buildMessages(messages, config)
    
    const base = {
      model: this.provider.model,
      messages: commonMessages,
      stream: true
    }
    
    return this.provider.extraParams ? { ...base, ...this.provider.extraParams } : base
  }

  /**
   * 解析流式响应数据块
   */
  private parseStreamChunk(chunk: string): Array<{ reasoning_content?: string; content?: string }> {
    return chunk.split('\n')
      .filter(line => line.startsWith('data: '))
      .map(line => line.slice(6).trim())
      .filter(data => data !== '[DONE]')
      .map(data => {
        try {
          const parsed: ChatStreamResponse = JSON.parse(data)
          return parsed.choices[0]?.delta || {}
        } catch {
          return {}
        }
      })
      .filter(delta => delta.reasoning_content || delta.content)
  }

  /**
   * 调用 OpenAI 兼容的 API
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
    
    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.provider.apiKey}`
    }

    if (this.provider.extraHeaders) {
      Object.assign(headers, this.provider.extraHeaders)
    }

    console.log('📤 发送给 OpenAI 兼容 API 的消息:', JSON.stringify(requestBody.messages, null, 2))

    const response = await fetch(this.provider.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: abortSignal
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API 请求失败: ${response.status} - ${errorText}`)
    }

    // 处理流式响应
    let reasoning_content = ''
    let content = ''

    const reader = response.body?.getReader()
    if (!reader) throw new Error('无法获取响应流')

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const deltas = this.parseStreamChunk(new TextDecoder().decode(value))
        for (const delta of deltas) {
          if (delta.reasoning_content) {
            reasoning_content += delta.reasoning_content
            onThinkingUpdate(reasoning_content)
          }
          if (delta.content) {
            content += delta.content
            onAnswerUpdate(content)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return {
      reasoning_content: reasoning_content || undefined,
      content: content || '抱歉，我无法理解您的问题。'
    }
  }
}
