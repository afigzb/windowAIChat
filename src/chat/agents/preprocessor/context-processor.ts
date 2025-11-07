/**
 * Context Processor - 上下文处理器（滑动窗口版 + 乐观渲染）
 * 
 * 策略：
 * 1. 保留最新8条消息（包括概括消息）
 * 2. 超过8条时，通过概括压缩历史，使总数回到8条以内
 * 3. 通过messageId匹配，检测用户是否切换了对话分支
 * 
 * 性能优化（乐观渲染）：
 * - 有旧概括时：立即返回旧概括，后台异步更新（不阻塞）
 * - 无旧概括时：首次必须等待概括完成（阻塞）
 * - 下次请求时立即享受到后台概括的成果
 */

import type { AIConfig } from '../../types'
import type { AgentContext, Message, ProcessResult } from '../types'
import { createAIService } from '../services/ai-service'
import { createMessage } from '../core/message-ops'
import { globalMessageCache } from '../core/global-message-cache'

//  配置常量 

const CONFIG = {
  /** 滑动窗口大小：期望保留的总消息数（含概括） */
  WINDOW_SIZE: 8,
  /** 保护窗口大小：不参与概括的最新消息数 */
  PROTECTED_SIZE: 4,
  /** 概括操作的估算token消耗 */
  ESTIMATED_TOKENS: 500,
  /** 默认缓存键 */
  DEFAULT_CACHE_KEY: 'default'
} as const

//  工具函数 

/**
 * 获取消息的唯一ID
 * 优先使用外部提供的稳定ID（来自FlatMessage）
 */
function getMessageId(message: Message): string {
  if (!message._meta.messageId) {
    throw new Error('[ContextProcessor] 消息缺少messageId，无法进行上下文处理')
  }
  return message._meta.messageId
}

/**
 * 为消息列表生成ID列表
 */
function generateMessageIds(messages: Message[]): string[] {
  return messages.map(msg => getMessageId(msg))
}

/**
 * 检查两个数组是否完全相等
 */
function isArrayEqual(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) {
    return false
  }
  
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false
    }
  }
  
  return true
}

/**
 * 标记消息为已处理
 */
function markAsProcessed(messages: Message[]): void {
  messages.forEach(m => { m._meta.processed = true })
}

//  概括逻辑 

/**
 * 调用AI执行概括
 */
async function callAiForSummary(
  messages: Message[],
  aiConfig: AIConfig,
  previousSummary?: string,
  customProviderId?: string,
  abortSignal?: AbortSignal
): Promise<string> {
  const effectiveConfig = customProviderId 
    ? { ...aiConfig, currentProviderId: customProviderId }
    : aiConfig
  
  const aiService = createAIService(effectiveConfig)
  
  // 获取自定义提示词或使用默认
  const customPrompt = aiConfig.agentConfig?.preprocessor?.contextProcessor?.systemPrompt
  const defaultPrompt = `你是对话历史概括助手。请简洁地概括对话内容，保留关键信息和结论。
# 要求
1. 保持时间顺序和逻辑连贯
2. 压缩冗余，突出重点
3. 如有旧概括，整合新旧内容为连贯概括
# 输出
直接输出概括内容，无需额外说明。`
  
  const promptMessages: any[] = [
    {
      role: 'system',
      content: customPrompt || defaultPrompt
    }
  ]
  
  // 如果有旧概括，先添加
  if (previousSummary) {
    promptMessages.push({
      role: 'assistant',
      content: `[之前的概括]\n${previousSummary}`
    })
  }
  
  // 添加要概括的消息（过滤掉概括类型的消息）
  const realMessages = messages.filter(m => m._meta.type !== 'context_summary')
  promptMessages.push(...realMessages.map(m => ({
    role: m.role,
    content: m.content
  })))
  
  return await aiService.call(promptMessages, { abortSignal })
}

/**
 * 创建概括消息并更新缓存
 */
function createSummaryAndCache(
  summaryText: string,
  allSummarizedMessages: Message[],
  cacheKey: string
): Message {
  const summaryMessage = createMessage(
    'assistant',
    `[对话历史概括]\n\n${summaryText}`,
    'context_summary',
    false
  )
  
  // 生成所有已概括消息的ID列表
  const allSummarizedIds = generateMessageIds(allSummarizedMessages)
  
  // 更新缓存
  globalMessageCache.setContextSummary(cacheKey, {
    summaryMessage,
    summarizedMessageIds: allSummarizedIds,
    totalChars: allSummarizedMessages.reduce((sum, m) => sum + m.content.length, 0),
    createdAt: Date.now(),
    updatedAt: Date.now()
  })
  
  return summaryMessage
}

//  缓存状态管理 

/**
 * 缓存状态
 */
interface CacheState {
  /** 已概括的消息数量 */
  summarizedCount: number
  /** 概括消息对象 */
  summaryMessage?: Message
  /** 概括文本内容 */
  summaryText?: string
}

/**
 * 检查并获取有效的缓存状态
 * 
 * 策略：只验证已概括部分的ID是否匹配
 * - 已概括部分ID匹配 → 缓存有效（未概括部分的修改不影响）
 * - 已概括部分ID不匹配 → 缓存失效（分支切换或历史修改）
 */
function validateCache(
  cacheKey: string,
  currentIds: string[]
): CacheState {
  const cachedSummary = globalMessageCache.getContextSummary(cacheKey)
  
  if (!cachedSummary) {
    return { summarizedCount: 0 }
  }
  
  const summarizedIds = cachedSummary.summarizedMessageIds
  const summarizedCount = summarizedIds.length
  
  // 检查当前消息数是否足够覆盖已概括的部分
  if (currentIds.length < summarizedCount) {
    // 当前消息比已概括的少，说明历史被删除了，缓存失效
    globalMessageCache.deleteContextSummary(cacheKey)
    pendingSummaries.delete(cacheKey)
    return { summarizedCount: 0 }
  }
  
  // 只比较已概括部分的ID（前N条）
  const currentSummarizedIds = currentIds.slice(0, summarizedCount)
  const isMatch = isArrayEqual(summarizedIds, currentSummarizedIds)
  
  if (!isMatch) {
    // 已概括部分ID不匹配，缓存失效
    globalMessageCache.deleteContextSummary(cacheKey)
    pendingSummaries.delete(cacheKey)
    return { summarizedCount: 0 }
  }
  
  // 缓存有效，返回状态
  return {
    summarizedCount,
    summaryMessage: cachedSummary.summaryMessage,
    summaryText: cachedSummary.summaryMessage.content.replace(/^\[对话历史概括\]\n\n/, '')
  }
}

//  消息替换操作 

/**
 * 在完整消息列表中替换指定范围的消息
 */
function replaceMessagesInContext(
  allMessages: Message[],
  originalMessages: Message[],
  replacements: Message[]
): void {
  const firstIndex = allMessages.indexOf(originalMessages[0])
  if (firstIndex >= 0) {
    allMessages.splice(firstIndex, originalMessages.length, ...replacements)
  }
}

/**
 * 应用概括到消息列表（概括 + 未概括的新消息）
 */
function applyOptimisticSummary(
  allMessages: Message[],
  contextMessages: Message[],
  summaryMessage: Message,
  summarizedCount: number
): void {
  const newMessages = contextMessages.slice(summarizedCount)
  replaceMessagesInContext(allMessages, contextMessages, [summaryMessage, ...newMessages])
}

// 后台概括任务

/**
 * 后台任务队列（避免重复触发）
 */
const pendingSummaries = new Map<string, Promise<void>>()

/**
 * 验证后台任务是否应该写入缓存
 * 
 * 策略：只验证已概括部分的ID是否匹配（与 validateCache 保持一致）
 */
function shouldCommitBackgroundSummary(
  cacheKey: string,
  expectedMessageIds: string[]
): boolean {
  const cachedSummary = globalMessageCache.getContextSummary(cacheKey)
  
  if (!cachedSummary) {
    return false // 缓存被删除，说明对话已切换
  }
  
  const summarizedIds = cachedSummary.summarizedMessageIds
  const summarizedCount = summarizedIds.length
  
  // 检查预期的消息ID数量是否足够
  if (expectedMessageIds.length < summarizedCount) {
    return false
  }
  
  // 只比较已概括部分的ID
  const expectedSummarizedIds = expectedMessageIds.slice(0, summarizedCount)
  return isArrayEqual(summarizedIds, expectedSummarizedIds)
}

/**
 * 后台异步执行概括（不阻塞主流程）
 */
function triggerBackgroundSummary(
  contextMessages: Message[],
  aiConfig: AIConfig,
  cacheState: CacheState,
  expectedMessageIds: string[],
  cacheKey: string,
  customProviderId?: string
): void {
  // 避免重复触发相同任务
  if (pendingSummaries.has(cacheKey)) {
    return
  }
  
  const promise = (async () => {
    try {
      const needSummarizeCount = contextMessages.length - CONFIG.PROTECTED_SIZE
      
      // 已概括数量足够，无需更新
      if (needSummarizeCount <= cacheState.summarizedCount) {
        return
      }
      
      // 只概括新增部分
      const newMessagesToSummarize = contextMessages.slice(
        cacheState.summarizedCount,
        needSummarizeCount
      )
      
      const summaryText = await callAiForSummary(
        newMessagesToSummarize,
        aiConfig,
        cacheState.summaryText,
        customProviderId
        // 注意：后台任务不传 abortSignal，避免被意外取消
      )
      
      // 概括完成后验证：确保对话未切换
      if (!shouldCommitBackgroundSummary(cacheKey, expectedMessageIds)) {
        return
      }
      
      // 创建并缓存新概括
      const allSummarizedMessages = contextMessages.slice(0, needSummarizeCount)
      createSummaryAndCache(summaryText, allSummarizedMessages, cacheKey)
      
    } catch (error: any) {
      console.warn(`[ContextProcessor] 后台概括失败: ${error.message}`)
    } finally {
      pendingSummaries.delete(cacheKey)
    }
  })()
  
  pendingSummaries.set(cacheKey, promise)
}

//  主处理流程 

/**
 * 处理情况1：消息未超过窗口大小
 */
function handleWithinWindow(
  allMessages: Message[],
  contextMessages: Message[],
  cacheState: CacheState
): ProcessResult {
  if (cacheState.summaryMessage) {
    // 有旧概括：用概括替换已概括的消息
    applyOptimisticSummary(
      allMessages,
      contextMessages,
      cacheState.summaryMessage,
      cacheState.summarizedCount
    )
  } else {
    // 无概括：保留所有原始消息
    markAsProcessed(contextMessages)
  }
  
  return { success: true, tokensUsed: 0 }
}

/**
 * 处理情况2：超过窗口，有旧概括（乐观渲染）
 */
function handleOptimisticRender(
  allMessages: Message[],
  contextMessages: Message[],
  cacheState: CacheState,
  aiConfig: AIConfig,
  currentIds: string[],
  cacheKey: string,
  customProviderId?: string
): ProcessResult {
  // 立即使用旧概括返回（不阻塞）
  applyOptimisticSummary(
    allMessages,
    contextMessages,
    cacheState.summaryMessage!,
    cacheState.summarizedCount
  )
  
  // 检查是否需要后台更新
  const needSummarizeCount = contextMessages.length - CONFIG.PROTECTED_SIZE
  if (needSummarizeCount > cacheState.summarizedCount) {
    triggerBackgroundSummary(
      contextMessages,
      aiConfig,
      cacheState,
      currentIds,
      cacheKey,
      customProviderId
    )
  }
  
  return { success: true, tokensUsed: 0 }
}

/**
 * 处理情况3：首次概括，无旧概括（必须等待）
 */
async function handleFirstTimeSummary(
  allMessages: Message[],
  contextMessages: Message[],
  cacheState: CacheState,
  aiConfig: AIConfig,
  cacheKey: string,
  customProviderId?: string,
  abortSignal?: AbortSignal
): Promise<ProcessResult> {
  const needSummarizeCount = contextMessages.length - CONFIG.PROTECTED_SIZE
  
  // 只概括新增部分
  const newMessagesToSummarize = contextMessages.slice(
    cacheState.summarizedCount,
    needSummarizeCount
  )
  
  // 调用AI概括（会整合旧概括）
  const summaryText = await callAiForSummary(
    newMessagesToSummarize,
    aiConfig,
    cacheState.summaryText,
    customProviderId,
    abortSignal
  )
  
  // 创建新概括并更新缓存
  const allSummarizedMessages = contextMessages.slice(0, needSummarizeCount)
  const summaryMessage = createSummaryAndCache(summaryText, allSummarizedMessages, cacheKey)
  
  // 替换为：新概括 + 保护窗口内的消息
  const protectedMessages = contextMessages.slice(needSummarizeCount)
  replaceMessagesInContext(allMessages, contextMessages, [summaryMessage, ...protectedMessages])
  
  return { success: true, tokensUsed: CONFIG.ESTIMATED_TOKENS }
}

/**
 * 滑动窗口策略处理上下文消息
 */
export async function processContextRange(
  contextMessages: Message[],
  allMessages: Message[],
  context: AgentContext,
  abortSignal?: AbortSignal,
  customProviderId?: string,
  cacheKey: string = CONFIG.DEFAULT_CACHE_KEY
): Promise<ProcessResult> {
  // 空消息直接返回
  if (contextMessages.length === 0) {
    return { success: true, tokensUsed: 0 }
  }
  
  try {
    const aiConfig = context.input.aiConfig
    const currentIds = generateMessageIds(contextMessages)
    
    // 验证缓存并获取状态
    const cacheState = validateCache(cacheKey, currentIds)
    
    // 计算当前有效消息数
    const unSummarizedCount = contextMessages.length - cacheState.summarizedCount
    const effectiveMessageCount = (cacheState.summaryMessage ? 1 : 0) + unSummarizedCount
    
    // 情况1：未超过窗口，不需要新概括
    if (effectiveMessageCount <= CONFIG.WINDOW_SIZE) {
      return handleWithinWindow(allMessages, contextMessages, cacheState)
    }
    
    // 情况2：超过窗口 + 有旧概括（乐观渲染）
    if (cacheState.summaryMessage) {
      return handleOptimisticRender(
        allMessages,
        contextMessages,
        cacheState,
        aiConfig,
        currentIds,
        cacheKey,
        customProviderId
      )
    }
    
    // 情况3：超过窗口 + 无旧概括（首次等待）
    return await handleFirstTimeSummary(
      allMessages,
      contextMessages,
      cacheState,
      aiConfig,
      cacheKey,
      customProviderId,
      abortSignal
    )
    
  } catch (error: any) {
    // 失败时保留原消息，标记为已处理
    markAsProcessed(contextMessages)
    return { success: false, tokensUsed: 0, error: error.message }
  }
}
