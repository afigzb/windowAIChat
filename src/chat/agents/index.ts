/**
 * Agent Pipeline 系统入口
 * 
 * 负责：
 * - 导出核心类型和接口
 * - 初始化工具注册表
 * - 导出全局实例
 */

// ============================================================
// 导出核心类型
// ============================================================

export type {
  AgentTaskType,
  AgentTaskResult,
  AgentTaskConfig,
  AgentContext,
  AgentTaskExecuteParams,
  AgentPipelineConfig,
  AgentProgressUpdate,
  PlannerState,
  PlanningStep
} from './types'

export { AgentTaskStatus } from './types'

// ============================================================
// 导出 Pipeline 和工具注册表
// ============================================================

export { 
  AgentPipeline, 
  agentPipeline, 
  type PipelineResult,
  type PipelineInput
} from './pipeline'

// 旧架构的 ToolRegistry, defaults, workflows 已移除
// 系统现在完全基于配置驱动，请使用 DEFAULT_WORKFLOW_CONFIG

// ============================================================
// 导出集成层
// ============================================================

export { 
  executeAgentPipeline,
  shouldExecuteAgentPipeline,
  formatPipelineResultForUI,
  type ExecutePipelineParams,
  type PipelineExecutionResult
} from './integration'

// ============================================================
// 导出简单 API
// ============================================================

export { callSimpleAPI, type SimpleMessage } from './simple-api'

// ============================================================
// 导出配置驱动系统（新架构）
// ============================================================

export {
  type ToolTemplate,
  type ToolConfig,
  type JudgmentToolConfig,
  type SimpleLLMToolConfig,
  type MainGenerationToolConfig,
  type WorkflowConfig,
  DEFAULT_WORKFLOW_CONFIG
} from './tool-config'

export { executeToolByConfig } from './config-executor'

// ============================================================
// 导出任务步骤基础工具（用于自定义工具）
// ============================================================

export * from './steps'

// ============================================================
// 初始化和调试信息
// ============================================================

// 打印配置驱动的工作流（开发模式）
if (import.meta.env.DEV) {
  console.log('[Agent] 配置驱动工作流初始化完成')
  import('./tool-config').then(({ DEFAULT_WORKFLOW_CONFIG }) => {
    console.log(`  工作流: ${DEFAULT_WORKFLOW_CONFIG.name}`)
    console.log(`  描述: ${DEFAULT_WORKFLOW_CONFIG.description}`)
    console.log(`  工具数: ${DEFAULT_WORKFLOW_CONFIG.tools.length}`)
    console.log('  工具列表:')
    DEFAULT_WORKFLOW_CONFIG.tools.forEach((tool, i) => {
      console.log(`    ${i + 1}. ${tool.name} (${tool.template})`)
    })
  })
}

// ============================================================
// HMR 支持
// ============================================================

if (import.meta.hot) {
  import.meta.hot.accept()
}
