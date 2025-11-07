/**
 * Preprocessor - 预处理器统一入口
 */

import type { AgentContext, PreprocessorConfig, PreprocessingResponse } from '../types'
import { selectFileMessages, selectContextMessages } from '../core/message-ops'
import { processFile } from './file-processor'
import { processContextRange } from './context-processor'

// 重新导出类型
export type { PreprocessorConfig, PreprocessingResponse }

/**
 * 执行预处理阶段
 * 
 * 流程：
 * 1. 选择需要处理的文件消息 → 逐个发送概括请求 → 替换原消息内容
 * 2. 选择需要处理的上下文消息 → 合并发送概括请求 → 用一条概括消息替换原区域
 */
export async function preprocess(
  context: AgentContext,
  config?: PreprocessorConfig,
  abortSignal?: AbortSignal
): Promise<PreprocessingResponse> {
  // const verbose = config?.verbose ?? true
  
  // 如果配置跳过预处理
  if (config?.skip) {
    context.processing.preprocessed = true
    
    return {
      success: true,
      tokensUsed: 0
    }
  }
  
  try {
    let totalTokens = 0
    
    // 获取 processing.messages 的引用（直接操作这个数组）
    const messages = context.processing.messages
    
    // 操作1：文件概括
    // 选择 → 发送请求 → 替换内容
    const fileMessages = selectFileMessages(messages, true) // 只选择未处理的
    
    // 获取文件概括使用的模型ID
    const fileProviderId = context.input.aiConfig.agentConfig?.preprocessor?.fileProcessor?.providerId
    
    if (fileMessages.length > 0) {
      const parallelFiles = config?.parallelFiles ?? true
      const maxConcurrency = config?.maxConcurrency || 3
      
      if (parallelFiles && fileMessages.length > 1) {
        // 并行处理
        for (let i = 0; i < fileMessages.length; i += maxConcurrency) {
          const batch = fileMessages.slice(i, i + maxConcurrency)
          const results = await Promise.all(
            batch.map(fileMsg => processFile(fileMsg, context, abortSignal, fileProviderId))
          )
          
          results.forEach(result => {
            if (result.success) {
              totalTokens += result.tokensUsed
            }
          })
        }
      } else {
        // 串行处理
        for (const fileMsg of fileMessages) {
          const result = await processFile(fileMsg, context, abortSignal, fileProviderId)
          if (result.success) {
            totalTokens += result.tokensUsed
          }
        }
      }
    }
    
    // 操作2：上下文概括
    // 选择 → 发送请求 → 替换区域
    const contextMessages = selectContextMessages(messages, true) // 只选择未处理的
    
    // 获取上下文概括使用的模型ID
    const contextProviderId = context.input.aiConfig.agentConfig?.preprocessor?.contextProcessor?.providerId
    
    if (contextMessages.length > 1) {
      const result = await processContextRange(
        contextMessages,
        messages,
        context,
        abortSignal,
        contextProviderId
      )
      
      if (result.success) {
        totalTokens += result.tokensUsed
      }
    }
    
    // 标记预处理完成
    context.processing.preprocessed = true
    
    return {
      success: true,
      tokensUsed: totalTokens
    }
    
  } catch (error: any) {
    return {
      success: false,
      tokensUsed: 0,
      error: error.message || '预处理失败'
    }
  }
}

// 导出子模块
export { processFile } from './file-processor'
export { processContextRange } from './context-processor'
export { 
  fileSummaryCacheManager,
  type FileSummaryCacheManager,
  type SummaryCacheResult 
} from './cache-manager'
