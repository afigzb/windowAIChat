/**
 * Agent 系统类型定义
 * 
 * Agent 系统用于在消息发送前对用户输入进行预处理
 * 例如：优化输入、扩展内容、添加上下文等
 */

import type { AIConfig } from '../types'

// Agent 任务类型
export type AgentTaskType = 'optimize-input' | 'expand-context' | 'custom'

// Agent 任务配置
export interface AgentTaskConfig {
  type: AgentTaskType
  enabled: boolean
  name: string
  description?: string
  // 任务专用的 API 配置（可以单独选择小模型）
  apiProviderId?: string
  // 任务特定配置
  options?: Record<string, any>
}

// Agent 任务上下文（传递给任务处理器的数据）
export interface AgentTaskContext {
  userInput: string           // 用户真实输入
  attachedFiles?: string[]    // 附加文件
  config: AIConfig            // AI 配置
}

// Agent 任务结果
export interface AgentTaskResult {
  success: boolean
  optimizedInput?: string     // 优化后的输入
  metadata?: {
    taskType: AgentTaskType
    originalInput: string     // 原始输入（用于 UI 展示）
    processingTime?: number   // 处理耗时
    error?: string           // 错误信息
  }
}

// Agent 任务处理器接口
export interface AgentTaskProcessor {
  type: AgentTaskType
  name: string
  
  /**
   * 执行任务
   * @param context 任务上下文
   * @param taskConfig 任务配置
   * @param abortSignal 中断信号
   * @param onStream 流式输出回调（可选）
   * @returns 任务结果
   */
  process(
    context: AgentTaskContext,
    taskConfig: AgentTaskConfig,
    abortSignal?: AbortSignal,
    onStream?: (content: string) => void
  ): Promise<AgentTaskResult>
}

// Agent 引擎配置
export interface AgentEngineConfig {
  enabled: boolean              // 是否启用 Agent 系统
  tasks: AgentTaskConfig[]      // 任务列表（按顺序执行）
}

