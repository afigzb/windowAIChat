import type { FlatMessage, ChatStreamResponse, AIConfig, ApiProviderConfig } from '../types'
import { contextEngine } from '../core/context'

/**
 * OpenAI 系适配器 - 处理 OpenAI 兼容的 API
 */
export class OpenAIAdapter {
  private provider: ApiProviderConfig

  constructor(provider: ApiProviderConfig) {
    this.provider = provider
  }

  // 统一由 ContextEngine 负责消息组装

  /**
   * 构建 OpenAI 格式的请求体
   */
  private buildRequestBody(
    messages: FlatMessage[],
    config: AIConfig,
    tempContent?: string,
    tempPlacement: 'append' | 'after_system' = 'append'
  ): Record<string, any> {
    const commonMessages = contextEngine.buildRequestMessages(messages, config, tempContent, tempPlacement)
    
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
    config: AIConfig,
    abortSignal: AbortSignal,
    onThinkingUpdate: (thinking: string) => void,
    onAnswerUpdate: (answer: string) => void,
    tempContent?: string,
    tempPlacement: 'append' | 'after_system' = 'append'
  ): Promise<{ reasoning_content?: string; content: string }> {
    const requestBody = this.buildRequestBody(messages, config, tempContent, tempPlacement)
    
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
