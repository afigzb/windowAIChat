/**
 * 简化的 API 调用工具
 * 为 Agent 系统提供轻量级的 API 调用能力
 */

import type { ApiProviderConfig } from '../types'
import { OpenAIAdapter } from '../adapters/openai-adapter'
import { GeminiAdapter } from '../adapters/gemini-adapter'

export interface SimpleMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 简化的 API 调用函数
 * 不经过上下文引擎，直接使用适配器调用 API
 */
export async function callSimpleAPI(
  messages: SimpleMessage[],
  provider: ApiProviderConfig,
  config: any,
  abortSignal?: AbortSignal,
  onStream?: (content: string) => void
): Promise<string> {
  try {
    
    const adapter = provider.type === 'gemini' 
      ? new GeminiAdapter(provider)
      : new OpenAIAdapter(provider)
    
    const result = await adapter.callRawAPI(messages, abortSignal, onStream)
    
    console.log('[SimpleAPI] 获取到的消息:', {
      length: result.length,
      preview: result.substring(0, 100) + (result.length > 100 ? '...' : '')
    })
    
    return result
  } catch (error: any) {
    console.error('[SimpleAPI] API调用失败:', error.message)
    throw error
  }
}

