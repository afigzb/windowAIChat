/**
 * Agent Pipeline 系统类型定义
 * 
 * 核心设计理念：
 * - 每个任务（Task）是独立且完整的执行单元
 * - 工作流（Workflow）通过代码显式编排任务执行顺序和数据传递
 * - Pipeline 只负责执行工作流，不负责自动数据传递
 */

import type { AIConfig } from '../types'
import type { FlatMessage } from '../types'

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

/**
 * 任务执行上下文
 */
export interface AgentContext {
  userInput: string
  attachedFiles?: string[]
  conversationHistory?: FlatMessage[]
  aiConfig: AIConfig
  
  // 存储所有任务结果，供后续任务查询使用
  taskResults: Map<string, AgentTaskResult>
  
  // 自定义数据存储
  data: Map<string, any>
}

/**
 * 进度更新数据
 */
export interface AgentProgressUpdate {
  type: 'task_start' | 'task_complete' | 'message'
  message?: string
  currentTask?: {
    name: string
    type: AgentTaskType
  }
  completedResults?: AgentTaskResult[]
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

/**
 * 任务接口 - 所有任务必须实现
 */
export interface AgentTask {
  type: AgentTaskType
  name: string
  description?: string
  
  /**
   * 执行任务
   * @param params 执行参数
   * @returns 任务执行结果
   */
  execute(params: AgentTaskExecuteParams): Promise<AgentTaskResult>
}

/**
 * 工作流函数类型
 * 通过代码显式编排任务的执行顺序和数据传递
 */
export type AgentWorkflow = (
  context: AgentContext,
  abortSignal?: AbortSignal,
  onProgress?: (update: string | AgentProgressUpdate) => void
) => Promise<AgentTaskResult[]>

/**
 * Pipeline 配置（简化版）
 */
export interface AgentPipelineConfig {
  enabled: boolean
  workflowName?: string  // 使用哪个工作流（可以有多个预定义工作流）
  options?: Record<string, any>
}
