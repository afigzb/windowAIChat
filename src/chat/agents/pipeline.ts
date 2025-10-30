/**
 * Agent Pipeline - 动态工具执行引擎
 * 
 * 核心职责：
 * - 动态执行工具序列
 * - 管理执行上下文
 * - 自动处理数据传递
 * - 支持中断和进度回调
 * 
 * 设计理念：
 * - 当前阶段：用动态方式执行静态流程（写死工具列表）
 * - 未来扩展：支持 LLM 规划的动态流程
 */

import type {
  AgentContext,
  AgentTaskResult,
  AgentTaskConfig,
  AgentProgressUpdate
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
  goal?: string  // 用户目标（如果和 userInput 不同）
  attachedFiles?: string[]
  conversationHistory?: FlatMessage[]
  aiConfig: AIConfig
}


/**
 * Agent Pipeline 类
 */
export class AgentPipeline {

  /**
   * 执行默认的文章生成流程
   * 使用配置驱动的方式（新架构）
   */
  async executeDefaultWorkflow(
    input: PipelineInput,
    abortSignal?: AbortSignal,
    onProgress?: (update: string | AgentProgressUpdate) => void
  ): Promise<PipelineResult> {
    return this.executeWorkflowByConfig(input, abortSignal, onProgress)
  }

  /**
   * 根据配置执行工作流（新架构）
   * 
   * @param input 输入数据
   * @param workflowConfig 工作流配置（可选，使用默认配置）
   * @param abortSignal 中断信号
   * @param onProgress 进度回调
   */
  async executeWorkflowByConfig(
    input: PipelineInput,
    abortSignal?: AbortSignal,
    onProgress?: (update: string | AgentProgressUpdate) => void,
    workflowConfig?: import('./tool-config').WorkflowConfig
  ): Promise<PipelineResult> {
    const startTime = Date.now()

    // 使用默认配置（如果未提供）
    if (!workflowConfig) {
      const { DEFAULT_WORKFLOW_CONFIG } = await import('./tool-config')
      workflowConfig = DEFAULT_WORKFLOW_CONFIG
    }

    console.log(`[Pipeline] 执行工作流: ${workflowConfig.name}`)

    // 创建执行上下文
    const context: AgentContext = {
      userInput: input.userInput,
      goal: input.goal || input.userInput,
      attachedFiles: input.attachedFiles ? [...input.attachedFiles] : undefined,
      conversationHistory: input.conversationHistory,
      aiConfig: input.aiConfig,
      taskResults: new Map(),
      data: new Map()
    }

    const taskResults: AgentTaskResult[] = []

    try {
      // 导入配置执行器
      const { executeToolByConfig } = await import('./config-executor')

      // 遍历工具配置
      for (const toolConfig of workflowConfig.tools) {
        // 检查中断
        if (abortSignal?.aborted) {
          console.log('[Pipeline] 执行被中断')
          break
        }

        // 检查执行条件
        if (toolConfig.condition && !toolConfig.condition(context)) {
          console.log(`[Pipeline] 跳过工具: ${toolConfig.name}（条件不满足）`)
          continue
        }

        // 通知任务开始
        if (onProgress) {
          onProgress({
            type: 'task_start',
            currentTask: {
              name: toolConfig.name,
              type: toolConfig.id as any
            },
            completedResults: [...taskResults]
          })
        }

        console.log(`[Pipeline] 开始执行: ${toolConfig.name}`)

        // 执行工具（使用配置驱动的执行器）
        const result = await executeToolByConfig(
          toolConfig,
          context.goal || context.userInput,  // 输入
          context,
          abortSignal,
          this.wrapProgressCallback(onProgress, {
            type: toolConfig.id as any,
            name: toolConfig.name,
            enabled: true
          }, taskResults)
        )

        // 存储结果
        taskResults.push(result)
        context.taskResults.set(result.id, result)

        // 通知任务完成
        if (onProgress) {
          onProgress({
            type: 'task_complete',
            completedResults: [...taskResults]
          })
        }

        console.log(`[Pipeline] 完成: ${toolConfig.name} - ${result.status}`)
      }

      const totalTime = Date.now() - startTime
      const success = taskResults.every(r => r.status !== 'failed')

      return {
        success,
        taskResults,
        context,
        totalTime
      }

    } catch (error: any) {
      console.error('[Pipeline] 执行异常:', error)
      
      return {
        success: false,
        taskResults,
        context,
        totalTime: Date.now() - startTime
      }
    }
  }

  /**
   * 包装进度回调
   */
  private wrapProgressCallback(
    onProgress: ((update: string | AgentProgressUpdate) => void) | undefined,
    config: AgentTaskConfig,
    completedResults: AgentTaskResult[]
  ): ((content: string | AgentProgressUpdate) => void) | undefined {
    if (!onProgress) return undefined
    
    return (content: string | AgentProgressUpdate) => {
      if (typeof content === 'string') {
        onProgress({
          type: 'message',
          message: content,
          currentTask: {
            name: config.name,
            type: config.type
          },
          completedResults: [...completedResults]
        })
      } else {
        onProgress(content)
      }
    }
  }

}

/**
 * 全局 Pipeline 实例
 */
export const agentPipeline = new AgentPipeline()
