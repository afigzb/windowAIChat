/**
 * Agent 系统与对话管理器的集成层
 */

import type { FlatMessage, AIConfig, MessageComponents } from '../types'
import type { AgentContext } from './types'
import { agentPipeline } from './pipeline'
import type { PipelineResult } from './pipeline'

export interface ExecutePipelineParams {
  userMessage: FlatMessage
  conversationHistory: FlatMessage[]
  config: AIConfig
  abortSignal?: AbortSignal
  onProgress?: (content: string) => void
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
  
  console.log('[AgentPipeline] 开始执行，步骤数:', config.agentConfig?.steps?.length)
  
  const pipelineResult = await agentPipeline.execute(
    {
      userInput: userContent,
      attachedFiles: userMessage.components?.attachedFiles,
      conversationHistory: conversationHistory,
      components: userMessage.components
    },
    config.agentConfig!,
    config,
    abortSignal,
    onProgress
  )
  
  console.log('[AgentPipeline] 执行完成:', {
    success: pipelineResult.success,
    totalTime: `${pipelineResult.totalTime}ms`
  })
  
  const finalContent = pipelineResult.finalInput || userContent
  
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
  
  const agentComponents: MessageComponents = {
    agentResults: pipelineResult.stepResults.length > 0 
      ? pipelineResult.stepResults.map(stepResult => ({
          success: stepResult.success,
          optimizedInput: stepResult.data?.output,
          metadata: {
            taskType: stepResult.stepType,
            originalInput: stepResult.data?.input || userContent,
            processingTime: stepResult.processingTime,
            error: stepResult.error,
            changes: stepResult.data?.changes
          }
        }))
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
    agentResults: pipelineResult.stepResults.length > 0 
      ? pipelineResult.stepResults.map(stepResult => ({
          success: stepResult.success,
          optimizedInput: stepResult.data?.output,
          metadata: {
            taskType: stepResult.stepType,
            originalInput: stepResult.data?.input || userContent,
            processingTime: stepResult.processingTime,
            error: stepResult.error,
            changes: stepResult.data?.changes
          }
        }))
      : undefined
  }
}

