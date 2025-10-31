/**
 * Agents 系统入口（重构版）
 * 
 * 核心理念：
 * 1. 原始数据仓库：集中管理所有外部输入
 * 2. 任务 = 输入 + 工具 + 输出
 * 3. 工作流 = 任务序列 + 条件控制
 * 4. 初期写死工作流，未来支持 AI 生成
 */

// ============================================================
// 核心类型导出
// ============================================================

export type {
  // 原始数据
  RawData,
  DataSource,
  CompositeDataSource,
  OutputTarget,
  
  // 工具
  ToolType,
  Tool,
  ToolContext,
  ToolResult,
  JudgmentToolConfig,
  JudgmentParser,
  JudgmentResult,
  TransformToolConfig,
  OutputParser,
  GenerationToolConfig,
  GenerationResult,
  
  // 任务
  TaskConfig,
  TaskResult,
  TaskCondition,
  
  // 工作流
  WorkflowConfig,
  WorkflowContext,
  WorkflowResult,
  WorkflowInput,
  ProgressUpdate
} from './types'

// ============================================================
// 原始数据仓库
// ============================================================

export {
  createRawData,
  readDataSource,
  readCompositeDataSource,
  readInput,
  writeOutput,
  cloneRawData
} from './raw-data'

// ============================================================
// 工具系统
// ============================================================

export {
  JudgmentTool,
  TransformTool,
  GenerationTool,
  createJudgmentTool,
  createTransformTool,
  createGenerationTool,
  createTool
} from './tools'

// ============================================================
// 任务和工作流
// ============================================================

export { executeTask } from './task-executor'
export { executeWorkflow, runWorkflow } from './workflow'

// ============================================================
// 工作流配置
// ============================================================

export { DEFAULT_WORKFLOW, SIMPLE_WORKFLOW } from './workflows'

// ============================================================
// 集成层（与现有系统兼容）
// ============================================================

export {
  executeAgentPipeline,
  shouldExecuteAgentPipeline,
  formatWorkflowResultForUI,
  formatPipelineResultForUI,
  type ExecutePipelineParams,
  type PipelineExecutionResult
} from './integration'

// ============================================================
// 动态Agent系统
// ============================================================

export {
  executeDynamicAgent,
  formatAgentResultForUI,
  type DynamicAgentConfig,
  type DynamicAgentResult,
  type AgentStep,
  type AgentStepType
} from './dynamic-agent'

export {
  toolRegistry,
  type ToolDefinition,
  type ToolParameter,
  type ToolExecutionContext,
  type ToolExecutionResult
} from './tool-registry'

// ============================================================
// 简单 API（保留向后兼容）
// ============================================================

export { callSimpleAPI, type SimpleMessage } from './simple-api'

// ============================================================
// 旧的类型（向后兼容，标记为 deprecated）
// ============================================================

/**
 * @deprecated 使用新的 WorkflowResult 代替
 */
export type PipelineResult = import('./types').WorkflowResult

/**
 * @deprecated 使用新的 WorkflowInput 代替
 */
export type PipelineInput = import('./types').WorkflowInput

/**
 * @deprecated 使用新的 TaskResult 代替
 */
export type AgentTaskResult = import('./types').TaskResult

/**
 * Agent Pipeline 配置
 */
export type AgentPipelineConfig = {
  /** 是否启用 Agent 系统 */
  enabled: boolean
  
  /** 执行模式：static-静态工作流，dynamic-动态Agent */
  mode?: 'static' | 'dynamic'
  
  /** 静态工作流名称（mode=static时使用） */
  workflowName?: string
  
  /** 动态Agent最大步数（mode=dynamic时使用，默认10） */
  maxSteps?: number
  
  /** 自定义系统提示词（mode=dynamic时使用） */
  customSystemPrompt?: string
}

// ============================================================
// 初始化和调试信息
// ============================================================

if (import.meta.env.DEV) {
  import('./workflows').then(({ DEFAULT_WORKFLOW }) => {
    console.log('[Agents] 系统初始化完成（重构版）')
    console.log(`  工作流: ${DEFAULT_WORKFLOW.name}`)
    console.log(`  描述: ${DEFAULT_WORKFLOW.description}`)
    console.log(`  任务数: ${DEFAULT_WORKFLOW.tasks.length}`)
    console.log('  任务列表:')
    DEFAULT_WORKFLOW.tasks.forEach((task, i) => {
      console.log(`    ${i + 1}. ${task.name} (${task.tool.type})`)
    })
  })
}

// ============================================================
// HMR 支持
// ============================================================

if (import.meta.hot) {
  import.meta.hot.accept()
}
