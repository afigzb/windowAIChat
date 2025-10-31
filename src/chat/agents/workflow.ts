/**
 * 工作流引擎
 * 
 * 负责按顺序执行工作流中的所有任务
 */

import type {
  WorkflowConfig,
  WorkflowInput,
  WorkflowResult,
  WorkflowContext,
  GenerationResult
} from './types'
import { createRawData } from './raw-data'
import { executeTask } from './task-executor'

/**
 * 执行工作流
 */
export async function executeWorkflow(
  config: WorkflowConfig,
  input: WorkflowInput,
  abortSignal?: AbortSignal,
  onProgress?: (update: import('./types').ProgressUpdate) => void
): Promise<WorkflowResult> {
  const startTime = Date.now()
  
  console.log(`[Workflow] 开始执行工作流: ${config.name}`)
  console.log(`[Workflow] 任务数: ${config.tasks.length}`)
  
  // 创建原始数据仓库
  const rawData = createRawData(
    input.userInput,
    input.attachedFiles,
    input.conversationHistory
  )
  
  // 创建工作流上下文
  const context: WorkflowContext = {
    rawData,
    aiConfig: input.aiConfig,
    taskResults: new Map(),
    abortSignal,
    onProgress
  }
  
  const taskResults: import('./types').TaskResult[] = []
  let generationResult: GenerationResult | undefined
  
  try {
    // 按顺序执行所有任务
    for (const task of config.tasks) {
      // 检查是否中止
      if (abortSignal?.aborted) {
        console.log('[Workflow] 工作流已中止')
        break
      }
      
      // 执行任务
      const result = await executeTask(task, context)
      
      // 保存结果
      taskResults.push(result)
      context.taskResults.set(task.id, result)
      
      // 如果是主生成任务，保存生成结果
      if (task.tool.type === 'generation' && result.status === 'completed') {
        generationResult = result.output as GenerationResult
        console.log('[Workflow] 主生成任务完成，停止执行后续任务')
        break
      }
      
      // 如果任务失败，根据配置决定是否继续
      if (result.status === 'failed') {
        console.warn(`[Workflow] 任务失败: ${task.name}，继续执行后续任务`)
        // 可以添加配置来决定是否在任务失败时中止整个工作流
      }
    }
    
    const totalDuration = Date.now() - startTime
    const success = taskResults.every(r => r.status !== 'failed')
    
    console.log(`[Workflow] 工作流完成`, {
      name: config.name,
      success,
      completedTasks: taskResults.filter(r => r.status === 'completed').length,
      failedTasks: taskResults.filter(r => r.status === 'failed').length,
      skippedTasks: taskResults.filter(r => r.status === 'skipped').length,
      totalDuration: `${totalDuration}ms`
    })
    
    return {
      success,
      rawData,
      taskResults,
      totalDuration,
      generationResult
    }
    
  } catch (error: any) {
    console.error('[Workflow] 工作流异常:', error)
    
    const totalDuration = Date.now() - startTime
    
    return {
      success: false,
      rawData,
      taskResults,
      totalDuration,
      generationResult
    }
  }
}

/**
 * 创建简单的工作流执行器
 * 
 * 这是一个便捷函数，用于快速执行工作流
 */
export async function runWorkflow(
  config: WorkflowConfig,
  userInput: string,
  aiConfig: import('../types').AIConfig,
  options?: {
    attachedFiles?: string[]
    conversationHistory?: import('../types').FlatMessage[]
    abortSignal?: AbortSignal
    onProgress?: (update: import('./types').ProgressUpdate) => void
  }
): Promise<WorkflowResult> {
  return executeWorkflow(
    config,
    {
      userInput,
      attachedFiles: options?.attachedFiles,
      conversationHistory: options?.conversationHistory,
      aiConfig
    },
    options?.abortSignal,
    options?.onProgress
  )
}

