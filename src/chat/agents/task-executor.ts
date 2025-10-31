/**
 * 任务执行器
 * 
 * 负责执行单个任务：读取输入 → 调用工具 → 写入输出
 */

import type {
  TaskConfig,
  TaskResult,
  WorkflowContext,
  ToolContext
} from './types'
import { readInput, writeOutput } from './raw-data'
import { createTool } from './tools'

/**
 * 执行单个任务
 */
export async function executeTask(
  task: TaskConfig,
  context: WorkflowContext
): Promise<TaskResult> {
  const startTime = Date.now()
  
  try {
    console.log(`[Task] 开始执行任务: ${task.name} (${task.id})`)
    
    // 1. 检查是否应该执行
    if (!shouldExecuteTask(task, context)) {
      console.log(`[Task] 跳过任务: ${task.name}（条件不满足）`)
      
      return {
        id: task.id,
        name: task.name,
        status: 'skipped',
        input: null,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime
      }
    }
    
    // 2. 发送进度更新
    if (context.onProgress) {
      context.onProgress({
        type: 'task-start',
        taskId: task.id,
        taskName: task.name
      })
    }
    
    // 3. 读取输入
    const input = readInput(task.input, context.rawData)
    
    console.log(`[Task] 读取输入完成`, {
      taskId: task.id,
      inputLength: input.length
    })
    
    // 4. 创建工具
    const tool = createTool(task.tool)
    
    // 5. 构建工具上下文
    const toolContext: ToolContext = {
      rawData: context.rawData,
      aiConfig: context.aiConfig,
      abortSignal: context.abortSignal,
      onProgress: context.onProgress ? (message: string) => {
        context.onProgress!({
          type: 'message',
          message,
          taskId: task.id,
          taskName: task.name
        })
      } : undefined
    }
    
    // 6. 执行工具
    const toolResult = await tool.execute(input, toolContext)
    
    // 7. 写入输出（如果成功）
    if (toolResult.success && toolResult.output !== undefined) {
      writeOutput(task.output, toolResult.output, context.rawData)
    }
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // 8. 构建任务结果
    const taskResult: TaskResult = {
      id: task.id,
      name: task.name,
      status: toolResult.success ? 'completed' : 'failed',
      input,
      output: toolResult.output,
      error: toolResult.error,
      startTime,
      endTime,
      duration
    }
    
    console.log(`[Task] 任务完成: ${task.name}`, {
      status: taskResult.status,
      duration: `${duration}ms`
    })
    
    // 9. 发送进度更新
    if (context.onProgress) {
      context.onProgress({
        type: 'task-complete',
        taskId: task.id,
        taskName: task.name
      })
    }
    
    return taskResult
    
  } catch (error: any) {
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.error(`[Task] 任务异常: ${task.name}`, error)
    
    // 检查是否是取消错误
    if (error.name === 'AbortError' || context.abortSignal?.aborted) {
      return {
        id: task.id,
        name: task.name,
        status: 'cancelled',
        input: null,
        error: '任务已取消',
        startTime,
        endTime,
        duration
      }
    }
    
    return {
      id: task.id,
      name: task.name,
      status: 'failed',
      input: null,
      error: error.message || '任务执行异常',
      startTime,
      endTime,
      duration
    }
  }
}

/**
 * 检查是否应该执行任务
 */
function shouldExecuteTask(
  task: TaskConfig,
  context: WorkflowContext
): boolean {
  const condition = task.condition
  
  // 没有条件，默认执行
  if (!condition) {
    return true
  }
  
  switch (condition.type) {
    case 'always':
      return true
    
    case 'if-true': {
      const result = context.taskResults.get(condition.taskId)
      if (!result) {
        console.warn(`[Task] 条件任务不存在: ${condition.taskId}，默认执行`)
        return true
      }
      
      // 如果前置任务是判断任务，检查其输出
      if (result.output && typeof result.output === 'object' && 'result' in result.output) {
        return result.output.result === true
      }
      
      // 否则检查任务是否成功完成
      return result.status === 'completed'
    }
    
    case 'if-false': {
      const result = context.taskResults.get(condition.taskId)
      if (!result) {
        console.warn(`[Task] 条件任务不存在: ${condition.taskId}，默认执行`)
        return true
      }
      
      // 如果前置任务是判断任务，检查其输出
      if (result.output && typeof result.output === 'object' && 'result' in result.output) {
        return result.output.result === false
      }
      
      // 否则检查任务是否失败
      return result.status !== 'completed'
    }
    
    case 'custom': {
      return condition.check(context.taskResults)
    }
    
    default:
      return true
  }
}

