/**
 * Context Processor - 上下文处理器
 */

import type { AIConfig } from '../../types'
import type { Message } from '../core/workspace-data'
import { createAIService } from '../services/ai-service'
import { createMessage, findMessageIndex } from '../core/message-ops'
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
  newMessages?: Message[]
  previousSummary?: Message
}

// 工具函数

/**
 * 计算消息的总字符数
 */
function calculateTotalChars(messages: Message[]): number {
  return messages.reduce((sum, msg) => sum + msg.content.length, 0)
}

/**
 * 生成消息唯一标识符（基于内容和角色）
 */
function generateMessageId(message: Message): string {
  const prefix = message.content.substring(0, 100)
  return `${message.role}_${prefix}_${message.content.length}`
}

/**
 * 生成消息ID列表
 */
function generateMessageIds(messages: Message[]): string[] {
  return messages.map(generateMessageId)
}

/**
 * 标记消息为已处理
 */
function markAsProcessed(messages: Message[]): void {
  messages.forEach(m => { m._meta.processed = true })
}

/**
 * 查找新增的消息（不在已概括ID列表中的消息）
 */
function findNewMessages(
  messages: Message[],
  summarizedIds: string[]
): { newMessages: Message[]; newStartIndex: number } {
  const idSet = new Set(summarizedIds)
  const newMessages: Message[] = []
  let newStartIndex = -1
  
  for (let i = 0; i < messages.length; i++) {
    const msgId = generateMessageId(messages[i])
    if (!idSet.has(msgId)) {
      if (newStartIndex === -1) {
        newStartIndex = i
      }
      newMessages.push(messages[i])
    }
  }
  
  return { newMessages, newStartIndex }
}

// 核心业务逻辑 

/**
 * 判断是否需要进行概括
 * 新逻辑：累计超过MIN_MESSAGE_COUNT条消息 且 新增字符数达到MIN_NEW_CHARS时触发
 */
function decideSummarization(
  messages: Message[], 
  cacheKey: string
): SummarizeDecision {
  // 规则1: 消息数量太少，跳过概括
  if (messages.length <= CONFIG.MIN_MESSAGE_COUNT) {
    return {
      shouldSummarize: false,
      reason: `消息数量(${messages.length})未达到阈值(${CONFIG.MIN_MESSAGE_COUNT})`
    }
  }
  
  // 获取缓存中的概括信息
  const cachedSummary = globalMessageCache.getContextSummary(cacheKey)
  
  if (!cachedSummary) {
    // 首次概括：检查总字符数
    const totalChars = calculateTotalChars(messages)
    if (totalChars < CONFIG.MIN_NEW_CHARS) {
      return {
        shouldSummarize: false,
        reason: `首次概括但字符数(${totalChars})未达到阈值(${CONFIG.MIN_NEW_CHARS})`
      }
    }
    
    return {
      shouldSummarize: true,
      reason: `首次概括，消息数${messages.length}条，字符数${totalChars}`,
      newMessages: messages,
      previousSummary: undefined
    }
  }
  
  // 非首次概括：找出新增消息
  const { newMessages } = findNewMessages(messages, cachedSummary.summarizedMessageIds)
  
  if (newMessages.length === 0) {
    return {
      shouldSummarize: false,
      reason: '没有新增消息',
      newMessages: []
    }
  }
  
  // 检查新增消息数量
  if (newMessages.length <= CONFIG.MIN_MESSAGE_COUNT) {
    return {
      shouldSummarize: false,
      reason: `新增消息数(${newMessages.length})未达到阈值(${CONFIG.MIN_MESSAGE_COUNT})`,
      newMessages
    }
  }
  
  // 检查新增字符数
  const newChars = calculateTotalChars(newMessages)
  if (newChars < CONFIG.MIN_NEW_CHARS) {
    return {
      shouldSummarize: false,
      reason: `新增字符数(${newChars})未达到阈值(${CONFIG.MIN_NEW_CHARS})`,
      newMessages
    }
  }
  
  return {
    shouldSummarize: true,
    reason: `新增${newMessages.length}条消息，字符数${newChars}，需要与旧概括合并`,
    newMessages,
    previousSummary: cachedSummary.summaryMessage
  }
}

/**
 * 概括消息列表
 */
async function summarizeMessages(
  messages: Message[],
  aiConfig: AIConfig,
  previousSummary?: Message,
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
  if (previousSummary) {
    promptMessages.push({
      role: 'assistant',
      content: `[之前的对话概括]\n${previousSummary.content}`
    })
  }
  
  // 添加新消息（过滤掉概括消息，只保留真实对话）
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
  const firstIndex = findMessageIndex(allMessages, contextMessages[0])
  if (firstIndex < 0) return false
  
  allMessages.splice(firstIndex, contextMessages.length, ...replacements)
  return true
}

//  概括处理 

/**
 * 执行概括处理
 * 新逻辑：旧概括（如果有）+ 所有新消息 一起概括成一条新概括
 */
async function performSummarization(
  contextMessages: Message[],
  allMessages: Message[],
  newMessages: Message[],
  previousSummary: Message | undefined,
  aiConfig: AIConfig,
  cacheKey: string,
  customProviderId?: string,
  abortSignal?: AbortSignal
): Promise<{ success: boolean; tokensUsed: number }> {
  // 执行概括：旧概括 + 新消息 一起概括
  const summary = await summarizeMessages(
    newMessages,
    aiConfig,
    previousSummary,
    customProviderId,
    abortSignal
  )
  
  // 创建新的概括消息
  const summaryMessage = createMessage(
    'assistant',
    `[对话历史概括]\n\n${summary}`,
    'context_summary',
    false
  )
  
  // 保存到缓存
  const allSummarizedMessages = newMessages
  const messageIds = generateMessageIds(allSummarizedMessages)
  const totalChars = calculateTotalChars(allSummarizedMessages)
  
  // 如果有之前的概括，需要合并之前的统计信息
  const cachedSummary = globalMessageCache.getContextSummary(cacheKey)
  const previousIds = cachedSummary?.summarizedMessageIds || []
  const previousChars = cachedSummary?.totalChars || 0
  
  globalMessageCache.setContextSummary(cacheKey, {
    summaryMessage,
    summarizedMessageIds: [...previousIds, ...messageIds],
    totalChars: previousChars + totalChars,
    createdAt: cachedSummary?.createdAt || Date.now(),
    updatedAt: Date.now()
  })
  
  // 替换消息：所有context消息都替换成一条概括
  replaceMessages(allMessages, contextMessages, [summaryMessage])
  
  return { success: true, tokensUsed: CONFIG.ESTIMATED_TOKENS }
}

//  主函数 

/**
 * 处理上下文消息区域
 * 新逻辑：累计>4条消息且新增2k字时，将旧概括+所有新消息一起概括成新概括
 */
export async function processContextRange(
  contextMessages: Message[],
  allMessages: Message[],
  userInput: string,
  aiConfig: AIConfig,
  abortSignal?: AbortSignal,
  customProviderId?: string,
  cacheKey: string = CONFIG.DEFAULT_CACHE_KEY
): Promise<{ success: boolean; tokensUsed: number }> {
  // 空消息直接返回
  if (contextMessages.length === 0) {
    return { success: true, tokensUsed: 0 }
  }
  
  try {
    // 判断是否需要概括
    const decision = decideSummarization(contextMessages, cacheKey)
    
    if (!decision.shouldSummarize) {
      // 不需要概括的情况
      const cachedSummary = globalMessageCache.getContextSummary(cacheKey)
      
      if (cachedSummary && decision.newMessages && decision.newMessages.length > 0) {
        // 有旧概括，但新消息不足以触发概括：保留旧概括 + 新消息
        replaceMessages(allMessages, contextMessages, [
          cachedSummary.summaryMessage,
          ...decision.newMessages
        ])
      } else {
        // 完全不需要概括：保留所有消息
        markAsProcessed(contextMessages)
      }
      
      return { success: true, tokensUsed: 0 }
    }
    
    // 需要概括：执行概括处理
    return await performSummarization(
      contextMessages,
      allMessages,
      decision.newMessages!,
      decision.previousSummary,
      aiConfig,
      cacheKey,
      customProviderId,
      abortSignal
    )
  } catch (error: any) {
    // 失败时保留原内容
    markAsProcessed(contextMessages)
    return { success: false, tokensUsed: 0 }
  }
}
