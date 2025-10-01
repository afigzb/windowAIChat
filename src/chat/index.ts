// ===== 统一门面导出 =====
// 确保外部只需从 '../chat' 导入，不直接访问子路径

// 导出类型定义
export type * from './types'

// 导出核心API配置和调用
export * from './core/api'
export * from './core/defaults'

// 导出对话管理器
export * from './core/conversation-manager'
export * from './core/conversation-history'
export * from './core/branch-manager'

// 导出树形数据工具（供高级用户使用）
export * from './core/tree-utils'

// 导出上下文引擎（统一的消息操作层）
export { 
  contextEngine, 
  ContextEngine,
  systemPrompt, 
  setSystemPrompt, 
  clearSystemPrompt, 
  addSystemPromptTransformer 
} from './core/context'
export type { 
  ContextMetadata, 
  RequestMessage, 
  TempContextPlacement,
  SystemPromptTransformer
} from './core/context'

// 导出UI组件（主要外部接口）
export { ChatPanel } from './ui/ChatPanel'
export * from './ui/components'

// 导出Markdown渲染器（跨模块引用）
export { MarkdownRenderer } from '../md-html-dock/renderers/MarkdownRenderer'