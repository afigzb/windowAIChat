import type { AIConfig, ApiProviderConfig } from '../types'
import { DEFAULT_AGENT_CONFIG } from '../agents'
import geminiProPreset from './examples/gemini.provider.json'

// 默认API提供方配置
export const DEFAULT_PROVIDERS: ApiProviderConfig[] = [
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    type: 'openai',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: '',
    model: 'deepseek-reasoner',
    maxTokens: 64000,
  },
  {
    id: 'gemini-flash',
    name: 'Google Gemini 2.5 Flash',
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    apiKey: '',
    model: 'gemini-2.5-flash',
    maxTokens: 65536
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Google Gemini 2.5 Pro',
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
    apiKey: '',
    model: 'gemini-2.5-pro',
    maxTokens: 65536
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

// 默认概括提示词
export const DEFAULT_SUMMARIZE_PROMPT = `你是一名专业的中文文本概括助手。
目标：将提供的对话与文件内容进行高质量、结构化的总结。
要求：
- 保留关键信息、结论与决策，删除冗余与重复。
- 用分点或小节组织结果，语言简洁清晰。
- 不臆测缺失信息，必要时标注"信息不足"。`

// 默认AI配置参数（通用Provider）
export const DEFAULT_CONFIG: AIConfig = {
  currentProviderId: DEFAULT_PROVIDERS[0].id,
  providers: DEFAULT_PROVIDERS,
  historyLimit: 40,
  systemPrompt: '', // 系统提示现在由提示词卡片系统管理
  summarizePrompt: DEFAULT_SUMMARIZE_PROMPT,
  enableCompression: false,  // 默认关闭压缩
  fileContentPlacement: 'append',  // 默认将文件内容追加到用户消息尾部
  fileContentPriority: 10,  // 文件内容默认优先级
  fileContentMode: 'separate',  // 默认独立模式
  agentConfig: DEFAULT_AGENT_CONFIG  // Agent Pipeline 配置
}


