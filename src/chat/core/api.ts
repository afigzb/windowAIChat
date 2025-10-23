import type { FlatMessage, AIConfig, ApiProviderConfig, ProviderType } from '../types'
import { OpenAIAdapter } from '../adapters/openai-adapter'
import { GeminiAdapter } from '../adapters/gemini-adapter'
import { DEFAULT_CONFIG } from './defaults'

/**
 * 获取 API 提供商类型（使用配置中的类型，不再自动检测）
 */
function getProviderType(provider: ApiProviderConfig): ProviderType {
  return provider.type
}

interface ChatAdapter {
  callAPI(
    messages: FlatMessage[],
    config: AIConfig,
    abortSignal: AbortSignal,
    onThinkingUpdate: (thinking: string) => void,
    onAnswerUpdate: (answer: string) => void,
    tempContent?: string,
    tempPlacement?: 'append' | 'after_system',
    tempContentList?: string[]
  ): Promise<{ reasoning_content?: string; content: string }>
  buildRequestData(
    messages: FlatMessage[],
    config: AIConfig,
    tempContent?: string,
    tempPlacement?: 'append' | 'after_system',
    tempContentList?: string[]
  ): { url: string; headers: Record<string, string>; body: Record<string, any> }
}

function createAdapter(provider: ApiProviderConfig): ChatAdapter {
  const type = getProviderType(provider)
  return type === 'gemini' ? new GeminiAdapter(provider) : new OpenAIAdapter(provider)
}

/**
 * 通用AI API调用函数 - 统一接口层
 * 根据配置的提供商类型选择合适的适配器（不再自动检测）
 */
export async function callAIAPI(
  messages: FlatMessage[],
  config: AIConfig = DEFAULT_CONFIG,
  abortSignal: AbortSignal,
  onThinkingUpdate: (thinking: string) => void,
  onAnswerUpdate: (answer: string) => void,
  tempContent?: string,
  tempPlacement: 'append' | 'after_system' = 'append',
  tempContentList?: string[]
): Promise<{ reasoning_content?: string; content: string }> {
  const currentProvider = config.providers.find(p => p.id === config.currentProviderId)
  if (!currentProvider) {
    throw new Error(`找不到API配置: ${config.currentProviderId}`)
  }

  const adapter = createAdapter(currentProvider)

  return await adapter.callAPI(
    messages,
    config,
    abortSignal,
    onThinkingUpdate,
    onAnswerUpdate,
    tempContent,
    tempPlacement,
    tempContentList
  )
}

/**
 * 获取预览数据 - 不实际发送请求
 * 用于预览即将发送的请求内容
 */
export function getPreviewData(
  messages: FlatMessage[],
  config: AIConfig = DEFAULT_CONFIG,
  tempContent?: string,
  tempPlacement: 'append' | 'after_system' = 'append',
  tempContentList?: string[]
): { url: string; headers: Record<string, string>; body: Record<string, any> } {
  const currentProvider = config.providers.find(p => p.id === config.currentProviderId)
  if (!currentProvider) {
    throw new Error(`找不到API配置: ${config.currentProviderId}`)
  }

  const adapter = createAdapter(currentProvider)

  return adapter.buildRequestData(messages, config, tempContent, tempPlacement, tempContentList)
} 