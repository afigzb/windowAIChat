/**
 * Agent Pipeline 系统入口
 */

// 导出核心类型
export type {
  AgentTaskType,
  AgentTaskResult,
  AgentTaskConfig,
  AgentContext,
  AgentTaskExecuteParams,
  AgentTask,
  AgentWorkflow,
  AgentPipelineConfig,
  AgentProgressUpdate,
} from './types'

export { AgentTaskStatus } from './types'

// 导出 Pipeline
export { 
  AgentPipeline, 
  agentPipeline, 
  type PipelineResult,
  type PipelineInput
} from './pipeline'

// 导出默认配置
export { 
  DEFAULT_AGENT_CONFIG,
  DEFAULT_SHOULD_OPTIMIZE_CONFIG,
  DEFAULT_OPTIMIZE_INPUT_CONFIG,
  DEFAULT_SHOULD_OPTIMIZE_SYSTEM_PROMPT,
  DEFAULT_OPTIMIZE_SYSTEM_PROMPT
} from './defaults'

// 导出工作流
export { 
  defaultOptimizeWorkflow
} from './workflows'

// 导出集成层
export { 
  executeAgentPipeline,
  shouldExecuteAgentPipeline,
  formatPipelineResultForUI,
  type ExecutePipelineParams,
  type PipelineExecutionResult
} from './integration'

// 导出简单 API
export { callSimpleAPI, type SimpleMessage } from './simple-api'

// 导出任务
export { shouldOptimizeTask, ShouldOptimizeTask } from './steps/should-optimize-step'
export { optimizeInputTask, OptimizeInputTask } from './steps/optimize-input-step'

// 注册默认工作流
import { agentPipeline } from './pipeline'
import { defaultOptimizeWorkflow } from './workflows'

agentPipeline.registerWorkflow('default-optimize', defaultOptimizeWorkflow)

// HMR 支持
if (import.meta.hot) {
  import.meta.hot.accept()
}

