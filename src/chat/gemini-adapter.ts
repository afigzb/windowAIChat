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
    
    const base = {
      contents,
      generationConfig: { temperature: 0.9, maxOutputTokens: 2048 }
    }
    
    return this.provider.extraParams ? { ...base, ...this.provider.extraParams } : base
  }

  /**
   * 提取 Gemini 响应中的最终答案与可能的思考内容
   * 由于Google的返回结构在不同版本/SDK之间可能存在差异，这里做尽量稳健的提取。
   */
  private extractGeminiOutputs(result: any): { thinking: string; answer: string } {
    const candidate = result?.candidates?.[0] || {}
    const parts = candidate?.content?.parts || []

    let answerText = ''
    let reasoningText = ''

    for (const p of parts) {
      if (p && typeof p.text === 'string') {
        answerText += (answerText ? '\n' : '') + p.text
      }
      // 兼容可能的思考字段命名
      if (p && typeof p.thought === 'string') {
        reasoningText += (reasoningText ? '\n' : '') + p.thought
      }
      if (p && typeof p.reasoning === 'string') {
        reasoningText += (reasoningText ? '\n' : '') + p.reasoning
      }
      if (p && p.thought && typeof p.thought.text === 'string') {
        reasoningText += (reasoningText ? '\n' : '') + p.thought.text
      }
    }

    // 兜底：尝试从candidate或顶层读取
    if (!reasoningText) {
      if (typeof candidate?.reasoning === 'string') {
        reasoningText = candidate.reasoning
      } else if (typeof candidate?.thoughts === 'string') {
        reasoningText = candidate.thoughts
      } else if (typeof result?.reasoning === 'string') {
        reasoningText = result.reasoning
      }
    }

    return { thinking: reasoningText, answer: answerText }
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

    console.log('📤 发送给 Gemini API:', JSON.stringify(requestBody.contents, null, 2))

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
    const extracted = this.extractGeminiOutputs(result)
    
    const content = extracted.answer || result.candidates?.[0]?.content?.parts?.[0]?.text || '抱歉，我无法理解您的问题。'
    let reasoning_content: string | undefined

    if (extracted.thinking) {
      reasoning_content = extracted.thinking
      onThinkingUpdate(reasoning_content)
    }
    
    onAnswerUpdate(content)

    return {
      reasoning_content,
      content
    }
  }
}
