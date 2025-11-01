/**
 * Preprocessor - 预处理器（统一架构版）
 * 
 * 核心模式：选择消息 → 发送请求 → 写入结果
 * 
 * 两个主要操作：
 * 1. 文件概括：选择 type === 'file' 的消息 → 发送概括请求 → 替换原消息的 content
 * 2. 上下文概括：选择 type === 'context' 的连续消息 → 发送概括请求 → 用一条 'context_summary' 替换
 */

import type { AIConfig } from '../types'
import type { WorkspaceData, Message } from './workspace-data'
import { createAIService } from './ai-service'
import {
  selectFileMessages,
  selectContextMessages,
  replaceContent,
  replaceRange,
  createMessage,
  findMessageIndex,
  selectForSending
} from './message-ops'
import { fileSummaryCacheManager } from './gaikuo/file-summary-cache'

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
// 操作1：文件概括
// ============================================================

/**
 * 处理单个文件消息
 * 
 * 模式：读取文件消息 → 检查缓存 → 发送概括请求（如需要） → 保存缓存 → 替换原消息内容（保留文件标识）
 * 
 * 缓存策略：手动管理，只要缓存存在就使用，不自动失效
 * 路径处理：从 <!PATH:...!> 标记中提取完整路径用于缓存，最终消息中只保留文件名
 */
async function processFile(
  fileMessage: Message,
  userInput: string,
  aiConfig: AIConfig,
  abortSignal?: AbortSignal
): Promise<{ success: boolean; tokensUsed: number }> {
  try {
    // 提取完整路径（从特殊标记中）和文件名
    const pathMarkMatch = fileMessage.content.match(/<!PATH:(.+?)!>/);
    const fullPath = pathMarkMatch ? pathMarkMatch[1] : null
    
    // 提取文件名（从文件头中）
    const fileNameMatch = fileMessage.content.match(/---\s*文件:\s*(.+?)\s*(?:<!PATH:.*?!>)?\s*---/);
    const fileName = fileNameMatch ? fileNameMatch[1].trim() : null
    
    // 提取实际文件内容（去掉文件标识，包括路径标记）
    let actualContent = fileMessage.content
    if (fileName) {
      // 去掉文件头和文件尾标识（包括 <!PATH:...!> 标记）
      actualContent = fileMessage.content
        .replace(/---\s*文件:.*?---\s*/g, '')
        .replace(/---\s*文件结束\s*---/g, '')
        .trim()
    }
    
    // 检查文件大小：小于1000字符的文件采用放行原则，不概括
    if (actualContent.length < 1000) {
      console.log('[Preprocessor] 文件内容小于1000字符，跳过概括:', fileName || '未命名', `(${actualContent.length}字符)`)
      fileMessage._meta.processed = true
      
      // 移除路径标记，只保留文件名
      if (fileName) {
        const finalContent = `\n\n--- 文件: ${fileName} ---\n${actualContent}\n--- 文件结束 ---`
        replaceContent(fileMessage, finalContent, false)
      }
      
      return {
        success: true,
        tokensUsed: 0
      }
    }
    
    // ========== 尝试从缓存读取概括（使用完整路径） ==========
    let summary: string | null = null
    
    if (fullPath) {
      const cachedSummary = await fileSummaryCacheManager.readCache(fullPath)
      
      if (cachedSummary) {
        console.log('[Preprocessor] 使用缓存的文件概括:', fileName || fullPath)
        summary = cachedSummary.content
        
        // 使用文件名（不含路径标记）更新消息内容
        const finalContent = `\n\n--- 文件: ${fileName} ---\n${summary}\n--- 文件结束 ---`
        replaceContent(fileMessage, finalContent, true)
        
        console.log('[Preprocessor] 文件概括完成（从缓存）:', fileName || fullPath)
        
        return {
          success: true,
          tokensUsed: 0 // 使用缓存不消耗 tokens
        }
      } else {
        console.log('[Preprocessor] 缓存未找到或已失效，将重新概括:', fileName || fullPath)
      }
    }
    
    // ========== 缓存未命中，执行概括 ==========
    const aiService = createAIService(aiConfig)
    
    // 构建概括请求消息
    const promptMessages = [
      {
        role: 'system',
        content: `你是一个专业的内容分析助手。请分析下面的文件内容，提炼关键信息。

# 用户的需求
${userInput}

# 分析要求
1. 识别文件类型和主要内容
2. 提炼与用户需求相关的关键信息
3. 保留重要细节，去除冗余内容
4. 输出简洁清晰的概括，便于后续处理

# 输出格式
直接输出概括内容，不要添加额外说明。`
      },
      {
        role: 'user',
        content: actualContent
      }
    ]
    
    // 发送请求
    summary = await aiService.call(
      promptMessages,
      { abortSignal }
    )
    
    // ========== 保存概括到缓存（使用完整路径） ==========
    if (fullPath && summary) {
      await fileSummaryCacheManager.writeCache(fullPath, summary)
    }
    
    // 写入：替换原消息内容，使用文件名（不含路径标记）
    let finalContent = summary
    if (fileName) {
      finalContent = `\n\n--- 文件: ${fileName} ---\n${summary}\n--- 文件结束 ---`
    }
    
    replaceContent(fileMessage, finalContent, true)
    
    console.log('[Preprocessor] 文件概括完成（新生成）:', fileName || '未命名')
    
    return {
      success: true,
      tokensUsed: 500 // 估算
    }
  } catch (error: any) {
    console.error('[Preprocessor] 文件概括失败:', error)
    
    // 失败时保留原内容，但标记为已处理
    fileMessage._meta.processed = true
    
    return {
      success: false,
      tokensUsed: 0
    }
  }
}

// ============================================================
// 操作2：上下文概括（简化版）
// ============================================================

/**
 * 计算消息的总字符数
 */
function calculateTotalChars(messages: Message[]): number {
  return messages.reduce((sum, msg) => sum + msg.content.length, 0)
}

/**
 * 处理上下文消息区域（简化版）
 * 
 * 简化概括规则：
 * 1. 如果总字符数小于2000，跳过概括
 * 2. 如果消息数量少于等于4条，跳过概括
 * 3. 否则，概括除最新4条之外的所有消息
 * 
 * 模式：读取需要概括的上下文消息 → 以原有格式发送概括请求 → 用一条概括消息替换区域
 */
async function processContextRange(
  contextMessages: Message[],
  allMessages: Message[],
  userInput: string,
  aiConfig: AIConfig,
  abortSignal?: AbortSignal
): Promise<{ success: boolean; tokensUsed: number }> {
  if (contextMessages.length === 0) {
    return { success: true, tokensUsed: 0 }
  }
  
  try {
    // 1. 计算当前所有上下文消息的总字符数
    const currentTotalChars = calculateTotalChars(contextMessages)
    
    console.log('[Preprocessor] 上下文概括检查:', {
      messageCount: contextMessages.length,
      totalChars: currentTotalChars,
      threshold: 2000
    })
    
    // 2. 检查是否需要概括：小于2000字符则跳过
    if (currentTotalChars < 2000) {
      console.log('[Preprocessor] 上下文字符数小于2000，跳过概括')
      // 标记为已处理但不概括
      contextMessages.forEach(m => {
        m._meta.processed = true
      })
      return { success: true, tokensUsed: 0 }
    }
    
    // 3. 检查消息数量：少于等于4条则跳过
    const keepRecentCount = 4  // 保留最新的4条消息不概括
    
    if (contextMessages.length <= keepRecentCount) {
      console.log('[Preprocessor] 上下文消息数量不超过4条，跳过概括')
      contextMessages.forEach(m => {
        m._meta.processed = true
      })
      return { success: true, tokensUsed: 0 }
    }
    
    // 4. 选择需要概括的消息（排除最新的4条）
    const messagesToSummarize = contextMessages.slice(0, -keepRecentCount)
    const recentMessages = contextMessages.slice(-keepRecentCount)
    
    console.log('[Preprocessor] 上下文概括策略:', {
      总消息数: contextMessages.length,
      需要概括: messagesToSummarize.length,
      保留最新: recentMessages.length
    })
    
    // 5. 执行概括
    const aiService = createAIService(aiConfig)
    
    // 构建概括请求消息：维持原有对话格式
    const promptMessages = [
      {
        role: 'system',
        content: `你是一个对话历史概括助手。请概括下面的对话历史，保留关键信息。

# 用户的当前需求
${userInput}

# 概括要求
1. 提炼对话中的关键信息和结论
2. 重点保留与当前需求相关的内容
3. 压缩冗余信息，保持简洁
4. 输出一个连贯的概括（200-300字）

# 输出格式
直接输出概括内容，不要添加额外说明。`
      },
      // 保持原有的对话结构
      ...messagesToSummarize.map(m => ({
        role: m.role,
        content: m.content
      })),
      {
        role: 'user',
        content: '请基于上面的对话历史生成概括。'
      }
    ]
    
    // 发送请求
    const summary = await aiService.call(
      promptMessages,
      { abortSignal }
    )
    
    // 6. 写入：找到第一条需要概括的消息的位置，替换为概括消息
    const firstIndex = findMessageIndex(allMessages, messagesToSummarize[0])
    if (firstIndex >= 0) {
      const summaryMessage = createMessage(
        'assistant',
        `[对话历史概括]\n\n${summary}`,
        'context_summary',
        false
      )
      
      // 替换需要概括的消息
      replaceRange(allMessages, firstIndex, messagesToSummarize.length, summaryMessage)
      
      // 标记保留的消息为已处理
      recentMessages.forEach(m => {
        m._meta.processed = true
      })
      
      console.log('[Preprocessor] 上下文概括完成，原 %d 条消息已合并为 1 条（保留最新 %d 条）', 
        messagesToSummarize.length, recentMessages.length)
    }
    
    return {
      success: true,
      tokensUsed: 500 // 估算
    }
  } catch (error: any) {
    console.error('[Preprocessor] 上下文概括失败:', error)
    
    // 失败时标记所有消息为已处理，但保留原内容
    contextMessages.forEach(m => {
      m._meta.processed = true
    })
    
    return {
      success: false,
      tokensUsed: 0
    }
  }
}

// ============================================================
// 预处理器主函数
// ============================================================

/**
 * 执行预处理阶段（统一架构版）
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
    
    if (fileMessages.length > 0) {
      if (verbose) {
        console.log(`[Preprocessor] 操作1：概括 ${fileMessages.length} 个文件`)
      }
      
      const parallelFiles = config?.parallelFiles ?? true
      const maxConcurrency = config?.maxConcurrency || 3
      
      if (parallelFiles && fileMessages.length > 1) {
        // 并行处理
        for (let i = 0; i < fileMessages.length; i += maxConcurrency) {
          const batch = fileMessages.slice(i, i + maxConcurrency)
          const results = await Promise.all(
            batch.map(fileMsg => processFile(fileMsg, userInput, aiConfig, abortSignal))
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
          const result = await processFile(fileMsg, userInput, aiConfig, abortSignal)
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
    
    if (contextMessages.length > 1) {
      if (verbose) {
        console.log(`[Preprocessor] 操作2：概括 ${contextMessages.length} 条上下文`)
      }
      
      const result = await processContextRange(
        contextMessages,
        messages,
        userInput,
        aiConfig,
        abortSignal
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
