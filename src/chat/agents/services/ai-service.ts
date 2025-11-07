/**
 * AI Service - 统一的AI调用服务
 * 
 * 职责：
 * 1. 封装所有AI API调用
 * 2. 统一处理消息格式转换（过滤_meta标记）
 * 3. 统一错误处理和重试逻辑
 * 4. 提供不同场景的调用方法
 */

import type { ApiProviderConfig, AIConfig } from '../../types'
import { OpenAIAdapter } from '../../adapters/openai-adapter'
import { GeminiAdapter } from '../../adapters/gemini-adapter'
import type { Message } from '../core/workspace-data'
import { stripMetadata } from '../core/workspace-data'

// AI调用配置

export interface AICallOptions {
  /** 温度参数（0-1） */
  temperature?: number
  
  /** 最大token数 */
  maxTokens?: number
  
  /** 流式回调 */
  onStream?: (content: string) => void
  
  /** 中止信号 */
  abortSignal?: AbortSignal
  
  /** 是否启用详细日志 */
  verbose?: boolean
}

// 
// AI服务类
// 

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
   * 调用AI API
   */
  async call(
    messages: Message[] | Array<{ role: string; content: string }>,
    options?: AICallOptions
  ): Promise<string> {
    const verbose = options?.verbose ?? false
    
    try {
      // 获取provider
      const provider = this.getCurrentProvider()
      
      // 应用自定义参数
      const effectiveProvider = this.applyOptions(provider, options)
      
      // 过滤_meta标记
      const apiMessages = this.prepareMessages(messages)
      
      // 创建适配器并调用
      const adapter = this.createAdapter(effectiveProvider)
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
   * 批量调用（用于并行处理）
   */
  async callBatch(
    messagesArray: Array<Message[] | Array<{ role: string; content: string }>>,
    options?: AICallOptions,
    maxConcurrency: number = 3
  ): Promise<string[]> {
    const results: string[] = []
    const executing: Promise<any>[] = []
    
    for (const messages of messagesArray) {
      // 等待有空位
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing)
      }
      
      const promise = this.call(messages, options)
        .then(result => {
          results.push(result)
          return result
        })
        .finally(() => {
          const index = executing.indexOf(promise)
          if (index > -1) {
            executing.splice(index, 1)
          }
        })
      
      executing.push(promise)
    }
    
    await Promise.all(executing)
    
    return results
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
    messages: Message[] | Array<{ role: string; content: string }>
  ): Array<{ role: string; content: string }> {
    // 如果是Message[]类型（有_meta），使用stripMetadata
    if (messages.length > 0 && '_meta' in messages[0]) {
      return stripMetadata(messages as Message[])
    }
    
    // 否则直接返回
    return messages as Array<{ role: string; content: string }>
  }
}

// 
// 工厂函数
// 

/**
 * 创建AI服务实例
 */
export function createAIService(aiConfig: AIConfig): AIService {
  return new AIService(aiConfig)
}

