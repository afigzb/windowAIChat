/**
 * 输入优化任务
 * 使用 AI 优化用户输入，使其更清晰、准确
 */

import type {
  AgentTask,
  AgentTaskExecuteParams,
  AgentTaskResult,
  AgentTaskStatus
} from '../types'
import type { ApiProviderConfig } from '../../types'
import { callSimpleAPI } from '../simple-api'
import { DEFAULT_OPTIMIZE_SYSTEM_PROMPT } from '../defaults'

export class OptimizeInputTask implements AgentTask {
  type = 'optimize-input' as const
  name = '输入优化'
  description = '使用 AI 优化用户输入，修正语法错误并使表达更清晰'

  async execute(
    params: AgentTaskExecuteParams
  ): Promise<AgentTaskResult> {
    const { input, context, config, abortSignal, onProgress } = params
    
    const taskId = `${this.type}-${Date.now()}`
    const startTime = Date.now()
    
    const userInput = typeof input === 'string' ? input : String(input)

    try {
      if (!userInput || userInput.trim().length < 5) {
        return {
          id: taskId,
          type: this.type,
          name: this.name,
          status: 'completed' as AgentTaskStatus,
          input: userInput,
          output: userInput,
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
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

      // 使用配置的系统提示词，如果没有则使用默认的
      const systemPrompt = config.systemPrompt || DEFAULT_OPTIMIZE_SYSTEM_PROMPT

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userInput }
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

      console.log('[OptimizeInput] 优化完成:', {
        original: userInput.substring(0, 100),
        optimized: optimizedInput.substring(0, 100),
        changed: userInput !== optimizedInput
      })

      return {
        id: taskId,
        type: this.type,
        name: this.name,
        status: 'completed' as AgentTaskStatus,
        input: userInput,
        output: optimizedInput,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime
      }

    } catch (error: any) {
      console.error(`[OptimizeInput] 优化失败:`, error.message)
      
      return {
        id: taskId,
        type: this.type,
        name: this.name,
        status: 'failed' as AgentTaskStatus,
        input: userInput,
        output: userInput,  // 失败时返回原始输入
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        error: error.message || '优化失败'
      }
    }
  }

  private getApiProvider(
    aiConfig: import('../../types').AIConfig,
    config: import('../types').AgentTaskConfig
  ): ApiProviderConfig | null {
    // 优先使用任务配置中指定的 API
    if (config.apiProviderId) {
      const provider = aiConfig.providers.find(p => p.id === config.apiProviderId)
      if (provider) {
        console.log(`[OptimizeInput] 使用指定 API: ${provider.name}`)
        return provider
      }
      console.warn(`[OptimizeInput] 未找到指定的 API: ${config.apiProviderId}，使用当前 API`)
    }

    // 否则使用当前选中的 API
    const currentProvider = aiConfig.providers.find(p => p.id === aiConfig.currentProviderId)
    if (currentProvider) {
      console.log(`[OptimizeInput] 使用当前 API: ${currentProvider.name}`)
    }
    return currentProvider || null
  }
}

export const optimizeInputTask = new OptimizeInputTask()

