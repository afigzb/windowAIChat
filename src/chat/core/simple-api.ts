/**
 * 简化的 API 调用工具
 * 为 Agent 系统提供轻量级的 API 调用能力
 * 复用现有的适配器系统，避免代码重复
 */

import type { AIConfig, ApiProviderConfig } from '../types'
import { OpenAIAdapter } from '../adapters/openai-adapter'
import { GeminiAdapter } from '../adapters/gemini-adapter'

/**
 * 简单消息格式（用于 Agent 任务）
 */
export interface SimpleMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 创建适配器实例
 */
function createAdapter(provider: ApiProviderConfig) {
  return provider.type === 'gemini' 
    ? new GeminiAdapter(provider) 
    : new OpenAIAdapter(provider)
}

/**
 * 将简单消息转换为 FlatMessage 格式
 */
function convertToFlatMessages(messages: SimpleMessage[]) {
  return messages.map((msg, index) => ({
    id: `temp-${index}`,
    role: msg.role,
    content: msg.content,
    parentId: index > 0 ? `temp-${index - 1}` : null,
    timestamp: new Date(),
    siblings: []
  }))
}

/**
 * 简化的 API 调用函数
 * 用于 Agent 任务等简单场景，不需要完整的对话树管理
 * 
 * @param messages 简单消息列表
 * @param provider API 提供商配置
 * @param config AI 配置（用于上下文引擎）
 * @param abortSignal 中断信号
 * @param onStream 流式输出回调（可选）
 * @returns AI 返回的内容
 */
export async function callSimpleAPI(
  messages: SimpleMessage[],
  provider: ApiProviderConfig,
  config: AIConfig,
  abortSignal?: AbortSignal,
  onStream?: (content: string) => void
): Promise<string> {
  // 创建适配器
  const adapter = createAdapter(provider)
  
  // 转换消息格式
  const flatMessages = convertToFlatMessages(messages)
  
  // 创建 AbortController（如果没有提供）
  const controller = abortSignal ? { signal: abortSignal } : new AbortController()
  const signal = controller.signal
  
  // 累积的内容
  let accumulatedContent = ''
  
  // 调用 API（复用现有适配器）
  const result = await adapter.callAPI(
    flatMessages,
    config,
    signal,
    () => {}, // onThinkingUpdate - Agent 任务不需要思考过程
    (content) => {
      accumulatedContent = content
      if (onStream) {
        onStream(content)
      }
    },
    undefined, // tempContent
    'append',  // tempPlacement
    undefined  // tempContentList
  )
  
  return result.content
}

