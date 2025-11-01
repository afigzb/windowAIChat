/**
 * 请求构建器 - 统一收集初始数据
 * 
 * 职责：
 * 1. 在发送请求前，统一收集所有必要的数据
 * 2. 规范化数据格式，确保后续流程不需要再做数据转换
 * 3. 这是整个请求流程的唯一数据源
 */

import type { 
  FlatMessage, 
  AIConfig, 
  InitialRequestData,
  MessageComponents
} from '../types'
import { 
  createFlatMessage, 
  getConversationHistory 
} from './tree-utils'
import { promptCardManager } from '../../prompt/prompt-manager'
import { isInOverrideMode } from './context/system-prompt'

/**
 * 收集附加内容
 * 统一处理各种形式的附加内容（tempContent, tempContentList）
 */
function collectAttachedContents(
  tempContent?: string,
  tempContentList?: string[]
): string[] {
  const contents: string[] = []
  
  // 优先使用列表形式
  if (tempContentList && tempContentList.length > 0) {
    contents.push(...tempContentList)
  } else if (tempContent && tempContent.trim()) {
    contents.push(tempContent)
  }
  
  return contents
}

/**
 * 构建系统提示词
 * 从配置中提取系统提示词
 */
function buildSystemPrompt(config: AIConfig): string {
  return config.systemPrompt || ''
}

/**
 * 构建用户消息节点
 * 创建包含完整组件信息的用户消息（包括提示词卡片）
 */
function buildUserMessageNode(
  userInput: string,
  parentId: string | null,
  attachedContents: string[]
): FlatMessage {
  const components: MessageComponents = {
    userInput: userInput.trim()
  }
  
  // 只有存在附加内容时才添加 attachedFiles 字段
  if (attachedContents.length > 0) {
    components.attachedFiles = attachedContents
  }
  
  // 收集启用的提示词卡片（如果不在覆盖模式）
  if (!isInOverrideMode()) {
    const enabledCards = promptCardManager.getEnabledCards()
    if (enabledCards.length > 0) {
      components.promptCards = enabledCards.map(card => ({
        id: card.id,
        title: card.title,
        content: card.content,
        placement: card.placement
      }))
    }
  }
  
  return createFlatMessage(
    userInput.trim(),
    'user',
    parentId,
    undefined,
    components
  )
}

/**
 * 构建初始请求数据
 * 
 * 这是整个请求处理流程的入口函数，负责收集所有必要的数据
 * 
 * @param userInput 用户输入内容
 * @param parentId 父消息ID
 * @param flatMessages 当前的扁平消息映射
 * @param config AI配置
 * @param abortSignal 中断信号
 * @param tempContent 临时附加内容（单个）
 * @param tempContentList 临时附加内容列表（多个）
 * @returns 完整的初始请求数据
 */
export function buildInitialRequestData(
  userInput: string,
  parentId: string | null,
  flatMessages: Map<string, FlatMessage>,
  config: AIConfig,
  abortSignal: AbortSignal,
  tempContent?: string,
  tempContentList?: string[]
): InitialRequestData {
  // 1. 收集附加内容
  const attachedContents = collectAttachedContents(tempContent, tempContentList)
  
  // 2. 构建用户消息节点
  const userMessageNode = buildUserMessageNode(userInput, parentId, attachedContents)
  
  // 3. 获取对话历史（基于父节点）
  const conversationHistory = parentId 
    ? getConversationHistory(parentId, flatMessages)
    : []
  
  // 4. 构建系统提示词
  const systemPrompt = buildSystemPrompt(config)
  
  // 5. 返回完整的初始请求数据
  return {
    userInput: userInput.trim(),
    attachedContents,
    conversationHistory,
    systemPrompt,
    aiConfig: config,
    userMessageNode,
    abortSignal
  }
}

/**
 * 为重新生成构建初始请求数据
 * 
 * 重新生成时的特殊处理：
 * - 可以覆盖原有的附加文件
 * - 需要基于已有的用户消息节点
 * 
 * @param userMessage 要重新生成的用户消息
 * @param flatMessages 当前的扁平消息映射
 * @param config AI配置
 * @param abortSignal 中断信号
 * @param overrideTempContent 覆盖的临时内容（单个）
 * @param overrideTempContentList 覆盖的临时内容列表（多个）
 * @returns 完整的初始请求数据
 */
export function buildInitialRequestDataForRegenerate(
  userMessage: FlatMessage,
  flatMessages: Map<string, FlatMessage>,
  config: AIConfig,
  abortSignal: AbortSignal,
  overrideTempContent?: string,
  overrideTempContentList?: string[]
): InitialRequestData {
  // 1. 确定附加内容：优先使用覆盖的，否则使用原有的
  let attachedContents: string[]
  
  if (overrideTempContentList || overrideTempContent) {
    // 使用新提供的附加内容
    attachedContents = collectAttachedContents(overrideTempContent, overrideTempContentList)
  } else {
    // 保留原有的附加内容
    attachedContents = userMessage.components?.attachedFiles || []
  }
  
  // 2. 获取用户输入内容
  const userInput = userMessage.components?.userInput || userMessage.content
  
  // 3. 获取对话历史（到用户消息之前）
  const conversationHistory = userMessage.parentId
    ? getConversationHistory(userMessage.parentId, flatMessages)
    : []
  
  // 4. 构建系统提示词
  const systemPrompt = buildSystemPrompt(config)
  
  // 5. 更新用户消息节点的组件（如果附加内容改变了）
  // 重新获取提示词卡片（如果不在覆盖模式）
  let promptCards = userMessage.components?.promptCards
  if (!isInOverrideMode()) {
    const enabledCards = promptCardManager.getEnabledCards()
    if (enabledCards.length > 0) {
      promptCards = enabledCards.map(card => ({
        id: card.id,
        title: card.title,
        content: card.content,
        placement: card.placement
      }))
    }
  }
  
  const updatedUserMessage: FlatMessage = {
    ...userMessage,
    components: {
      ...userMessage.components,
      userInput,
      attachedFiles: attachedContents.length > 0 ? attachedContents : undefined,
      promptCards
    }
  }
  
  // 6. 返回完整的初始请求数据
  return {
    userInput,
    attachedContents,
    conversationHistory,
    systemPrompt,
    aiConfig: config,
    userMessageNode: updatedUserMessage,
    abortSignal
  }
}

