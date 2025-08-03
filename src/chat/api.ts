import type { FlatMessage, DeepSeekStreamResponse, AIConfig, ChatMode } from './types'

// DeepSeek API 配置
const API_BASE_URL = 'https://api.deepseek.com/v1/chat/completions'

// 默认AI配置参数
export const DEFAULT_CONFIG: AIConfig = {
  v3Config: {
    temperature: 1.0,    // 创造性参数，越高越创新
    maxTokens: 8000      // 最大输出长度 - V3模式限制为8K
  },
  r1Config: {
    maxTokens: 32000     // R1模式最大输出长度 - R1模式默认32K，最大64K
  },
  showThinking: true,    // 是否显示思考过程
  apiKey: ''            // 用户自定义API密钥
}

/**
 * 构建API请求消息列表
 * 过滤掉系统不需要的消息类型，添加系统提示
 * 为了节约tokens，只保留最近10条对话作为历史
 * @param messages 原始消息列表
 */
function buildMessages(messages: FlatMessage[]): Array<{ role: string; content: string }> {
  const currentDate = new Date().toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
  
  const systemPrompt = `该助手为DeepSeek Chat，由深度求索公司创造。\n今天是${currentDate}。`
  
  // 处理消息，仅保留用户和助手消息
  const allProcessedMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: m.content }))
  
  // 只保留最近10次对话（20条消息：10个用户+10个助手，为了节约tokens）
  const recentMessages = allProcessedMessages.slice(-20)
  
  const finalMessages = [
    { role: 'system', content: systemPrompt },
    ...recentMessages
  ]
  
  return finalMessages
}

/**
 * 构建完整的API请求体
 * 根据不同模式设置不同参数
 */
function buildRequestBody(
  messages: FlatMessage[], 
  currentMode: ChatMode, 
  config: AIConfig
): Record<string, any> {
  const model = currentMode === 'r1' ? 'deepseek-reasoner' : 'deepseek-chat'
  const modelConfig = currentMode === 'r1' ? config.r1Config : config.v3Config
  
  const requestBody = {
    model,
    messages: buildMessages(messages),
    max_tokens: modelConfig.maxTokens,
    stream: true    // 启用流式响应
  }

  // V3模式添加temperature参数，R1模式不支持
  if (currentMode === 'v3') {
    return { ...requestBody, temperature: config.v3Config.temperature }
  }

  return requestBody
}

/**
 * 解析流式响应数据块
 * 处理 Server-Sent Events 格式的数据
 */
function parseStreamChunk(chunk: string): Array<{ reasoning_content?: string; content?: string }> {
  return chunk.split('\n')
    .filter(line => line.startsWith('data: '))
    .map(line => line.slice(6).trim())
    .filter(data => data !== '[DONE]')
    .map(data => {
      try {
        const parsed: DeepSeekStreamResponse = JSON.parse(data)
        return parsed.choices[0]?.delta || {}
      } catch {
        return {}
      }
    })
    .filter(delta => delta.reasoning_content || delta.content)
}

/**
 * 调用DeepSeek API的主函数
 * 支持流式响应和中断控制
 */
export async function callDeepSeekAPI(
  messages: FlatMessage[],
  currentMode: ChatMode,
  config: AIConfig,
  abortSignal: AbortSignal,
  onThinkingUpdate: (thinking: string) => void,
  onAnswerUpdate: (answer: string) => void
): Promise<{ reasoning_content?: string; content: string }> {
  
  const requestBody = buildRequestBody(messages, currentMode, config)
  
  // 直接输出发送的消息内容
  console.log('📤 发送给API的消息:', JSON.stringify(requestBody.messages, null, 2))
  
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(requestBody),
    signal: abortSignal
  })

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法获取响应流')

  let reasoning_content = ''  // R1模式的思考过程
  let content = ''           // 最终回答内容

  try {
    // 持续读取流式数据
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const deltas = parseStreamChunk(new TextDecoder().decode(value))
      for (const delta of deltas) {
        if (delta.reasoning_content) {
          reasoning_content += delta.reasoning_content
          onThinkingUpdate(reasoning_content)  // 实时更新思考过程
        }
        if (delta.content) {
          content += delta.content
          onAnswerUpdate(content)  // 实时更新回答内容
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