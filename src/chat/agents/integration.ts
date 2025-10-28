/**
 * Agent 系统与对话管理器的集成层
 */

import type { FlatMessage, AIConfig, MessageComponents, AgentTaskResultForUI } from '../types'
import { agentPipeline } from './pipeline'
import type { PipelineResult } from './pipeline'
import { defaultOptimizeWorkflow } from './workflows'
import type { AgentTaskResult, AgentProgressUpdate } from './types'

export interface ExecutePipelineParams {
  userMessage: FlatMessage
  conversationHistory: FlatMessage[]
  config: AIConfig
  abortSignal?: AbortSignal
  onProgress?: (content: string | AgentProgressUpdate) => void
}

export interface PipelineExecutionResult {
  optimizedHistory: FlatMessage[]
  agentComponents: MessageComponents
}

/**
 * 执行 Agent Pipeline
 */
export async function executeAgentPipeline(
  params: ExecutePipelineParams
): Promise<PipelineExecutionResult> {
  const { userMessage, conversationHistory, config, abortSignal, onProgress } = params
  
  const userContent = userMessage.components?.userInput || userMessage.content
  
  console.log('[AgentPipeline] 开始执行工作流')
  
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
  
  // 使用默认工作流执行
  const pipelineResult = await agentPipeline.execute(
    {
      userInput: userContent,
      attachedFiles: userMessage.components?.attachedFiles,
      conversationHistory: conversationHistory,
      aiConfig: config
    },
    defaultOptimizeWorkflow,
    abortSignal,
    wrappedOnProgress
  )
  
  console.log('[AgentPipeline] 执行完成:', {
    success: pipelineResult.success,
    taskCount: pipelineResult.taskResults.length,
    totalTime: `${pipelineResult.totalTime}ms`
  })
  
  // 从任务结果中提取优化后的输入
  const optimizeTask = pipelineResult.taskResults.find(r => r.type === 'optimize-input')
  const finalContent = (optimizeTask?.output as string) || userContent
  
  const optimizedUserMessage: FlatMessage = {
    ...userMessage,
    content: finalContent,
    components: {
      ...userMessage.components,
      optimizedInput: undefined
    }
  }
  
  const optimizedHistory = conversationHistory.map(msg => 
    msg.id === userMessage.id ? optimizedUserMessage : msg
  )
  
  // 将任务结果转换为 UI 组件格式
  const agentComponents: MessageComponents = {
    agentResults: pipelineResult.taskResults.length > 0 
      ? pipelineResult.taskResults.map(taskResult => convertTaskResultForUI(taskResult))
      : undefined
  }
  
  return {
    optimizedHistory,
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

