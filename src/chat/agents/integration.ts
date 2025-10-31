/**
 * Agents 系统与对话管理器的集成层
 * 
 * 提供与现有系统的兼容接口
 */

import type {
  FlatMessage,
  AIConfig,
  MessageComponents,
  AgentTaskResultForUI
} from '../types'
import type {
  WorkflowResult,
  TaskResult,
  ProgressUpdate
} from './types'
import { executeWorkflow } from './workflow'
import { DEFAULT_WORKFLOW } from './workflows'

// ============================================================
// 执行参数和结果类型
// ============================================================

export interface ExecutePipelineParams {
  userMessage: FlatMessage
  conversationHistory: FlatMessage[]
  config: AIConfig
  abortSignal?: AbortSignal
  onProgress?: (content: string | ProgressUpdate) => void
  overrideAttachedFiles?: string[]
}

export interface PipelineExecutionResult {
  finalContent: string
  reasoning_content?: string
  agentComponents: MessageComponents
}

// ============================================================
// 主要集成函数
// ============================================================

/**
 * 执行 Agent Pipeline（兼容接口）
 */
export async function executeAgentPipeline(
  params: ExecutePipelineParams
): Promise<PipelineExecutionResult> {
  const {
    userMessage,
    conversationHistory,
    config,
    abortSignal,
    onProgress,
    overrideAttachedFiles
  } = params
  
  const userContent = userMessage.components?.userInput || userMessage.content
  const attachedFiles = overrideAttachedFiles ?? userMessage.components?.attachedFiles
  
  console.log('[AgentPipeline] 开始执行工作流', {
    hasOverrideFiles: !!overrideAttachedFiles,
    filesCount: attachedFiles?.length || 0
  })
  
  // 包装进度回调
  const wrappedOnProgress = onProgress ? (update: ProgressUpdate) => {
    if (typeof onProgress === 'function') {
      // 将 ProgressUpdate 转换为字符串或传递原始对象
      if (update.type === 'message' && update.message) {
        onProgress(update.message)
      } else {
        // 转换为 JSON 字符串
        const progressData = {
          type: update.type,
          message: update.message,
          currentTask: update.taskName ? {
            name: update.taskName,
            type: 'custom' as const
          } : undefined,
          completedTasks: update.completedTasks?.map(convertTaskResultForUI)
        }
        onProgress(JSON.stringify(progressData))
      }
    }
  } : undefined
  
  // 执行工作流
  const workflowResult = await executeWorkflow(
    DEFAULT_WORKFLOW,
    {
      userInput: userContent,
      attachedFiles,
      conversationHistory,
      aiConfig: config
    },
    abortSignal,
    wrappedOnProgress
  )
  
  console.log('[AgentPipeline] 执行完成:', {
    success: workflowResult.success,
    taskCount: workflowResult.taskResults.length,
    totalTime: `${workflowResult.totalDuration}ms`
  })
  
  // 提取主生成结果
  if (!workflowResult.generationResult) {
    throw new Error('主模型生成任务未完成或失败')
  }
  
  const finalContent = workflowResult.generationResult.content
  const reasoning_content = workflowResult.generationResult.reasoning
  
  // 将任务结果转换为 UI 组件格式
  const agentComponents: MessageComponents = {
    agentResults: workflowResult.taskResults.length > 0
      ? workflowResult.taskResults.map(convertTaskResultForUI)
      : undefined
  }
  
  return {
    finalContent,
    reasoning_content,
    agentComponents
  }
}

/**
 * 检查是否应该执行 Agent Pipeline
 */
export function shouldExecuteAgentPipeline(config: AIConfig): boolean {
  return !!(config.agentConfig && config.agentConfig.enabled)
}

/**
 * 格式化工作流结果为 UI 格式
 */
export function formatWorkflowResultForUI(
  workflowResult: WorkflowResult
): MessageComponents {
  return {
    agentResults: workflowResult.taskResults.length > 0
      ? workflowResult.taskResults.map(convertTaskResultForUI)
      : undefined
  }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 将 TaskResult 转换为 UI 展示格式
 */
function convertTaskResultForUI(taskResult: TaskResult): AgentTaskResultForUI {
  // 提取显示文本
  let displayResult: string | undefined
  let optimizedInput: string | undefined
  
  if (taskResult.output) {
    // 判断结果
    if (typeof taskResult.output === 'object' && 'result' in taskResult.output) {
      const judgment = taskResult.output as import('./types').JudgmentResult
      displayResult = `判断结果: ${judgment.result ? '是' : '否'}\n${judgment.reason || ''}`
    }
    // 字符串结果
    else if (typeof taskResult.output === 'string') {
      optimizedInput = taskResult.output
      displayResult = taskResult.output
    }
    // 生成结果
    else if (typeof taskResult.output === 'object' && 'content' in taskResult.output) {
      const generation = taskResult.output as import('./types').GenerationResult
      displayResult = generation.content.substring(0, 200) + (generation.content.length > 200 ? '...' : '')
    }
  }
  
  return {
    success: taskResult.status === 'completed',
    optimizedInput,
    displayResult,
    metadata: {
      taskType: 'custom',  // 兼容旧的类型
      name: taskResult.name,
      originalInput: taskResult.input,
      processingTime: taskResult.duration,
      error: taskResult.error
    }
  }
}

// ============================================================
// 向后兼容（保留旧的导出名称）
// ============================================================

/**
 * @deprecated 使用 formatWorkflowResultForUI 代替
 */
export function formatPipelineResultForUI(
  pipelineResult: WorkflowResult,
  userContent: string
): MessageComponents {
  return formatWorkflowResultForUI(pipelineResult)
}
