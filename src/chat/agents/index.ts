/**
 * Agents 系统入口 - AI写作专用版本（简化版）
 * 
 * 简化流程：Preprocessing → 直接生成
 */

// ============================================================
// 核心引擎（AI写作专用 - 简化版）
// ============================================================

export {
  runAgentEngine,
  type AgentEngineConfig,
  type AgentEngineInput,
  type AgentEngineResult
} from './agent-engine'

// ============================================================
// 预处理器
// ============================================================

export {
  preprocess,
  type PreprocessorConfig,
  type PreprocessingResponse
} from './preprocessor'

// ============================================================
// 核心数据结构（重构版）
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
} from './workspace-data'

export {
  createWorkspace,
  readData,
  writeData,
  addDocument,
  updateStage,
  stripMetadata,
  formatWorkspaceForDebug
} from './workspace-data'

// ============================================================
// 核心服务
// ============================================================

export { AIService, createAIService, type AICallOptions } from './ai-service'

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
}

// ============================================================
// 通用工具函数
// ============================================================

export {
  generateId,
  generateTaskId,
  generatePlanId,
  estimateTokens,
  parseJSONResponse,
  tryParseJSON,
  truncateText,
  formatDuration,
  formatTimestamp
} from './utils'

// ============================================================
// 初始化和调试信息
// ============================================================

if (import.meta.env.DEV) {
  console.log('[Agents] AI写作引擎初始化完成（简化版）')
  console.log('  🔍 Preprocessing: 预处理用户输入和文件')
  console.log('  ✨ Generating: 直接生成回答')
  console.log('')
  console.log('  简化流程：预处理 → 直接发送请求')
}

// ============================================================
// HMR 支持
// ============================================================

if (import.meta.hot) {
  import.meta.hot.accept()
}
