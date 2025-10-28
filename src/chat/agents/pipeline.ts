/**
 * Agent Pipeline - 步骤编排引擎
 */

import type {
  AgentStep,
  AgentStepType,
  AgentStepConfig,
  AgentStepResult,
  AgentContext,
  AgentPipelineConfig
} from './types'
import type { AIConfig, FlatMessage, MessageComponents } from '../types'

export interface PipelineResult {
  success: boolean
  finalInput: string
  context: AgentContext
  stepResults: AgentStepResult[]
  totalTime: number
}

export class AgentPipeline {
  private steps = new Map<AgentStepType, AgentStep>()

  registerStep(step: AgentStep): void {
    // 生产环境仍然提示警告
    if (this.steps.has(step.type) && import.meta.env.PROD) {
      console.warn(`[Pipeline] 步骤类型 ${step.type} 已存在，将被覆盖`)
    }
    this.steps.set(step.type, step)
  }

  registerSteps(steps: AgentStep[]): void {
    steps.forEach(step => this.registerStep(step))
  }

  async execute(
    input: {
      userInput: string
      attachedFiles?: string[]
      conversationHistory?: FlatMessage[]
      components?: MessageComponents
    },
    pipelineConfig: AgentPipelineConfig,
    aiConfig: AIConfig,
    abortSignal?: AbortSignal,
    onProgress?: (message: string) => void
  ): Promise<PipelineResult> {
    const startTime = Date.now()

    if (!pipelineConfig || !pipelineConfig.enabled || !pipelineConfig.steps) {
      return this.createEmptyResult(input.userInput, startTime)
    }

    const enabledSteps = pipelineConfig.steps.filter(step => step.enabled)
    
    if (enabledSteps.length === 0) {
      return this.createEmptyResult(input.userInput, startTime)
    }

    const context: AgentContext = {
      userInput: input.userInput,
      attachedFiles: input.attachedFiles,
      conversationHistory: input.conversationHistory,
      processedInput: input.userInput,
      stepData: new Map(),
      metadata: {
        startTime,
        stepResults: []
      },
      aiConfig
    }

    const continueOnError = pipelineConfig.options?.continueOnError ?? false
    let overallSuccess = true

    for (const stepConfig of enabledSteps) {
      if (abortSignal?.aborted) {
        console.log('[Pipeline] 执行被中断')
        break
      }

      const step = this.steps.get(stepConfig.type)
      
      if (!step) {
        console.warn(`[Pipeline] 未找到步骤处理器: ${stepConfig.type}`)
        continue
      }

      try {
        if (onProgress) {
          onProgress(`正在执行: ${stepConfig.name}...`)
        }

        const result = await step.execute(
          context,
          stepConfig,
          abortSignal,
          onProgress
        )

        context.metadata.stepResults.push(result)

        if (!result.success) {
          overallSuccess = false
          console.log(`[Pipeline] 步骤失败: ${stepConfig.name} - ${result.error}`)
          
          if (!continueOnError) {
            break
          }
        }

        if (result.success && result.data?.output) {
          context.processedInput = result.data.output
        }

      } catch (error: any) {
        console.error(`[Pipeline] 步骤异常: ${stepConfig.name}`, error)
        overallSuccess = false
        
        const errorResult: AgentStepResult = {
          stepType: stepConfig.type,
          stepName: stepConfig.name,
          success: false,
          processingTime: 0,
          error: error.message || '步骤执行异常'
        }
        context.metadata.stepResults.push(errorResult)
        
        if (!continueOnError) {
          break
        }
      }
    }

    const totalTime = Date.now() - startTime
    
    return {
      success: overallSuccess,
      finalInput: context.processedInput || input.userInput,
      context,
      stepResults: context.metadata.stepResults,
      totalTime
    }
  }

  private createEmptyResult(userInput: string, startTime: number): PipelineResult {
    return {
      success: true,
      finalInput: userInput,
      context: {
        userInput,
        processedInput: userInput,
        stepData: new Map(),
        metadata: {
          startTime,
          stepResults: []
        },
        aiConfig: {} as AIConfig
      },
      stepResults: [],
      totalTime: Date.now() - startTime
    }
  }

  getRegisteredSteps(): AgentStep[] {
    return Array.from(this.steps.values())
  }

  hasStep(type: AgentStepType): boolean {
    return this.steps.has(type)
  }

  getStep(type: AgentStepType): AgentStep | undefined {
    return this.steps.get(type)
  }
}

export const agentPipeline = new AgentPipeline()

