import type { FlatMessage, AIConfig, ApiProviderConfig, ProviderType } from './types'
import { OpenAIAdapter } from './openai-adapter'
import { GeminiAdapter } from './gemini-adapter'

// 默认API提供方配置
const DEFAULT_PROVIDERS: ApiProviderConfig[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    type: 'openai',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: '',
    model: 'deepseek-chat'
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    type: 'openai',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: '',
    model: 'deepseek-reasoner'
  },
  {
    id: 'kimi-chat',
    name: 'Kimi Chat',
    type: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
    apiKey: '',
    model: 'kimi-k2-0905-preview'
  },
  {
    id: 'kimi-thinking',
    name: 'Kimi Thinking',
    type: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
    apiKey: '',
    model: 'kimi-thinking-preview'
  },
  {
    id: 'gemini-flash',
    name: 'Google Gemini 2.5 Flash',
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    apiKey: '',
    model: 'gemini-2.5-flash'
  }
]

// 默认AI配置参数（通用Provider）
export const DEFAULT_CONFIG: AIConfig = {
  currentProviderId: DEFAULT_PROVIDERS[0].id, // 自动选择第一个可用配置
  providers: DEFAULT_PROVIDERS,
  historyLimit: 40,
  systemPrompt: '你是AI写作助手，帮助用户完成小说写作。'
}

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
    onAnswerUpdate: (answer: string) => void
  ): Promise<{ reasoning_content?: string; content: string }>
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
  config: AIConfig,
  abortSignal: AbortSignal,
  onThinkingUpdate: (thinking: string) => void,
  onAnswerUpdate: (answer: string) => void
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
    onAnswerUpdate
  )
} 