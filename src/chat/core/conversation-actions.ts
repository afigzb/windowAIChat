/**
 * 对话操作处理器
 * 
 * 重构后的职责：
 * 1. 响应用户操作（发送、编辑、删除、重新生成）
 * 2. 使用统一的数据收集 + 路由分发架构
 * 3. 不再处理数据转换，只做流程编排
 */

import type { 
  FlatMessage, 
  AIConfig, 
  ConversationTree,
  StreamCallbacks,
  RequestResult
} from '../types'
import {
  addMessageToTree,
  updateAssistantMessage,
  deleteNodeAndSiblings,
  createFlatMessage
} from './tree-utils'
import { 
  buildInitialRequestData, 
  buildInitialRequestDataForRegenerate 
} from './request-builder'
import { routeRequest } from './request-router'
import { executeManualMode } from './manual-mode-handler'
import { executeAgentMode } from '../agents/agent-mode-handler'
import type { FormattedFileContent } from '../../file-manager/utils/fileHelper'

/**
 * 统一的请求执行器
 * 根据路由结果调用对应的处理器
 */
async function executeRequest(
  data: ReturnType<typeof buildInitialRequestData>,
  callbacks: StreamCallbacks
): Promise<RequestResult> {
  const mode = routeRequest(data)
  
  if (mode === 'agent') {
    return await executeAgentMode(data, callbacks)
  } else {
    return await executeManualMode(data, callbacks)
  }
}

/**
 * 发送新消息
 * 
 * 重构后的流程：
 * 1. 收集初始数据（统一入口）
 * 2. 添加用户消息到树
 * 3. 路由到对应的处理器
 * 4. 更新AI消息
 */
export async function handleSendMessage(
  content: string,
  parentNodeId: string | null,
  conversationTree: ConversationTree,
  config: AIConfig,
  callbacks: StreamCallbacks,
  abortControllerRef: React.MutableRefObject<AbortController | null>,
  setIsLoading: (loading: boolean) => void,
  clearStreamState: () => void,
  updateConversationTree: (flatMessages: Map<string, FlatMessage>, activePath: string[]) => void,
  tempContent?: string,
  tempPlacement: 'append' | 'after_system' = 'append',
  tempContentList?: FormattedFileContent[]
): Promise<void> {
  if (!content.trim()) return

  // 确定父节点ID
  const actualParentId = parentNodeId || (
    conversationTree.activePath.length > 0 
      ? conversationTree.activePath[conversationTree.activePath.length - 1]
      : null
  )

  try {
    // 创建 AbortController
    abortControllerRef.current = new AbortController()
    
    // 1️⃣ 收集初始数据（统一入口，只调用一次）
    const initialData = buildInitialRequestData(
      content,
      actualParentId,
      conversationTree.flatMessages,
      config,
      abortControllerRef.current.signal,
      tempContent,
      tempContentList
    )
    
    console.log('[SendMessage] 初始数据收集完成:', {
      userInput: initialData.userInput.substring(0, 50) + '...',
      attachedCount: initialData.attachedContents.length,
      historyLength: initialData.conversationHistory.length
    })

    // 2️⃣ 添加用户消息到树并立即显示
    const { newFlatMessages, newActivePath } = addMessageToTree(
      conversationTree.flatMessages,
      conversationTree.activePath,
      initialData.userMessageNode
    )
    updateConversationTree(newFlatMessages, newActivePath)

    // 3️⃣ 创建占位AI消息
    const placeholderAI = createFlatMessage(
      '正在生成...', 
      'assistant', 
      initialData.userMessageNode.id
    )
    const { newFlatMessages: withAI, newActivePath: pathWithAI } = addMessageToTree(
      newFlatMessages,
      newActivePath,
      placeholderAI
    )
    updateConversationTree(withAI, pathWithAI)
    setIsLoading(true)
    clearStreamState()

    // 4️⃣ 执行请求（自动路由到手动挡或自动挡）
    const result = await executeRequest(initialData, callbacks)
    
    console.log('[SendMessage] 生成完成')

    // 5️⃣ 更新最终的AI消息
    const finalAIMessage: FlatMessage = {
      ...placeholderAI,
      content: result.content,
      reasoning_content: result.reasoning_content,
      components: result.components
    }
    
    const updatedFlatMessages = new Map(withAI)
    updatedFlatMessages.set(placeholderAI.id, finalAIMessage)
    updateConversationTree(updatedFlatMessages, pathWithAI)
    
  } catch (error) {
    console.error('[SendMessage] 发送失败:', error)
  } finally {
    setIsLoading(false)
    clearStreamState()
    abortControllerRef.current = null
  }
}

/**
 * 编辑用户消息并重新生成AI回复
 * 
 * 重构后的流程：
 * 1. 创建编辑后的用户消息
 * 2. 收集初始数据（基于新消息）
 * 3. 路由到对应的处理器
 * 4. 更新AI消息
 */
export async function handleEditUserMessage(
  nodeId: string,
  newContent: string,
  conversationTree: ConversationTree,
  config: AIConfig,
  callbacks: StreamCallbacks,
  abortControllerRef: React.MutableRefObject<AbortController | null>,
  setIsLoading: (loading: boolean) => void,
  clearStreamState: () => void,
  updateConversationTree: (flatMessages: Map<string, FlatMessage>, activePath: string[]) => void,
  tempContent?: string,
  tempPlacement: 'append' | 'after_system' = 'append',
  tempContentList?: FormattedFileContent[]
): Promise<void> {
  // 获取原消息
  const originalMessage = conversationTree.flatMessages.get(nodeId)
  if (!originalMessage || originalMessage.role !== 'user') return

  try {
    // 创建 AbortController
    abortControllerRef.current = new AbortController()
    
    // 1️⃣ 收集初始数据（用于编辑）
    // 注意：这里先用原消息的内容，然后会被 newContent 覆盖
    const tempInitialData = buildInitialRequestData(
      newContent,
      originalMessage.parentId,
      conversationTree.flatMessages,
      config,
      abortControllerRef.current.signal,
      tempContent,
      tempContentList
    )
    
    // 编辑后的消息是一个新的兄弟节点
    const editedUserMessage = tempInitialData.userMessageNode

    console.log('[EditUserMessage] 初始数据收集完成')

    // 2️⃣ 添加编辑后的用户消息（作为兄弟节点）
    const { newFlatMessages, newActivePath } = (() => {
      const updated = new Map(conversationTree.flatMessages)
      updated.set(editedUserMessage.id, editedUserMessage)
      
      // 计算新的激活路径
      const targetNodeIndex = conversationTree.activePath.indexOf(nodeId)
      const newPath = targetNodeIndex >= 0
        ? [...conversationTree.activePath.slice(0, targetNodeIndex), editedUserMessage.id]
        : [...conversationTree.activePath, editedUserMessage.id]
      
      return { newFlatMessages: updated, newActivePath: newPath }
    })()
    
    updateConversationTree(newFlatMessages, newActivePath)

    // 3️⃣ 创建占位AI消息
    const placeholderAI = createFlatMessage(
      '正在生成...', 
      'assistant', 
      editedUserMessage.id
    )
    const { newFlatMessages: withAI, newActivePath: pathWithAI } = addMessageToTree(
      newFlatMessages,
      newActivePath,
      placeholderAI
    )
    updateConversationTree(withAI, pathWithAI)
    setIsLoading(true)
    clearStreamState()

    // 4️⃣ 重新收集数据（基于编辑后的消息）
    const finalInitialData = buildInitialRequestData(
      newContent,
      originalMessage.parentId,
      newFlatMessages,
      config,
      abortControllerRef.current.signal,
      tempContent,
      tempContentList
    )

    // 5️⃣ 执行请求
    const result = await executeRequest(finalInitialData, callbacks)
    
    console.log('[EditUserMessage] 生成完成')

    // 6️⃣ 更新最终的AI消息
    const finalAIMessage: FlatMessage = {
      ...placeholderAI,
      content: result.content,
      reasoning_content: result.reasoning_content,
      components: result.components
    }
    
    const updatedFlatMessages = new Map(withAI)
    updatedFlatMessages.set(placeholderAI.id, finalAIMessage)
    updateConversationTree(updatedFlatMessages, pathWithAI)
    
  } catch (error) {
    console.error('[EditUserMessage] 编辑失败:', error)
  } finally {
    setIsLoading(false)
    clearStreamState()
    abortControllerRef.current = null
  }
}

/**
 * 直接编辑AI消息（不创建分支，不重新发送）
 */
export function handleEditAssistantMessage(
  nodeId: string,
  newContent: string,
  conversationTree: ConversationTree,
  updateConversationTree: (flatMessages: Map<string, FlatMessage>, activePath: string[]) => void
): void {
  const newFlatMessages = updateAssistantMessage(
    conversationTree.flatMessages,
    nodeId,
    newContent
  )

  if (newFlatMessages) {
    updateConversationTree(newFlatMessages, conversationTree.activePath)
  }
}

/**
 * 删除节点及其兄弟节点，保留被删除节点的子节点
 */
export function handleDeleteNode(
  nodeId: string,
  conversationTree: ConversationTree,
  updateConversationTree: (flatMessages: Map<string, FlatMessage>, activePath: string[]) => void
): void {
  const result = deleteNodeAndSiblings(
    conversationTree.flatMessages,
    conversationTree.activePath,
    nodeId
  )

  if (result) {
    updateConversationTree(result.newFlatMessages, result.newActivePath)
  }
}

/**
 * 重新生成消息
 * 
 * 重构后的流程：
 * 1. 找到对应的用户消息
 * 2. 收集初始数据（可覆盖附加文件）
 * 3. 路由到对应的处理器
 * 4. 创建新的AI消息分支
 */
export async function handleRegenerateMessage(
  nodeId: string,
  conversationTree: ConversationTree,
  config: AIConfig,
  callbacks: StreamCallbacks,
  abortControllerRef: React.MutableRefObject<AbortController | null>,
  setIsLoading: (loading: boolean) => void,
  clearStreamState: () => void,
  updateConversationTree: (flatMessages: Map<string, FlatMessage>, activePath: string[]) => void,
  tempContent?: string,
  tempPlacement: 'append' | 'after_system' = 'append',
  tempContentList?: FormattedFileContent[]
): Promise<void> {
  const targetMessage = conversationTree.flatMessages.get(nodeId)
  if (!targetMessage) return

  let preparedActivePath: string[]
  let userMessageForRegeneration: FlatMessage | null = null

  if (targetMessage.role === 'assistant') {
    // AI消息重新生成 - 找到父级用户消息
    const targetIndex = conversationTree.activePath.indexOf(nodeId)
    preparedActivePath = targetIndex > 0 
      ? conversationTree.activePath.slice(0, targetIndex)
      : []
    
    if (targetMessage.parentId) {
      userMessageForRegeneration = conversationTree.flatMessages.get(targetMessage.parentId) || null
    }
  } else {
    // 用户消息重新生成 - 使用当前消息作为用户输入
    const targetIndex = conversationTree.activePath.indexOf(nodeId)
    preparedActivePath = targetIndex >= 0 
      ? conversationTree.activePath.slice(0, targetIndex + 1)
      : [...conversationTree.activePath, nodeId]
    
    userMessageForRegeneration = targetMessage
  }

  // 如果没有用户消息，无法重新生成
  if (!userMessageForRegeneration || userMessageForRegeneration.role !== 'user') {
    console.warn('[RegenerateMessage] 无法找到用户消息')
    return
  }

  try {
    // 创建 AbortController
    abortControllerRef.current = new AbortController()
    
    // 1️⃣ 收集初始数据（使用 buildInitialRequestDataForRegenerate）
    const initialData = buildInitialRequestDataForRegenerate(
      userMessageForRegeneration,
      conversationTree.flatMessages,
      config,
      abortControllerRef.current.signal,
      tempContent,
      tempContentList
    )
    
    console.log('[RegenerateMessage] 初始数据收集完成')

    // 2️⃣ 创建占位AI消息
    const placeholderAI = createFlatMessage(
      '正在生成...', 
      'assistant', 
      userMessageForRegeneration.id
    )
    const { newFlatMessages, newActivePath } = addMessageToTree(
      conversationTree.flatMessages,
      preparedActivePath,
      placeholderAI
    )
    updateConversationTree(newFlatMessages, newActivePath)
    setIsLoading(true)
    clearStreamState()

    // 3️⃣ 执行请求
    const result = await executeRequest(initialData, callbacks)
    
    console.log('[RegenerateMessage] 生成完成')

    // 4️⃣ 更新最终的AI消息
    const finalAIMessage: FlatMessage = {
      ...placeholderAI,
      content: result.content,
      reasoning_content: result.reasoning_content,
      components: result.components
    }
    
    const updatedFlatMessages = new Map(newFlatMessages)
    updatedFlatMessages.set(placeholderAI.id, finalAIMessage)
    updateConversationTree(updatedFlatMessages, newActivePath)
    
  } catch (error) {
    console.error('[RegenerateMessage] 重新生成失败:', error)
  } finally {
    setIsLoading(false)
    clearStreamState()
    abortControllerRef.current = null
  }
}
