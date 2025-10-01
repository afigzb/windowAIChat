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
  addSystemPromptTransformer 
} from './system-prompt'
export type { SystemPromptTransformer } from './system-prompt'

// 导出消息编辑器（核心新功能）
export { MessageEditor } from './message-editor'

// 导出消息操作符
export {
  injectSystemPrompt,
  appendSystemPrompt,
  addTemporaryContext,
  limitHistory,
  addFileContext,
  addSummaryContext,
  ensureSystemMessage,
  removeEmptyMessages,
  mergeConsecutiveSameRole,
  applyStandardPipeline,
  compose,
  when
} from './message-operators'
export type { MessageOperator } from './message-operators'

// 导出概括功能
export { buildSummarizePlan } from './summarizer'
export type { SummarizePlan, SummaryPlan } from './summarizer'

