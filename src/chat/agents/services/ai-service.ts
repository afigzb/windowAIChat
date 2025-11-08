/**
 * AI Service - 统一的AI调用服务
 * 
 * 职责：
 * 1. 封装所有AI API调用
 * 2. 统一处理消息格式转换（过滤_meta标记）
 * 3. 统一错误处理
 */

import type { ApiProviderConfig, AIConfig, FlatMessage } from '../../types'
import { OpenAIAdapter } from '../../adapters/openai-adapter'
import { GeminiAdapter } from '../../adapters/gemini-adapter'
import type { Message, ApiMessage, AICallOptions } from '../types'
import { stripMetadata } from '../core/agent-context'

// 重新导出类型
export type { AICallOptions }

/**
 * AI服务类
 */
export class AIService {
  constructor(
    private aiConfig: AIConfig
  ) {}
  
  /**
   * 获取当前激活的provider
   */
  private getCurrentProvider(): ApiProviderConfig {
    const provider = this.aiConfig.providers.find(
      p => p.id === this.aiConfig.currentProviderId
    )
    
    if (!provider) {
      throw new Error('未找到当前API配置')
    }
    
    return provider
  }
  
  /**
   * 创建适配器
   */
  private createAdapter(provider: ApiProviderConfig): OpenAIAdapter | GeminiAdapter {
    return provider.type === 'gemini'
      ? new GeminiAdapter(provider)
      : new OpenAIAdapter(provider)
  }
  
  /**
   * 调用AI API（支持思考过程和答案的分别流式回调）
   */
  async call(
    messages: Message[] | ApiMessage[],
    options?: AICallOptions
  ): Promise<string> {
    try {
      // 获取provider
      const provider = this.getCurrentProvider()
      
      // 应用自定义参数
      const effectiveProvider = this.applyOptions(provider, options)
      
      // 过滤_meta标记
      const apiMessages = this.prepareMessages(messages)
      
      // 创建适配器
      const adapter = this.createAdapter(effectiveProvider)
      
      // 如果有思考/答案的分别回调，使用完整的 callAPI 方法
      if (options?.onThinkingUpdate || options?.onAnswerUpdate) {
        // 将 ApiMessage[] 转换为 FlatMessage[] (简单转换，保留 id)
        const flatMessages = apiMessages.map(msg => ({
          id: msg.id || `temp_${Date.now()}_${Math.random()}`,
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(),
          parentId: null
        }))
        
        const result = await adapter.callAPI(
          flatMessages,
          this.aiConfig,
          options.abortSignal!,
          options.onThinkingUpdate || (() => {}),
          options.onAnswerUpdate || (() => {}),
          undefined,
          'append',
          undefined
        )
        
        return result.content
      }
      
      // 否则使用简单的 callRawAPI 方法
      const result = await adapter.callRawAPI(
        apiMessages,
        options?.abortSignal,
        options?.onStream
      )
      
      return result
      
    } catch (error: any) {
      throw error
    }
  }
  
  /**
   * 应用调用选项到provider
   */
  private applyOptions(
    provider: ApiProviderConfig,
    options?: AICallOptions
  ): ApiProviderConfig {
    const result = { ...provider }
    
    if (options?.temperature !== undefined) {
      result.extraParams = {
        ...result.extraParams,
        temperature: options.temperature
      }
    }
    
    if (options?.maxTokens !== undefined && options.maxTokens > 0) {
      result.maxTokens = options.maxTokens
    }
    
    return result
  }
  
  /**
   * 准备消息（过滤_meta标记）
   */
  private prepareMessages(
    messages: Message[] | ApiMessage[]
  ): ApiMessage[] {
    // 如果是Message[]类型（有_meta），使用stripMetadata
    if (messages.length > 0 && '_meta' in messages[0]) {
      return stripMetadata(messages as Message[])
    }
    
    // 否则直接返回
    return messages as ApiMessage[]
  }
}

/**
 * 创建AI服务实例
 */
export function createAIService(aiConfig: AIConfig): AIService {
  return new AIService(aiConfig)
}
