/**
 * Context Processor - 上下文处理器
 * 
 * 职责：处理对话历史的概括
 * 模式：读取需要概括的上下文消息 → 发送概括请求 → 用一条概括消息替换区域
 */

import type { AIConfig } from '../../types'
import type { Message } from '../core/workspace-data'
import { createAIService } from '../services/ai-service'
import { replaceRange, createMessage, findMessageIndex } from '../core/message-ops'

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
 */
export async function processContextRange(
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
    
    console.log('[ContextProcessor] 上下文概括检查:', {
      messageCount: contextMessages.length,
      totalChars: currentTotalChars,
      threshold: 2000
    })
    
    // 2. 检查是否需要概括：小于2000字符则跳过
    if (currentTotalChars < 2000) {
      console.log('[ContextProcessor] 上下文字符数小于2000，跳过概括')
      // 标记为已处理但不概括
      contextMessages.forEach(m => {
        m._meta.processed = true
      })
      return { success: true, tokensUsed: 0 }
    }
    
    // 3. 检查消息数量：少于等于4条则跳过
    const keepRecentCount = 4  // 保留最新的4条消息不概括
    
    if (contextMessages.length <= keepRecentCount) {
      console.log('[ContextProcessor] 上下文消息数量不超过4条，跳过概括')
      contextMessages.forEach(m => {
        m._meta.processed = true
      })
      return { success: true, tokensUsed: 0 }
    }
    
    // 4. 选择需要概括的消息（排除最新的4条）
    const messagesToSummarize = contextMessages.slice(0, -keepRecentCount)
    const recentMessages = contextMessages.slice(-keepRecentCount)
    
    console.log('[ContextProcessor] 上下文概括策略:', {
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
      
      console.log('[ContextProcessor] 上下文概括完成，原 %d 条消息已合并为 1 条（保留最新 %d 条）', 
        messagesToSummarize.length, recentMessages.length)
    }
    
    return {
      success: true,
      tokensUsed: 500 // 估算
    }
  } catch (error: any) {
    console.error('[ContextProcessor] 上下文概括失败:', error)
    
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

