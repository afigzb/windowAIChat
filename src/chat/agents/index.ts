/**
 * Agent 系统入口
 * 
 * 导出：
 * - Agent Engine 实例
 * - 类型定义
 * - 任务处理器
 */

// 导出类型
export type {
  AgentTaskType,
  AgentTaskConfig,
  AgentTaskContext,
  AgentTaskResult,
  AgentTaskProcessor,
  AgentEngineConfig
} from './types'

// 导出 Agent Engine
export { AgentEngine, agentEngine } from './agent-engine'

// 导入并注册所有任务处理器
import { optimizeInputTask } from './tasks/optimize-input'
import { agentEngine } from './agent-engine'

// 注册任务处理器
agentEngine.registerProcessor(optimizeInputTask)

// 导出任务处理器（供外部使用）
export { optimizeInputTask }

