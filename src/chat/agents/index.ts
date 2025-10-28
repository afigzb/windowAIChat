/**
 * Agent Pipeline 系统入口
 */

export type {
  AgentStepType,
  AgentStepConfig,
  AgentContext,
  AgentStepResult,
  AgentStep,
  AgentPipelineConfig,
} from './types'

export { AgentPipeline, agentPipeline, type PipelineResult } from './pipeline'
export { DEFAULT_AGENT_CONFIG } from './defaults'
export { 
  executeAgentPipeline,
  shouldExecuteAgentPipeline,
  formatPipelineResultForUI,
  type ExecutePipelineParams,
  type PipelineExecutionResult
} from './integration'
export { callSimpleAPI, type SimpleMessage } from './simple-api'

import { shouldOptimizeStep } from './steps/should-optimize-step'
import { optimizeInputStep } from './steps/optimize-input-step'
import { agentPipeline } from './pipeline'

// 注册默认步骤
// HMR 兼容：使用静默注册，避免开发环境重复注册警告
agentPipeline.registerSteps([
  shouldOptimizeStep,
  optimizeInputStep,
])

// HMR 清理：在开发环境中，模块重新加载时不需要特殊处理
// pipeline 实例会自动覆盖已有的步骤
if (import.meta.hot) {
  import.meta.hot.accept()
}

export { shouldOptimizeStep } from './steps/should-optimize-step'
export { optimizeInputStep } from './steps/optimize-input-step'

