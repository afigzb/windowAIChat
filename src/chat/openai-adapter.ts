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
    
    const base: Record<string, any> = {
      model: this.provider.model,
      messages: commonMessages,
      stream: true
    }
    
    // 添加最大token数限制（如果配置了）
    if (this.provider.maxTokens && this.provider.maxTokens > 0) {
      base.max_tokens = this.provider.maxTokens
    }
    
    let merged: Record<string, any> = this.provider.extraParams ? { ...base, ...this.provider.extraParams } : base

    // 代码配置模式：允许用户以JSON覆盖或扩展请求体
    if (this.provider.enableCodeConfig && this.provider.codeConfigJson) {
      try {
        const userJson = JSON.parse(this.provider.codeConfigJson)

        // 合并策略（更新）：
        // - 其他字段：浅合并，用户优先
        // - messages：始终使用系统构建的对话历史（覆盖用户提供的 messages）
        merged = {
          ...merged,
          ...userJson,
          messages: base.messages
        }
      } catch (e) {
        // JSON 解析失败时，忽略用户配置，继续使用表单模式
      }
    }

    return merged
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

    if (!content) {
      throw new Error('OpenAI 兼容 API 返回空响应内容')
    }

    return {
      reasoning_content: reasoning_content || undefined,
      content
    }
  }
}
