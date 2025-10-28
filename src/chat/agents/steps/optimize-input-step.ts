/**
 * 输入优化步骤
 * 使用 AI 优化用户输入，使其更清晰、准确
 */

import type {
  AgentStep,
  AgentContext,
  AgentStepConfig,
  AgentStepResult
} from '../types'
import type { ApiProviderConfig } from '../../types'
import { callSimpleAPI } from '../simple-api'

const OPTIMIZE_SYSTEM_PROMPT = `你是一个专业的文本优化助手。你的任务是优化用户输入，使其更清晰、准确、易于理解。

优化原则：
1. 保持原意不变
2. 修正明显的语法错误或错别字
3. 使表达更简洁明了
4. 补充必要的上下文信息

请直接输出优化后的文本，不要添加任何解释或说明。`

export class OptimizeInputStep implements AgentStep {
  type = 'optimize-input' as const
  name = '输入优化'
  description = '使用 AI 优化用户输入，修正语法错误并使表达更清晰'

  async execute(
    context: AgentContext,
    config: AgentStepConfig,
    abortSignal?: AbortSignal,
    onProgress?: (message: string) => void
  ): Promise<AgentStepResult> {
    const startTime = Date.now()

    try {
      const currentInput = context.processedInput || context.userInput

      // 检查前置判断步骤的结果
      const shouldOptimizeData = context.stepData.get('should-optimize')
      if (shouldOptimizeData && shouldOptimizeData.shouldOptimize === false) {
        console.log('[OptimizeInput] 根据前置判断，跳过优化步骤')
        return {
          stepType: this.type,
          stepName: this.name,
          success: true,
          data: {
            input: currentInput,
            output: currentInput,
            changes: `已跳过：${shouldOptimizeData.reason || '无需优化'}`
          },
          processingTime: Date.now() - startTime
        }
      }

      if (!currentInput || currentInput.trim().length < 5) {
        return {
          stepType: this.type,
          stepName: this.name,
          success: true,
          data: {
            input: currentInput,
            output: currentInput,
            changes: '输入过短，无需优化'
          },
          processingTime: Date.now() - startTime
        }
      }

      const apiProvider = this.getApiProvider(context.aiConfig, config)
      if (!apiProvider) {
        throw new Error('未配置优化步骤的 API')
      }

      if (!apiProvider.apiKey || apiProvider.apiKey.trim() === '') {
        throw new Error(`API Provider ${apiProvider.name} 的 API Key 未配置`)
      }

      if (onProgress) {
        onProgress('正在优化输入...')
      }

      console.log(`[OptimizeInput] 开始优化，使用 ${apiProvider.name}`)

      const messages = [
        { role: 'system' as const, content: OPTIMIZE_SYSTEM_PROMPT },
        { role: 'user' as const, content: currentInput }
      ]

      const result = await callSimpleAPI(
        messages,
        apiProvider,
        context.aiConfig,
        abortSignal,
        (accumulatedContent) => {
          if (onProgress) {
            onProgress(accumulatedContent)
          }
        }
      )

      const optimizedInput = result.trim()

      console.log('[OptimizeInput] 获取到的消息:', {
        original: currentInput.substring(0, 100) + (currentInput.length > 100 ? '...' : ''),
        optimized: optimizedInput.substring(0, 100) + (optimizedInput.length > 100 ? '...' : ''),
        changed: currentInput !== optimizedInput
      })

      context.processedInput = optimizedInput

      context.stepData.set(this.type, {
        originalInput: currentInput,
        optimizedInput: optimizedInput
      })

      console.log(`[OptimizeInput] 优化完成: ${currentInput !== optimizedInput ? '已修改' : '无需修改'}`)

      return {
        stepType: this.type,
        stepName: this.name,
        success: true,
        data: {
          input: currentInput,
          output: optimizedInput,
          changes: currentInput !== optimizedInput 
            ? '已优化输入'
            : '输入无需修改'
        },
        processingTime: Date.now() - startTime
      }

    } catch (error: any) {
      const currentInput = context.processedInput || context.userInput
      
      console.error(`[OptimizeInput] 优化失败:`, error.message)
      
      return {
        stepType: this.type,
        stepName: this.name,
        success: false,
        data: {
          input: currentInput,
          output: currentInput
        },
        processingTime: Date.now() - startTime,
        error: error.message || '优化失败'
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

export const optimizeInputStep = new OptimizeInputStep()

