/**
 * Agent 系统与对话管理器的集成层
 */

import type { FlatMessage, AIConfig, MessageComponents, AgentTaskResultForUI } from '../types'
import { agentPipeline } from './pipeline'
import type { PipelineResult } from './pipeline'
import type { AgentTaskResult, AgentProgressUpdate } from './types'

export interface ExecutePipelineParams {
  userMessage: FlatMessage
  conversationHistory: FlatMessage[]
  config: AIConfig
  abortSignal?: AbortSignal
  onProgress?: (content: string | AgentProgressUpdate) => void
  // 可选：覆盖 userMessage 中的附加文件（用于重新生成时传入最新文件）
  overrideAttachedFiles?: string[]
}

export interface PipelineExecutionResult {
  finalContent: string
  reasoning_content?: string
  agentComponents: MessageComponents
}

/**
 * 执行 Agent Pipeline
 */
export async function executeAgentPipeline(
  params: ExecutePipelineParams
): Promise<PipelineExecutionResult> {
  const { userMessage, conversationHistory, config, abortSignal, onProgress, overrideAttachedFiles } = params
  
  const userContent = userMessage.components?.userInput || userMessage.content
  
  // 使用 overrideAttachedFiles（如果提供）或原始的 attachedFiles
  const attachedFiles = overrideAttachedFiles ?? userMessage.components?.attachedFiles
  
  console.log('[AgentPipeline] 开始执行工作流', {
    hasOverrideFiles: !!overrideAttachedFiles,
    filesCount: attachedFiles?.length || 0
  })
  
  // 包装 onProgress，将结构化数据转换为字符串
  const wrappedOnProgress = onProgress ? (update: string | AgentProgressUpdate) => {
    if (typeof update === 'string') {
      onProgress(update)
    } else {
      // 将 AgentTaskResult 转换为 AgentTaskResultForUI
      const progressData = {
        type: update.type,
        message: update.message,
        currentTask: update.currentTask,
        completedTasks: update.completedResults?.map(r => convertTaskResultForUI(r))
      }
      onProgress(JSON.stringify(progressData))
    }
  } : undefined
  
  // 使用新的动态执行引擎
  const pipelineResult = await agentPipeline.executeDefaultWorkflow(
    {
      userInput: userContent,
      goal: userContent,  // 初始 goal 与 userInput 相同
      attachedFiles: attachedFiles,
      conversationHistory: conversationHistory,
      aiConfig: config
    },
    abortSignal,
    wrappedOnProgress
  )
  
  console.log('[AgentPipeline] 执行完成:', {
    success: pipelineResult.success,
    taskCount: pipelineResult.taskResults.length,
    totalTime: `${pipelineResult.totalTime}ms`
  })
  
  // 从任务结果中提取主模型生成的内容
  const mainGenerationTask = pipelineResult.taskResults.find(r => r.type === 'main-generation')
  
  if (!mainGenerationTask || mainGenerationTask.status !== 'completed') {
    throw new Error('主模型生成任务未完成或失败')
  }
  
  const finalContent = mainGenerationTask.output.content
  const reasoning_content = mainGenerationTask.output.reasoning_content
  
  // 将任务结果转换为 UI 组件格式
  const agentComponents: MessageComponents = {
    agentResults: pipelineResult.taskResults.length > 0 
      ? pipelineResult.taskResults.map(taskResult => convertTaskResultForUI(taskResult))
      : undefined
  }
  
  return {
    finalContent,
    reasoning_content,
    agentComponents
  }
}

export function shouldExecuteAgentPipeline(config: AIConfig): boolean {
  return !!(config.agentConfig && config.agentConfig.enabled)
}

export function formatPipelineResultForUI(
  pipelineResult: PipelineResult,
  userContent: string
): MessageComponents {
  return {
    agentResults: pipelineResult.taskResults.length > 0 
      ? pipelineResult.taskResults.map(taskResult => convertTaskResultForUI(taskResult))
      : undefined
  }
}

/**
 * 将 AgentTaskResult 转换为 UI 展示格式
 */
function convertTaskResultForUI(taskResult: AgentTaskResult): AgentTaskResultForUI {
  return {
    success: taskResult.status === 'completed',
    optimizedInput: typeof taskResult.output === 'string' ? taskResult.output : undefined,
    displayResult: taskResult.output?.displayText,
    metadata: {
      taskType: taskResult.type,
      name: taskResult.name,  // 使用任务的友好名称
      originalInput: taskResult.input,
      processingTime: taskResult.duration,
      error: taskResult.error
    }
  }
}

