/**
 * Agent Pipeline - 工作流执行引擎
 * 
 * 核心职责：
 * - 执行工作流函数
 * - 管理执行上下文
 * - 收集任务结果
 * 
 * 不负责：
 * - 自动数据传递（由工作流代码显式处理）
 * - 任务编排逻辑（由工作流函数实现）
 */

import type {
  AgentContext,
  AgentWorkflow,
  AgentTaskResult
} from './types'
import type { AIConfig, FlatMessage } from '../types'

/**
 * Pipeline 执行结果
 */
export interface PipelineResult {
  success: boolean
  taskResults: AgentTaskResult[]
  context: AgentContext
  totalTime: number
}

/**
 * Pipeline 执行输入
 */
export interface PipelineInput {
  userInput: string
  attachedFiles?: string[]
  conversationHistory?: FlatMessage[]
  aiConfig: AIConfig
}

/**
 * Agent Pipeline 类
 */
export class AgentPipeline {
  private workflows = new Map<string, AgentWorkflow>()

  /**
   * 注册工作流
   */
  registerWorkflow(name: string, workflow: AgentWorkflow): void {
    if (this.workflows.has(name) && import.meta.env.PROD) {
      console.warn(`[Pipeline] 工作流 ${name} 已存在，将被覆盖`)
    }
    this.workflows.set(name, workflow)
  }

  /**
   * 获取工作流
   */
  getWorkflow(name: string): AgentWorkflow | undefined {
    return this.workflows.get(name)
  }

  /**
   * 执行工作流
   */
  async execute(
    input: PipelineInput,
    workflow: AgentWorkflow,
    abortSignal?: AbortSignal,
    onProgress?: (update: string | import('./types').AgentProgressUpdate) => void
  ): Promise<PipelineResult> {
    const startTime = Date.now()

    // 创建执行上下文
    // 注意：使用数组浅拷贝，避免工作流修改原始输入
    const context: AgentContext = {
      userInput: input.userInput,
      attachedFiles: input.attachedFiles ? [...input.attachedFiles] : undefined,
      conversationHistory: input.conversationHistory,
      aiConfig: input.aiConfig,
      taskResults: new Map(),
      data: new Map()
    }

    try {
      // 执行工作流，由工作流函数负责任务编排
      const taskResults = await workflow(context, abortSignal, onProgress)

      // 将结果存入上下文（方便查询）
      taskResults.forEach(result => {
        context.taskResults.set(result.id, result)
      })

      const totalTime = Date.now() - startTime
      const success = taskResults.every(r => r.status !== 'failed')

      return {
        success,
        taskResults,
        context,
        totalTime
      }

    } catch (error: any) {
      console.error('[Pipeline] 工作流执行异常:', error)
      
      return {
        success: false,
        taskResults: [],
        context,
        totalTime: Date.now() - startTime
      }
    }
  }

  /**
   * 通过名称执行已注册的工作流
   */
  async executeByName(
    input: PipelineInput,
    workflowName: string,
    abortSignal?: AbortSignal,
    onProgress?: (update: string | import('./types').AgentProgressUpdate) => void
  ): Promise<PipelineResult> {
    const workflow = this.workflows.get(workflowName)
    
    if (!workflow) {
      throw new Error(`工作流 ${workflowName} 未注册`)
    }

    return this.execute(input, workflow, abortSignal, onProgress)
  }

  /**
   * 列出所有已注册的工作流
   */
  listWorkflows(): string[] {
    return Array.from(this.workflows.keys())
  }
}

/**
 * 全局 Pipeline 实例
 */
export const agentPipeline = new AgentPipeline()

