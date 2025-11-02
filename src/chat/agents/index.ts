/**
 * Agents 系统入口 - AI写作专用版本（重构版）
 * 
 * 模块化架构：
 * - core/: 核心数据结构和引擎
 * - preprocessor/: 预处理模块（文件和上下文处理）
 * - message-builder/: 消息构建模块
 * - services/: 服务层（AI调用）
 * - utils/: 工具函数
 */

// ============================================================
// 核心引擎
// ============================================================

export {
  runAgentEngine,
  type AgentEngineConfig,
  type AgentEngineInput,
  type AgentEngineResult
} from './core/agent-engine'

// ============================================================
// 预处理器
// ============================================================

export {
  preprocess,
  processFile,
  processContextRange,
  fileSummaryCacheManager,
  type PreprocessorConfig,
  type PreprocessingResponse
} from './preprocessor'

// ============================================================
// 核心数据结构
// ============================================================

export type {
  // 消息类型
  Message,
  MessageMetadata,
  MessageType,
  
  // WorkspaceData
  WorkspaceData,
  Document,
  ExecutionStage,
  DataReference,
  DataPath
} from './core/workspace-data'

export {
  createWorkspace,
  readData,
  writeData,
  addDocument,
  updateStage,
  stripMetadata,
  formatWorkspaceForDebug
} from './core/workspace-data'

// ============================================================
// 消息操作
// ============================================================

export {
  selectMessages,
  selectFileMessages,
  selectContextMessages,
  selectNonPromptMessages,
  selectForSending,
  replaceContent,
  replaceWithType,
  replaceRange,
  appendMessage,
  insertMessage,
  createMessage,
  findMessageIndex,
  findMessageRange,
  countMessageTypes,
  type MessageSelector
} from './core/message-ops'

// ============================================================
// 消息构建器
// ============================================================

export {
  buildMessages,
  type MessageBuilderInput,
  type MessageBuilderOutput
} from './message-builder/message-builder'

// ============================================================
// 核心服务
// ============================================================

export { 
  AIService, 
  createAIService, 
  type AICallOptions 
} from './services/ai-service'

// ============================================================
// Agent Pipeline 配置（向后兼容）
// ============================================================

/**
 * Agent Pipeline 配置
 */
export type AgentPipelineConfig = {
  /** 是否启用 Agent 系统 */
  enabled: boolean
  
  /** 最大任务数（Planning阶段生成的任务数限制） */
  maxSteps?: number
  
  /** 自定义系统提示词 */
  customSystemPrompt?: string
  
  /** 执行策略 */
  executionStrategy?: 'sequential' | 'parallel'
  
  /** 预处理模型配置 */
  preprocessor?: {
    /** 文件概括配置 */
    fileProcessor?: {
      /** 使用的模型ID（未设置则使用主模型） */
      providerId?: string
      /** 自定义提示词（未设置则使用默认） */
      systemPrompt?: string
    }
    
    /** 上下文概括配置 */
    contextProcessor?: {
      /** 使用的模型ID（未设置则使用主模型） */
      providerId?: string
      /** 自定义提示词（未设置则使用默认） */
      systemPrompt?: string
    }
  }
}

// ============================================================
// 通用工具函数
// ============================================================

export {
  generateId,
  generateTaskId,
  generatePlanId,
  generateWorkspaceId,
  generateDocumentId,
  generateLogId,
  estimateTokens,
  parseJSONResponse,
  tryParseJSON,
  truncateText,
  unwrapCodeBlock,
  formatDuration,
  formatTimestamp,
  getNestedProperty
} from './utils/utils'

// ============================================================
// 初始化和调试信息
// ============================================================

if (import.meta.env.DEV) {
  console.log('[Agents] AI写作引擎初始化完成（重构版）')
  console.log('  📁 模块化架构:')
  console.log('    - core/: 核心引擎和数据结构')
  console.log('    - preprocessor/: 文件和上下文预处理')
  console.log('    - message-builder/: 消息构建')
  console.log('    - services/: AI服务层')
  console.log('    - utils/: 工具函数')
  console.log('')
  console.log('  🔍 Preprocessing: 预处理用户输入和文件')
  console.log('  ✨ Generating: 直接生成回答')
}

// ============================================================
// HMR 支持
// ============================================================

if (import.meta.hot) {
  import.meta.hot.accept()
}
