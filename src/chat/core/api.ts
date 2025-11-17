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
  tempContentList?: string[] | import('../../file-manager/utils/fileHelper').FormattedFileContent[]
): Promise<{ reasoning_content?: string; content: string }> {
  const currentProvider = config.providers.find(p => p.id === config.currentProviderId)
  if (!currentProvider) {
    throw new Error(`找不到API配置: ${config.currentProviderId}`)
  }

  // 转换 FormattedFileContent[] 为 string[]（如果需要）
  let normalizedList: string[] | undefined
  if (tempContentList) {
    if (typeof tempContentList[0] === 'object' && 'content' in tempContentList[0]) {
      // 是 FormattedFileContent[]，提取 content
      normalizedList = (tempContentList as import('../../file-manager/utils/fileHelper').FormattedFileContent[]).map(f => f.content)
    } else {
      // 已经是 string[]
      normalizedList = tempContentList as string[]
    }
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
    normalizedList
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
  tempContentList?: string[] | import('../../file-manager/utils/fileHelper').FormattedFileContent[]
): { url: string; headers: Record<string, string>; body: Record<string, any> } {
  const currentProvider = config.providers.find(p => p.id === config.currentProviderId)
  if (!currentProvider) {
    throw new Error(`找不到API配置: ${config.currentProviderId}`)
  }

  // 转换 FormattedFileContent[] 为 string[]（如果需要）
  let normalizedList: string[] | undefined
  if (tempContentList) {
    if (typeof tempContentList[0] === 'object' && 'content' in tempContentList[0]) {
      // 是 FormattedFileContent[]，提取 content
      normalizedList = (tempContentList as import('../../file-manager/utils/fileHelper').FormattedFileContent[]).map(f => f.content)
    } else {
      // 已经是 string[]
      normalizedList = tempContentList as string[]
    }
  }

  const adapter = createAdapter(currentProvider)

  return adapter.buildRequestData(messages, config, tempContent, tempPlacement, normalizedList)
} 