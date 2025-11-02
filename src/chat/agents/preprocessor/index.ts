/**
 * Preprocessor - 预处理器统一入口
 * 
 * 核心模式：选择消息 → 发送请求 → 写入结果
 * 
 * 两个主要操作：
 * 1. 文件概括：选择 type === 'file' 的消息 → 发送概括请求 → 替换原消息的 content
 * 2. 上下文概括：选择 type === 'context' 的连续消息 → 发送概括请求 → 用一条 'context_summary' 替换
 */

import type { AIConfig } from '../../types'
import type { WorkspaceData } from '../core/workspace-data'
import { selectFileMessages, selectContextMessages } from '../core/message-ops'
import { processFile } from './file-processor'
import { processContextRange } from './context-processor'

// ============================================================
// 预处理配置
// ============================================================

export interface PreprocessorConfig {
  /** 是否启用详细日志 */
  verbose?: boolean
  
  /** 是否跳过预处理（直接使用原始输入） */
  skip?: boolean
  
  /** 是否并行处理文件（默认true） */
  parallelFiles?: boolean
  
  /** 最大并行数（默认3） */
  maxConcurrency?: number
}

export interface PreprocessingResponse {
  success: boolean
  tokensUsed: number
  error?: string
}

// ============================================================
// 预处理器主函数
// ============================================================

/**
 * 执行预处理阶段
 * 
 * 流程：
 * 1. 选择需要处理的文件消息 → 逐个发送概括请求 → 替换原消息内容
 * 2. 选择需要处理的上下文消息 → 合并发送概括请求 → 用一条概括消息替换原区域
 */
export async function preprocess(
  workspace: WorkspaceData,
  aiConfig: AIConfig,
  config?: PreprocessorConfig,
  abortSignal?: AbortSignal
): Promise<PreprocessingResponse> {
  const verbose = config?.verbose ?? true
  
  if (verbose) {
    console.log('[Preprocessor] 开始预处理阶段')
  }
  
  // 如果配置跳过预处理
  if (config?.skip) {
    if (verbose) {
      console.log('[Preprocessor] 跳过预处理')
    }
    
    workspace.workspace.preprocessed = true
    
    return {
      success: true,
      tokensUsed: 0
    }
  }
  
  try {
    let totalTokens = 0
    
    // 获取 processedMessages 的引用（直接操作这个数组）
    const messages = workspace.workspace.processedMessages
    const userInput = workspace.input.rawUserInput
    
    if (verbose) {
      console.log(`[Preprocessor] 初始消息数: ${messages.length}`)
    }
    
    // ========== 操作1：文件概括 ==========
    // 选择 → 发送请求 → 替换内容
    const fileMessages = selectFileMessages(messages, true) // 只选择未处理的
    
    // 获取文件概括使用的模型ID
    const fileProviderId = aiConfig.agentConfig?.preprocessor?.fileProcessor?.providerId
    
    if (fileMessages.length > 0) {
      if (verbose) {
        console.log(`[Preprocessor] 操作1：概括 ${fileMessages.length} 个文件`)
        if (fileProviderId) {
          const provider = aiConfig.providers.find(p => p.id === fileProviderId)
          console.log(`[Preprocessor] 使用独立模型: ${provider?.name || fileProviderId}`)
        } else {
          const mainProvider = aiConfig.providers.find(p => p.id === aiConfig.currentProviderId)
          console.log(`[Preprocessor] 使用主模型: ${mainProvider?.name || aiConfig.currentProviderId}`)
        }
      }
      
      const parallelFiles = config?.parallelFiles ?? true
      const maxConcurrency = config?.maxConcurrency || 3
      
      if (parallelFiles && fileMessages.length > 1) {
        // 并行处理
        for (let i = 0; i < fileMessages.length; i += maxConcurrency) {
          const batch = fileMessages.slice(i, i + maxConcurrency)
          const results = await Promise.all(
            batch.map(fileMsg => processFile(fileMsg, userInput, aiConfig, abortSignal, fileProviderId))
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
          const result = await processFile(fileMsg, userInput, aiConfig, abortSignal, fileProviderId)
          if (result.success) {
            totalTokens += result.tokensUsed
          }
        }
      }
      
      if (verbose) {
        console.log(`[Preprocessor] 文件概括完成，tokens: ${totalTokens}`)
      }
    }
    
    // ========== 操作2：上下文概括 ==========
    // 选择 → 发送请求 → 替换区域
    const contextMessages = selectContextMessages(messages, true) // 只选择未处理的
    
    // 获取上下文概括使用的模型ID
    const contextProviderId = aiConfig.agentConfig?.preprocessor?.contextProcessor?.providerId
    
    if (contextMessages.length > 1) {
      if (verbose) {
        console.log(`[Preprocessor] 操作2：概括 ${contextMessages.length} 条上下文`)
        if (contextProviderId) {
          const provider = aiConfig.providers.find(p => p.id === contextProviderId)
          console.log(`[Preprocessor] 使用独立模型: ${provider?.name || contextProviderId}`)
        } else {
          const mainProvider = aiConfig.providers.find(p => p.id === aiConfig.currentProviderId)
          console.log(`[Preprocessor] 使用主模型: ${mainProvider?.name || aiConfig.currentProviderId}`)
        }
      }
      
      const result = await processContextRange(
        contextMessages,
        messages,
        userInput,
        aiConfig,
        abortSignal,
        contextProviderId
      )
      
      if (result.success) {
        totalTokens += result.tokensUsed
        
        if (verbose) {
          console.log(`[Preprocessor] 上下文概括完成，tokens: ${result.tokensUsed}`)
        }
      }
    }
    
    // 标记预处理完成
    workspace.workspace.preprocessed = true
    
    if (verbose) {
      console.log(`[Preprocessor] 预处理完成，总 tokens: ${totalTokens}`)
      console.log(`[Preprocessor] 最终消息数: ${messages.length}`)
    }
    
    return {
      success: true,
      tokensUsed: totalTokens
    }
    
  } catch (error: any) {
    console.error('[Preprocessor] 预处理失败:', error)
    
    return {
      success: false,
      tokensUsed: 0,
      error: error.message || '预处理失败'
    }
  }
}

// ============================================================
// 导出子模块
// ============================================================

export { processFile } from './file-processor'
export { processContextRange } from './context-processor'
export { 
  fileSummaryCacheManager,
  type FileSummaryCacheManager,
  type SummaryCacheResult 
} from './cache-manager'

