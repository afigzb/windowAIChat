/**
 * Agent Pipeline 系统类型定义
 */

import type { AIConfig } from '../types'
import type { FlatMessage } from '../types'

export type AgentStepType = 
  | 'should-optimize'
  | 'optimize-input'
  | 'retrieve-info'
  | 'analyze-intent'
  | 'custom'

export interface AgentStepConfig {
  type: AgentStepType
  enabled: boolean
  name: string
  description?: string
  apiProviderId?: string
  systemPrompt?: string  // 可配置的系统提示词
  options?: Record<string, any>
}

export interface AgentContext {
  userInput: string
  attachedFiles?: string[]
  conversationHistory?: FlatMessage[]
  processedInput?: string
  stepData: Map<string, any>
  metadata: {
    startTime: number
    stepResults: AgentStepResult[]
  }
  aiConfig: AIConfig
}

export interface AgentStepResult {
  stepType: AgentStepType
  stepName: string
  success: boolean
  data?: {
    input?: string
    output?: string
    changes?: string
    [key: string]: any
  }
  processingTime: number
  error?: string
}

export interface AgentStep {
  type: AgentStepType
  name: string
  description?: string
  
  execute(
    context: AgentContext,
    config: AgentStepConfig,
    abortSignal?: AbortSignal,
    onProgress?: (message: string) => void
  ): Promise<AgentStepResult>
}

export interface AgentPipelineConfig {
  enabled: boolean
  steps: AgentStepConfig[]
  options?: {
    continueOnError?: boolean
  }
}
