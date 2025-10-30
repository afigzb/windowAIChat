/**
 * Agent Pipeline 系统类型定义
 * 
 * 核心设计理念：
 * - 每个任务（Task）是独立的工具（Tool），可被动态调用
 * - Pipeline 通过工具注册表动态组织和执行任务
 * - 支持未来的规划循环（ReAct模式）
 */

import type { AIConfig } from '../types'
import type { FlatMessage } from '../types'

// ============================================================
// 任务/工具类型定义
// ============================================================

export type AgentTaskType = 
  | 'should-optimize'
  | 'optimize-input'
  | 'generate-structure'
  | 'main-generation'
  | 'retrieve-info'
  | 'analyze-intent'
  | 'custom'

export enum AgentTaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 任务执行结果 - 独立且完整
 */
export interface AgentTaskResult {
  id: string                    // 任务唯一标识
  type: AgentTaskType          // 任务类型
  name: string                  // 任务名称
  status: AgentTaskStatus      // 任务状态
  
  input: any                    // 任务接收的输入（显式传入）
  output?: any                  // 任务产生的输出（可选）
  
  startTime: number             // 开始时间戳
  endTime?: number              // 结束时间戳
  duration: number              // 执行耗时(ms)
  
  error?: string                // 错误信息
}

/**
 * 任务配置
 */
export interface AgentTaskConfig {
  type: AgentTaskType
  name: string
  enabled?: boolean        // 是否启用此任务（默认为 true）
  description?: string
  apiProviderId?: string  // 使用的 API Provider ID
  systemPrompt?: string   // 自定义系统提示词
  options?: Record<string, any>
}

// ============================================================
// 执行上下文
// ============================================================

/**
 * 任务执行上下文
 * 包含执行任务所需的所有信息
 */
export interface AgentContext {
  /** 用户的原始输入 */
  userInput: string
  
  /** 用户的高层目标（可能经过优化或提炼）*/
  goal?: string
  
  /** 附加的文件或内容 */
  attachedFiles?: string[]
  
  /** 对话历史 */
  conversationHistory?: FlatMessage[]
  
  /** AI 配置 */
  aiConfig: AIConfig
  
  /** 存储所有任务结果，供后续任务查询使用 */
  taskResults: Map<string, AgentTaskResult>
  
  /** 自定义数据存储（任务间共享数据） */
  data: Map<string, any>
}

/**
 * 进度更新数据
 */
export interface AgentProgressUpdate {
  type: 'task_start' | 'task_complete' | 'message' | 'planning'
  message?: string
  currentTask?: {
    name: string
    type: AgentTaskType
  }
  completedResults?: AgentTaskResult[]
  planningStep?: number  // 规划步骤编号（供未来使用）
}

/**
 * 任务执行参数
 */
export interface AgentTaskExecuteParams {
  input: any                    // 显式传入的输入
  context: AgentContext        // 执行上下文
  config: AgentTaskConfig      // 任务配置
  abortSignal?: AbortSignal    // 取消信号
  onProgress?: (update: string | AgentProgressUpdate) => void  // 进度回调（支持字符串或结构化数据）
}

// ============================================================
// 工具/任务接口（增强版）
// ============================================================

// AgentTask 接口已移除，系统采用配置驱动方式
// 如需要动态注册工具，请使用 ToolConfig (参见 tool-config.ts)

// ============================================================
// 规划器相关（供未来使用）
// ============================================================

/**
 * 规划器状态
 * 这些数据只在 Planning Loop 内部使用，不暴露给任务
 */
export interface PlannerState {
  /** 用户目标 */
  goal: string
  
  /** 任务执行上下文的引用 */
  context: AgentContext
  
  /** 当前步骤 */
  currentStep: number
  
  /** 最大步数限制 */
  maxSteps: number
  
  /** 规划历史：记录每一步的思考和行动 */
  history: PlanningStep[]
  
  /** 中间结果摘要（压缩后的关键信息）*/
  intermediateResults: Map<string, any>
  
  /** 是否已完成目标 */
  isComplete: boolean
  
  /** 最终答案（如果完成）*/
  finalAnswer?: string
}

/**
 * 规划步骤记录
 */
export interface PlanningStep {
  step: number
  thought: string        // LLM的思考过程
  action: string         // 选择的任务/工具名
  actionInput: any       // 任务输入
  observation: string    // 执行结果观察
  status: 'success' | 'failed'
  timestamp: number
}

// AgentWorkflow 已移除，请使用 agentPipeline.executeDefaultWorkflow()

/**
 * Pipeline 配置
 */
export interface AgentPipelineConfig {
  enabled: boolean
  mode?: 'static' | 'dynamic'  // 静态工作流 vs 动态规划
  workflowName?: string  // 静态工作流名称
  planningStrategy?: 'react' | 'plan-execute'  // 规划策略（动态模式）
  maxIterations?: number  // 最大迭代次数（动态模式）
  options?: Record<string, any>
}
