/**
 * 判断是否需要优化输入的步骤
 * 使用 AI 判断用户输入是否需要优化
 */

import type {
  AgentStep,
  AgentContext,
  AgentStepConfig,
  AgentStepResult
} from '../types'
import type { ApiProviderConfig } from '../../types'
import { callSimpleAPI } from '../simple-api'
import { DEFAULT_SHOULD_OPTIMIZE_SYSTEM_PROMPT } from '../defaults'

export class ShouldOptimizeStep implements AgentStep {
  type = 'should-optimize' as const
  name = '判断是否优化'
  description = '使用 AI 判断用户输入是否需要优化'

  async execute(
    context: AgentContext,
    config: AgentStepConfig,
    abortSignal?: AbortSignal,
    onProgress?: (message: string) => void
  ): Promise<AgentStepResult> {
    const startTime = Date.now()

    try {
      const currentInput = context.processedInput || context.userInput

      // 输入过短，直接判断不需要优化
      if (!currentInput || currentInput.trim().length < 5) {
        context.stepData.set(this.type, { shouldOptimize: false, reason: '输入过短' })
        return {
          stepType: this.type,
          stepName: this.name,
          success: true,
          data: {
            input: currentInput,
            // 不返回 output 字段，避免修改 processedInput
            shouldOptimize: false,
            reason: '输入过短，无需优化'
          },
          processingTime: Date.now() - startTime
        }
      }

      const apiProvider = this.getApiProvider(context.aiConfig, config)
      if (!apiProvider) {
        throw new Error('未配置判断步骤的 API')
      }

      if (!apiProvider.apiKey || apiProvider.apiKey.trim() === '') {
        throw new Error(`API Provider ${apiProvider.name} 的 API Key 未配置`)
      }

      if (onProgress) {
        onProgress('正在判断是否需要优化...')
      }

      console.log(`[ShouldOptimize] 开始判断，使用 ${apiProvider.name}`)

      // 使用配置的系统提示词，如果没有则使用默认的
      const systemPrompt = config.systemPrompt || DEFAULT_SHOULD_OPTIMIZE_SYSTEM_PROMPT

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: currentInput }
      ]

      const result = await callSimpleAPI(
        messages,
        apiProvider,
        context.aiConfig,
        abortSignal
      )

      const response = result.trim()
      
      // 解析 AI 响应
      const shouldOptimize = response.includes('<是/>')
      const reason = shouldOptimize ? 'AI 判断需要优化' : 'AI 判断无需优化'

      console.log('[ShouldOptimize] 判断结果:', {
        response,
        shouldOptimize,
        reason
      })

      // 将判断结果存储到 context 中，供后续步骤使用
      context.stepData.set(this.type, { 
        shouldOptimize,
        reason,
        rawResponse: response 
      })

      return {
        stepType: this.type,
        stepName: this.name,
        success: true,
        data: {
          input: currentInput,
          // 不返回 output 字段，避免修改 processedInput
          // output: currentInput, // 保持原始输入不变
          shouldOptimize,
          reason,
          aiResponse: response // AI 的原始响应
        },
        processingTime: Date.now() - startTime
      }

    } catch (error: any) {
      const currentInput = context.processedInput || context.userInput
      
      console.error(`[ShouldOptimize] 判断失败:`, error.message)
      
      // 失败时默认允许优化
      context.stepData.set(this.type, { 
        shouldOptimize: true, 
        reason: '判断失败，默认执行优化',
        error: error.message 
      })
      
      return {
        stepType: this.type,
        stepName: this.name,
        success: false,
        data: {
          input: currentInput,
          shouldOptimize: true // 失败时默认执行优化
        },
        processingTime: Date.now() - startTime,
        error: error.message || '判断失败'
      }
    }
  }

  private getApiProvider(
    aiConfig: import('../../types').AIConfig,
    stepConfig: AgentStepConfig
  ): ApiProviderConfig | null {
    if (stepConfig.apiProviderId) {
      const provider = aiConfig.providers.find(p => p.id === stepConfig.apiProviderId)
      if (provider) return provider
    }

    return aiConfig.providers.find(p => p.id === aiConfig.currentProviderId) || null
  }
}

export const shouldOptimizeStep = new ShouldOptimizeStep()

