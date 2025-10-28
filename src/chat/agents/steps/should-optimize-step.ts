/**
 * 判断是否需要优化输入的任务
 * 使用 AI 判断用户输入是否需要优化
 */

import type {
  AgentTask,
  AgentTaskExecuteParams,
  AgentTaskResult,
  AgentTaskStatus
} from '../types'
import type { ApiProviderConfig } from '../../types'
import { callSimpleAPI } from '../simple-api'
import { DEFAULT_SHOULD_OPTIMIZE_SYSTEM_PROMPT } from '../defaults'

export class ShouldOptimizeTask implements AgentTask {
  type = 'should-optimize' as const
  name = '判断是否优化'
  description = '使用 AI 判断用户输入是否需要优化'

  async execute(
    params: AgentTaskExecuteParams
  ): Promise<AgentTaskResult> {
    const { input, context, config, abortSignal, onProgress } = params
    
    const taskId = `${this.type}-${Date.now()}`
    const startTime = Date.now()
    
    const userInput = typeof input === 'string' ? input : String(input)

    try {
      // 输入过短，直接判断不需要优化
      if (!userInput || userInput.trim().length < 5) {
        const reason = '输入过短，无需优化'
        
        return {
          id: taskId,
          type: this.type,
          name: this.name,
          status: 'completed' as AgentTaskStatus,
          input: userInput,
          output: {
            shouldOptimize: false,
            reason,
            displayText: reason
          },
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
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
        { role: 'user' as const, content: userInput }
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
      const displayText = `判断结果: ${shouldOptimize ? '需要优化' : '无需优化'}\n\nAI 分析:\n${response}`

      console.log('[ShouldOptimize] 判断结果:', {
        response: response.substring(0, 100),
        shouldOptimize
      })

      return {
        id: taskId,
        type: this.type,
        name: this.name,
        status: 'completed' as AgentTaskStatus,
        input: userInput,
        output: {
          shouldOptimize,
          reason: shouldOptimize ? 'AI 判断需要优化' : 'AI 判断无需优化',
          aiResponse: response,
          displayText
        },
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime
      }

    } catch (error: any) {
      console.error(`[ShouldOptimize] 判断失败:`, error.message)
      
      return {
        id: taskId,
        type: this.type,
        name: this.name,
        status: 'failed' as AgentTaskStatus,
        input: userInput,
        output: {
          shouldOptimize: true,  // 失败时默认允许优化
          reason: '判断失败，默认执行优化'
        },
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        error: error.message || '判断失败'
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
        console.log(`[ShouldOptimize] 使用指定 API: ${provider.name}`)
        return provider
      }
      console.warn(`[ShouldOptimize] 未找到指定的 API: ${config.apiProviderId}，使用当前 API`)
    }

    // 否则使用当前选中的 API
    const currentProvider = aiConfig.providers.find(p => p.id === aiConfig.currentProviderId)
    if (currentProvider) {
      console.log(`[ShouldOptimize] 使用当前 API: ${currentProvider.name}`)
    }
    return currentProvider || null
  }
}

export const shouldOptimizeTask = new ShouldOptimizeTask()

