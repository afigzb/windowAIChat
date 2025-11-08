/**
 * Agents 系统入口 - 线性流程版本
 * 
 * 模块化架构：
 * - types.ts: 统一类型定义
 * - core/: 核心数据结构和引擎
 * - preprocessor/: 预处理模块（文件和上下文处理）
 * - message-builder/: 消息构建模块
 * - services/: 服务层（AI调用）
 * - utils/: 工具函数
 */

// 类型导出
  
export type {
  // 核心消息类型
  Message,
  MessageType,
  MessageRole,
  MessageMetadata,
  ApiMessage,
  
  // Agent 上下文
  AgentContext,
  CreateContextInput,
  ExecutionStage,
  
  // 配置类型
  ProcessorConfig,
  PreprocessorConfig,
  AgentEngineConfig,
  AgentPipelineConfig,
  AICallOptions,
  
  // 输入输出类型
  AgentEngineInput,
  AgentEngineResult,
  PreprocessingResponse,
  ProcessResult,
  PromptCard,
  MessageBuilderInput,
  MessageBuilderOutput,
  
  // 消息操作类型
  MessageSelector,
  
  // 缓存类型
  ContextSummaryCacheEntry,
  SummaryCacheResult
} from './types'

// 功能导出
  
// 核心引擎
export { runAgentEngine } from './core/agent-engine'

// 预处理器
export {
  preprocess,
  processFile,
  processContextRange,
  fileSummaryCacheManager
} from './preprocessor'

// 核心数据结构（Agent Context）
export {
  createContext,
  updateStage,
  stripMetadata,
} from './core/agent-context'

// 消息操作
export {
  selectMessages,
  selectFileMessages,
  selectContextMessages,
  selectForSending,
  replaceContent,
  replaceWithType,
  replaceRange,
  createMessage
} from './core/message-ops'

// 消息构建器
export { buildMessages } from './message-builder/message-builder'

// 核心服务
export { AIService, createAIService } from './services/ai-service'

// 通用工具函数
export {
  generateId,
  generateWorkspaceId,
  truncateText
} from './utils/utils'

// HMR 支持
if (import.meta.hot) {
  import.meta.hot.accept()
}
