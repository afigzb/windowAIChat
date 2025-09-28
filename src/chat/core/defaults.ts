import type { AIConfig, ApiProviderConfig } from '../types'
import geminiProPreset from './examples/gemini.provider.json'

// 默认API提供方配置
export const DEFAULT_PROVIDERS: ApiProviderConfig[] = [
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    type: 'openai',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: '',
    model: 'deepseek-reasoner'
  },
  {
    id: 'gemini-flash',
    name: 'Google Gemini 2.5 Flash',
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    apiKey: '',
    model: 'gemini-2.5-flash'
  },
  geminiProPreset as ApiProviderConfig,
  {
    id: 'kimi-thinking',
    name: 'Kimi Thinking',
    type: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
    apiKey: '',
    model: 'kimi-thinking-preview'
  },
]

// 默认AI配置参数（通用Provider）
export const DEFAULT_CONFIG: AIConfig = {
  currentProviderId: DEFAULT_PROVIDERS[0].id,
  providers: DEFAULT_PROVIDERS,
  historyLimit: 40,
  systemPrompt: '你是AI写作助手，帮助用户完成小说写作。'
}


