/**
 * 文章结构生成任务
 * 根据优化后的输入、附加文件和上下文生成文章结构大纲
 */

import type {
  AgentTask,
  AgentTaskExecuteParams,
  AgentTaskResult,
  AgentTaskStatus
} from '../types'
import type { ApiProviderConfig } from '../../types'
import { callSimpleAPI } from '../simple-api'
import { DEFAULT_GENERATE_STRUCTURE_SYSTEM_PROMPT } from '../defaults'

export class GenerateStructureTask implements AgentTask {
  type = 'generate-structure' as const
  name = '文章结构'
  description = '根据输入、文件和上下文生成文章结构大纲'

  async execute(
    params: AgentTaskExecuteParams
  ): Promise<AgentTaskResult> {
    const { input, context, config, abortSignal, onProgress } = params
    
    const taskId = `${this.type}-${Date.now()}`
    const startTime = Date.now()

    try {
      const apiProvider = this.getApiProvider(context.aiConfig, config)
      if (!apiProvider) {
        throw new Error('未配置文章结构生成步骤的 API')
      }

      if (!apiProvider.apiKey || apiProvider.apiKey.trim() === '') {
        throw new Error(`API Provider ${apiProvider.name} 的 API Key 未配置`)
      }

      if (onProgress) {
        onProgress('正在生成文章结构...')
      }

      console.log(`[GenerateStructure] 开始生成文章结构，使用 ${apiProvider.name}`)

      // 构建用户输入内容
      const userContent = this.buildUserContent(input, context)

      // 使用配置的系统提示词，如果没有则使用默认的
      const systemPrompt = config.systemPrompt || DEFAULT_GENERATE_STRUCTURE_SYSTEM_PROMPT

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userContent }
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

      const structure = result.trim()

      console.log('[GenerateStructure] 文章结构生成完成:', {
        length: structure.length,
        preview: structure.substring(0, 200)
      })

      return {
        id: taskId,
        type: this.type,
        name: this.name,
        status: 'completed' as AgentTaskStatus,
        input: userContent,
        output: structure,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime
      }

    } catch (error: any) {
      console.log(`[GenerateStructure] 生成失败:`, error.message)
      
      return {
        id: taskId,
        type: this.type,
        name: this.name,
        status: 'failed' as AgentTaskStatus,
        input: typeof input === 'string' ? input : String(input),
        output: null,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        error: error.message || '文章结构生成失败'
      }
    }
  }

  /**
   * 构建用户输入内容，包含：优化后的输入 + 文件 + 上下文
   */
  private buildUserContent(input: any, context: import('../types').AgentContext): string {
    const parts: string[] = []
    
    // 1. 用户输入（可能是优化后的）
    const userInput = typeof input === 'string' ? input : String(input)
    if (userInput && userInput.trim()) {
      parts.push('# 用户需求\n' + userInput)
    }
    
    // 2. 附加文件内容（如果有）
    if (context.attachedFiles && context.attachedFiles.length > 0) {
      parts.push('\n# 附加文件\n' + context.attachedFiles.join('\n\n'))
    }
    
    // 3. 对话历史上下文（如果有）
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const historyText = context.conversationHistory
        .slice(-5) // 只取最近5条对话
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n')
      parts.push('\n# 对话上下文\n' + historyText)
    }
    
    return parts.join('\n\n')
  }

  private getApiProvider(
    aiConfig: import('../../types').AIConfig,
    config: import('../types').AgentTaskConfig
  ): ApiProviderConfig | null {
    // 优先使用任务配置中指定的 API
    if (config.apiProviderId) {
      const provider = aiConfig.providers.find(p => p.id === config.apiProviderId)
      if (provider) {
        console.log(`[GenerateStructure] 使用指定 API: ${provider.name}`)
        return provider
      }
      console.warn(`[GenerateStructure] 未找到指定的 API: ${config.apiProviderId}，使用当前 API`)
    }

    // 否则使用当前选中的 API
    const currentProvider = aiConfig.providers.find(p => p.id === aiConfig.currentProviderId)
    if (currentProvider) {
      console.log(`[GenerateStructure] 使用当前 API: ${currentProvider.name}`)
    }
    return currentProvider || null
  }
}

export const generateStructureTask = new GenerateStructureTask()

