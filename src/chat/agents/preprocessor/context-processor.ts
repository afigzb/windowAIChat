/**
 * Context Processor - 上下文处理器
 */

import type { AIConfig } from '../../types'
import type { AgentContext, Message, ProcessResult } from '../types'
import { createAIService } from '../services/ai-service'
import { createMessage } from '../core/message-ops'
import { globalMessageCache } from '../core/global-message-cache'

// 配置常量

const CONFIG = {
  /** 触发概括的最小消息数 */
  MIN_MESSAGE_COUNT: 4,
  /** 触发概括的新增字符数阈值 */
  MIN_NEW_CHARS: 2000,
  /** 概括操作的估算token消耗 */
  ESTIMATED_TOKENS: 500,
  /** 默认缓存键 */
  DEFAULT_CACHE_KEY: 'default'
} as const

// 类型定义

interface SummarizeDecision {
  shouldSummarize: boolean
  reason: string
  cutIndex: number  // 概括截断点（概括覆盖到这个索引，不含）
  newMessages: Message[]  // 新增的消息
  previousSummaryText?: string  // 之前的概括文本
}

// 工具函数

/**
 * 获取或生成消息的唯一ID
 */
function getMessageId(message: Message, index: number): string {
  // 优先使用消息自带的ID
  if (message._meta.messageId) {
    return message._meta.messageId
  }
  // 如果没有ID，生成一个基于位置和内容的ID
  const contentHash = `${message.role}_${message.content.substring(0, 50)}_${message.content.length}`
  const id = `${index}_${contentHash}`
  // 保存到消息元数据中
  message._meta.messageId = id
  return id
}

/**
 * 计算消息的总字符数
 */
function calculateTotalChars(messages: Message[]): number {
  return messages.reduce((sum, msg) => sum + msg.content.length, 0)
}

/**
 * 标记消息为已处理
 */
function markAsProcessed(messages: Message[]): void {
  messages.forEach(m => { m._meta.processed = true })
}

// 核心业务逻辑 

/**
 * 判断是否需要进行概括
 */
function decideSummarization(
  messages: Message[], 
  cacheKey: string
): SummarizeDecision {
  // 规则1: 消息数量太少，跳过概括
  if (messages.length <= CONFIG.MIN_MESSAGE_COUNT) {
    return {
      shouldSummarize: false,
      reason: `消息数量(${messages.length})未达到阈值(${CONFIG.MIN_MESSAGE_COUNT})`,
      cutIndex: 0,
      newMessages: messages
    }
  }
  
  // 确保所有消息都有ID
  messages.forEach((msg, idx) => getMessageId(msg, idx))
  
  // 获取缓存中的概括信息
  const cachedSummary = globalMessageCache.getContextSummary(cacheKey)
  
  if (!cachedSummary) {
    // 首次概括：检查总字符数
    const totalChars = calculateTotalChars(messages)
    if (totalChars < CONFIG.MIN_NEW_CHARS) {
      return {
        shouldSummarize: false,
        reason: `首次概括但字符数(${totalChars})未达到阈值(${CONFIG.MIN_NEW_CHARS})`,
        cutIndex: 0,
        newMessages: messages
      }
    }
    
    // 首次概括：概括所有消息
    return {
      shouldSummarize: true,
      reason: `首次概括，消息数${messages.length}条，字符数${totalChars}`,
      cutIndex: messages.length,  // 截断点：所有消息都概括
      newMessages: messages,
      previousSummaryText: undefined
    }
  }
  
  // 非首次概括：找出新增消息
  // 获取最后一个已概括的消息ID
  const lastSummarizedIds = cachedSummary.summarizedMessageIds
  if (lastSummarizedIds.length === 0) {
    // 缓存异常，当作首次概括
    const totalChars = calculateTotalChars(messages)
    return {
      shouldSummarize: totalChars >= CONFIG.MIN_NEW_CHARS,
      reason: totalChars >= CONFIG.MIN_NEW_CHARS 
        ? `缓存异常，重新概括，字符数${totalChars}`
        : `缓存异常但字符数不足(${totalChars})`,
      cutIndex: totalChars >= CONFIG.MIN_NEW_CHARS ? messages.length : 0,
      newMessages: messages,
      previousSummaryText: undefined
    }
  }
  
  // 找到截断点：最后一个已概括消息的位置
  const lastSummarizedId = lastSummarizedIds[lastSummarizedIds.length - 1]
  let cutIndex = -1
  
  for (let i = messages.length - 1; i >= 0; i--) {
    if (getMessageId(messages[i], i) === lastSummarizedId) {
      cutIndex = i + 1  // 截断点是这个消息的下一个位置
      break
    }
  }
  
  // 如果找不到截断点，说明消息列表已经完全不同了，当作首次概括
  if (cutIndex < 0) {
    const totalChars = calculateTotalChars(messages)
    return {
      shouldSummarize: totalChars >= CONFIG.MIN_NEW_CHARS,
      reason: totalChars >= CONFIG.MIN_NEW_CHARS
        ? `找不到上次概括的位置，重新概括，字符数${totalChars}`
        : `找不到上次概括的位置但字符数不足(${totalChars})`,
      cutIndex: totalChars >= CONFIG.MIN_NEW_CHARS ? messages.length : 0,
      newMessages: messages,
      previousSummaryText: undefined
    }
  }
  
  // 提取新增消息
  const newMessages = messages.slice(cutIndex)
  
  if (newMessages.length === 0) {
    return {
      shouldSummarize: false,
      reason: '没有新增消息',
      cutIndex: cutIndex,
      newMessages: []
    }
  }
  
  // 检查新增消息数量
  if (newMessages.length <= CONFIG.MIN_MESSAGE_COUNT) {
    return {
      shouldSummarize: false,
      reason: `新增消息数(${newMessages.length})未达到阈值(${CONFIG.MIN_MESSAGE_COUNT})`,
      cutIndex: cutIndex,
      newMessages
    }
  }
  
  // 检查新增字符数
  const newChars = calculateTotalChars(newMessages)
  if (newChars < CONFIG.MIN_NEW_CHARS) {
    return {
      shouldSummarize: false,
      reason: `新增字符数(${newChars})未达到阈值(${CONFIG.MIN_NEW_CHARS})`,
      cutIndex: cutIndex,
      newMessages
    }
  }
  
  // 需要概括：旧概括 + 新消息 一起概括
  const previousSummaryText = cachedSummary.summaryMessage.content
  
  return {
    shouldSummarize: true,
    reason: `新增${newMessages.length}条消息，字符数${newChars}，与旧概括合并`,
    cutIndex: messages.length,  // 新的截断点：概括到最后
    newMessages,
    previousSummaryText
  }
}

/**
 * 概括消息列表
 * 
 * @param messages 要概括的消息列表
 * @param previousSummaryText 之前的概括文本（如果有）
 */
async function summarizeMessages(
  messages: Message[],
  aiConfig: AIConfig,
  previousSummaryText?: string,
  customProviderId?: string,
  abortSignal?: AbortSignal
): Promise<string> {
  const effectiveConfig = customProviderId 
    ? { ...aiConfig, currentProviderId: customProviderId }
    : aiConfig
  const aiService = createAIService(effectiveConfig)
  
  const customSystemPrompt = aiConfig.agentConfig?.preprocessor?.contextProcessor?.systemPrompt
  const defaultPrompt = `你是一个对话历史概括助手。请概括对话历史，保留关键信息。
# 概括要求
1. 提炼对话中的关键信息和结论
2. 保持时间顺序和逻辑连贯性
3. 压缩冗余信息，保持简洁
4. 如果有之前的概括，要将新旧内容整合为一个连贯的概括
# 输出格式
直接输出概括内容，不要添加额外说明。`
  
  const promptMessages: any[] = [
    {
      role: 'system',
      content: customSystemPrompt || defaultPrompt
    }
  ]
  
  // 如果有之前的概括，先添加
  if (previousSummaryText) {
    promptMessages.push({
      role: 'assistant',
      content: `[之前的对话概括]\n${previousSummaryText}`
    })
  }
  
  // 添加新消息（只保留真实对话，过滤掉概括类型的消息）
  const realMessages = messages.filter(m => m._meta.type !== 'context_summary')
  promptMessages.push(...realMessages.map(m => ({
    role: m.role,
    content: m.content
  })))
  
  const summary = await aiService.call(promptMessages, { abortSignal })
  return summary
}

/**
 * 替换消息数组中的指定范围
 */
function replaceMessages(
  allMessages: Message[],
  contextMessages: Message[],
  replacements: Message[]
): boolean {
  if (contextMessages.length === 0) return false
  
  const firstIndex = allMessages.indexOf(contextMessages[0])
  if (firstIndex < 0) return false
  
  // 替换指定范围的消息
  allMessages.splice(firstIndex, contextMessages.length, ...replacements)
  return true
}

//  概括处理 

/**
 * 执行概括处理
 */
async function performSummarization(
  contextMessages: Message[],
  allMessages: Message[],
  decision: SummarizeDecision,
  aiConfig: AIConfig,
  cacheKey: string,
  customProviderId?: string,
  abortSignal?: AbortSignal
): Promise<ProcessResult> {
  // 执行概括：旧概括文本 + 新消息 一起概括
  const summary = await summarizeMessages(
    decision.newMessages,
    aiConfig,
    decision.previousSummaryText,
    customProviderId,
    abortSignal
  )
  
  // 创建新的概括消息
  const summaryMessage = createMessage(
    'assistant',
    `[对话历史概括]\n\n${summary}`,
    'context_summary',
    false  // 概括消息不需要预处理
  )
  
  // 准备替换的消息列表
  // 如果cutIndex小于contextMessages.length，说明有剩余未概括的消息
  const remainingMessages = contextMessages.slice(decision.cutIndex)
  const replacements = remainingMessages.length > 0 
    ? [summaryMessage, ...remainingMessages]
    : [summaryMessage]
  
  // 更新缓存：记录所有已概括的消息ID
  const summarizedMessages = contextMessages.slice(0, decision.cutIndex)
  const newSummarizedIds = summarizedMessages.map((msg, idx) => getMessageId(msg, idx))
  
  globalMessageCache.setContextSummary(cacheKey, {
    summaryMessage,
    summarizedMessageIds: newSummarizedIds,  // 只记录已概括的消息ID
    totalChars: calculateTotalChars(summarizedMessages),
    createdAt: Date.now(),
    updatedAt: Date.now()
  })
  
  // 替换消息：用概括+剩余消息替换所有context消息
  replaceMessages(allMessages, contextMessages, replacements)
  
  return { success: true, tokensUsed: CONFIG.ESTIMATED_TOKENS }
}

//  主函数 

/**
 * 处理上下文消息区域
 */
export async function processContextRange(
  contextMessages: Message[],
  allMessages: Message[],
  context: AgentContext,
  abortSignal?: AbortSignal,
  customProviderId?: string,
  cacheKey: string = CONFIG.DEFAULT_CACHE_KEY
): Promise<ProcessResult> {
  // 从 context 中提取需要的数据
  const userInput = context.input.userInput
  const aiConfig = context.input.aiConfig
  // 空消息直接返回
  if (contextMessages.length === 0) {
    return { success: true, tokensUsed: 0 }
  }
  
  try {
    // 1. 判断是否需要概括
    const decision = decideSummarization(contextMessages, cacheKey)
    
    if (!decision.shouldSummarize) {
      // 不需要概括
      const cachedSummary = globalMessageCache.getContextSummary(cacheKey)
      
      if (cachedSummary && decision.newMessages.length > 0) {
        // 有旧概括，且有新消息（但不足以触发概括）
        // 替换为：旧概括 + 新消息
        replaceMessages(allMessages, contextMessages, [
          cachedSummary.summaryMessage,
          ...decision.newMessages
        ])
      } else {
        // 完全不需要概括：标记为已处理，保留所有消息
        markAsProcessed(contextMessages)
      }
      
      return { success: true, tokensUsed: 0 }
    }
    
    // 2. 需要概括：执行概括处理
    return await performSummarization(
      contextMessages,
      allMessages,
      decision,
      aiConfig,
      cacheKey,
      customProviderId,
      abortSignal
    )
  } catch (error: any) {
    // 失败时保留原内容，标记为已处理
    markAsProcessed(contextMessages)
    return { success: false, tokensUsed: 0 }
  }
}
