/**
 * 输入优化任务处理器
 * 
 * 功能：将用户的真实输入发送给小模型进行优化
 * - 修正语法错误
 * - 补充必要信息
 * - 使表达更清晰
 */

import type { 
  AgentTaskProcessor, 
  AgentTaskContext, 
  AgentTaskConfig, 
  AgentTaskResult 
} from '../types'
import type { ApiProviderConfig } from '../../types'
import { callSimpleAPI } from '../../core/simple-api'

// 优化提示词
const OPTIMIZE_SYSTEM_PROMPT = `你是一个专业的文本优化助手。你的任务是优化用户输入，使其更清晰、准确、易于理解。

优化原则：
1. 保持原意不变
2. 修正明显的语法错误或错别字

请直接输出优化后的文本，不要添加任何解释或说明。`

export class OptimizeInputTask implements AgentTaskProcessor {
  type = 'optimize-input' as const
  name = '输入优化'

  async process(
    context: AgentTaskContext,
    taskConfig: AgentTaskConfig,
    abortSignal?: AbortSignal,
    onStream?: (content: string) => void
  ): Promise<AgentTaskResult> {
    const startTime = Date.now()

    try {
      // 如果输入为空或太短，不进行优化
      if (!context.userInput || context.userInput.trim().length < 5) {
        return {
          success: true,
          optimizedInput: context.userInput,
          metadata: {
            taskType: this.type,
            originalInput: context.userInput,
            processingTime: Date.now() - startTime
          }
        }
      }

      // 获取任务专用的 API 配置
      const apiProvider = this.getApiProvider(context.config, taskConfig)
      if (!apiProvider) {
        throw new Error('未配置优化任务的 API')
      }

      // 构建消息
      const messages = [
        { role: 'system' as const, content: OPTIMIZE_SYSTEM_PROMPT },
        { role: 'user' as const, content: context.userInput }
      ]

      // 调用 API 进行优化（复用现有的适配器系统）
      const optimizedInput = await callSimpleAPI(
        messages,
        apiProvider,
        context.config,
        abortSignal,
        onStream
      )

      return {
        success: true,
        optimizedInput: optimizedInput.trim(),
        metadata: {
          taskType: this.type,
          originalInput: context.userInput,
          processingTime: Date.now() - startTime
        }
      }
    } catch (error: any) {
      // 如果优化失败，返回原始输入
      return {
        success: false,
        optimizedInput: context.userInput,
        metadata: {
          taskType: this.type,
          originalInput: context.userInput,
          processingTime: Date.now() - startTime,
          error: error.message || '优化失败'
        }
      }
    }
  }

  /**
   * 获取任务使用的 API 配置
   */
  private getApiProvider(
    config: import('../../types').AIConfig,
    taskConfig: AgentTaskConfig
  ): ApiProviderConfig | null {
    // 优先使用任务指定的 API（用户在设置中单独选择的小模型）
    if (taskConfig.apiProviderId) {
      const provider = config.providers.find(p => p.id === taskConfig.apiProviderId)
      if (provider) return provider
    }

    // 否则使用当前主聊天的 API
    return config.providers.find(p => p.id === config.currentProviderId) || null
  }
}

// 导出单例
export const optimizeInputTask = new OptimizeInputTask()

