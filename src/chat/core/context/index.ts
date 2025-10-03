// ===== 统一的消息操作层 (MessageOps/ContextEngine) =====
// 将 system、历史选择、截断、临时插入、UI 可视标记统一收敛到可测试、可管控的上下文引擎

export { ContextEngine, contextEngine } from './engine'
export type { 
  ContextMetadata, 
  RequestMessage, 
  TempContextPlacement 
} from './types'

// 导出系统提示词控制器
export { 
  systemPrompt, 
  setSystemPrompt, 
  clearSystemPrompt, 
  addSystemPromptTransformer,
  isInOverrideMode 
} from './system-prompt'
export type { SystemPromptTransformer } from './system-prompt'

// 导出消息编辑器（核心新功能）
export { MessageEditor } from './message-editor'

// 导出消息操作符
export {
  // System 提示词操作符
  injectSystemPrompt,
  appendSystemPrompt,
  
  // 基础插入操作符（解耦后的位置操作）
  appendToLastUser,
  insertUserAfterSystem,
  insertAssistantAfterSystem,
  insertMessageAfterSystem,
  
  // 临时上下文操作符（业务层）
  addTemporaryContext,
  defaultTempFormatter,
  noFormatter,
  
  // 其他操作符
  limitHistory,
  addFileContext,
  addSummaryContext,
  ensureSystemMessage,
  removeEmptyMessages,
  mergeConsecutiveSameRole,
  compose,
  when,
  compressMessages
} from './message-operators'
export type { MessageOperator, TempContentFormatter } from './message-operators'

// 导出文本压缩工具
export {
  TextCompressor,
  defaultTextCompressor,
  compressText,
  DEFAULT_COMPRESSION_OPTIONS
} from './text-compressor'
export type { TextCompressionOptions } from './text-compressor'

// 导出概括功能
export { buildSummarizePlan } from './summarizer'
export type { SummarizePlan, SummaryPlan } from './summarizer'

