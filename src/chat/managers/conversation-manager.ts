import { useState, useRef, useCallback } from 'react'
import type { 
  FlatMessage, 
  ConversationTree, 
  AIConfig, 
  ChatMode 
} from '../data/types'
import { callDeepSeekAPI } from '../api/api'
import {
  createInitialConversationTree,
  createFlatMessage,
  buildTreeFromFlat,
  getActiveNodesFromPath,
  addMessageToTree,
  getConversationHistory,
  editUserMessage
} from '../data/tree-utils'

// 对话管理器的状态接口
export interface ConversationState {
  conversationTree: ConversationTree
  inputValue: string
  isLoading: boolean
  currentThinking: string
  currentAnswer: string
}

// 对话管理器的操作接口
export interface ConversationActions {
  sendMessage: (content: string, parentNodeId?: string | null) => Promise<void>
  editUserMessage: (nodeId: string, newContent: string) => Promise<void>
  updateInputValue: (value: string) => void
  abortRequest: () => void
  clearStreamState: () => void
  updateConversationTree: (flatMessages: Map<string, FlatMessage>, activePath: string[]) => void
  updateActivePath: (newPath: string[]) => void
}

/**
 * 通用AI消息生成函数
 * 处理API调用、错误处理和流式更新
 */
async function generateAIMessage(
  conversationHistory: FlatMessage[],
  placeholderMessage: FlatMessage,
  config: AIConfig,
  currentMode: ChatMode,
  abortController: AbortController,
  onThinkingUpdate: (thinking: string) => void,
  onAnswerUpdate: (answer: string) => void,
  isFirstConversation: boolean = false
): Promise<FlatMessage> {
  let currentGeneratedContent = ''
  let currentReasoningContent = ''
  
  try {
    const result = await callDeepSeekAPI(
      conversationHistory,
      currentMode,
      config,
      abortController.signal,
      (thinking) => {
        currentReasoningContent = thinking
        onThinkingUpdate(thinking)
      },
      (answer) => {
        currentGeneratedContent = answer
        onAnswerUpdate(answer)
      },
      isFirstConversation
    )

    return {
      ...placeholderMessage,
      content: result.content,
      reasoning_content: result.reasoning_content
    }
  } catch (error: any) {
    // 处理中断错误 - 保留已生成的内容
    if (error.name === 'AbortError') {
      // 如果有已生成的内容，保留它；否则显示中断提示
      const finalContent = currentGeneratedContent.trim() || '生成被中断'
      const finalReasoning = currentReasoningContent.trim() || undefined
      
      return {
        ...placeholderMessage,
        content: finalContent,
        reasoning_content: finalReasoning
      }
    }
    
    // 处理其他错误
    return {
      ...placeholderMessage,
      content: `生成失败: ${error.message || '未知错误'}`
    }
  }
}

/**
 * 对话管理器主Hook
 * 管理整个对话的状态和逻辑
 * @param config AI配置
 * @param currentMode 当前聊天模式
 * @param initialWelcomeMessage 初始欢迎消息
 */
export function useConversationManager(
  config: AIConfig,
  currentMode: ChatMode,
  initialWelcomeMessage?: string
) {
  // 核心状态：对话树
  const [conversationTree, setConversationTree] = useState<ConversationTree>(() =>
    createInitialConversationTree(initialWelcomeMessage || '')
  )

  // UI交互状态
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentThinking, setCurrentThinking] = useState('')    // 实时思考过程
  const [currentAnswer, setCurrentAnswer] = useState('')       // 实时回答内容
  
  // 语料管理状态
  const [hasHadConversation, setHasHadConversation] = useState(false)  // 是否已有过对话
  
  // 请求控制
  const abortControllerRef = useRef<AbortController | null>(null)

  // 清理流式状态
  const clearStreamState = useCallback(() => {
    setCurrentThinking('')
    setCurrentAnswer('')
  }, [])

  // 更新对话树的通用方法
  const updateConversationTree = useCallback((flatMessages: Map<string, FlatMessage>, activePath: string[]) => {
    setConversationTree({
      flatMessages,
      rootNodes: buildTreeFromFlat(flatMessages),
      activePath
    })
  }, [])

  // 更新激活路径
  const updateActivePath = useCallback((newPath: string[]) => {
    setConversationTree(prev => ({
      ...prev,
      activePath: newPath
    }))
  }, [])

  /**
   * 生成AI回复的核心逻辑
   * 创建占位消息、调用API、更新最终结果
   */
  const generateAIReply = useCallback(async (
    userMessage: FlatMessage,
    currentFlatMessages?: Map<string, FlatMessage>,
    currentActivePath?: string[]
  ) => {
    const flatMessages = currentFlatMessages || conversationTree.flatMessages
    const activePath = currentActivePath || conversationTree.activePath
    
    // 创建占位AI消息
    const placeholderMessage = createFlatMessage('正在生成...', 'assistant', userMessage.id)
    const { newFlatMessages, newActivePath } = addMessageToTree(flatMessages, activePath, placeholderMessage)

    updateConversationTree(newFlatMessages, newActivePath)
    setIsLoading(true)
    clearStreamState()

    abortControllerRef.current = new AbortController()

    try {
      // 获取到当前用户消息为止的对话历史
      const conversationHistory = getConversationHistory(userMessage.id, newFlatMessages)
      
      // 调用AI API生成回复
      const isFirstConversation = !hasHadConversation
      const finalMessage = await generateAIMessage(
        conversationHistory,
        placeholderMessage,
        config,
        currentMode,
        abortControllerRef.current,
        setCurrentThinking,
        setCurrentAnswer,
        isFirstConversation
      )
      
      // 标记已经有过对话
      if (isFirstConversation) {
        setHasHadConversation(true)
      }

      // 更新最终消息
      const finalFlatMessages = new Map(newFlatMessages)
      finalFlatMessages.set(placeholderMessage.id, finalMessage)
      updateConversationTree(finalFlatMessages, newActivePath)
      
    } finally {
      setIsLoading(false)
      clearStreamState()
      abortControllerRef.current = null
    }
  }, [conversationTree, config, currentMode, updateConversationTree, clearStreamState])

  // 中断当前请求
  const abortRequest = useCallback(() => {
    if (!abortControllerRef.current) return
    
    // 中断API请求，让generateAIMessage的catch块处理内容保存
    abortControllerRef.current.abort()
  }, [])

  /**
   * 发送新消息
   * @param content 消息内容
   * @param parentNodeId 父节点ID，为空时添加到当前路径末尾
   */
  const sendMessage = useCallback(async (content: string, parentNodeId: string | null = null) => {
    if (isLoading || !content.trim()) return

    // 确定父节点ID
    const actualParentId = parentNodeId || (
      conversationTree.activePath.length > 0 
        ? conversationTree.activePath[conversationTree.activePath.length - 1]
        : null
    )

    // 创建用户消息并添加到树中
    const userMessage = createFlatMessage(content.trim(), 'user', actualParentId)
    const { newFlatMessages, newActivePath } = addMessageToTree(
      conversationTree.flatMessages,
      conversationTree.activePath,
      userMessage
    )

    updateConversationTree(newFlatMessages, newActivePath)
    await generateAIReply(userMessage, newFlatMessages, newActivePath)
  }, [conversationTree, isLoading, generateAIReply, updateConversationTree])

  /**
   * 编辑用户消息并重新生成AI回复
   * @param nodeId 要编辑的消息ID
   * @param newContent 新的消息内容
   */
  const handleEditUserMessage = useCallback(async (nodeId: string, newContent: string) => {
    if (isLoading) return

    const result = editUserMessage(
      conversationTree.flatMessages,
      conversationTree.activePath,
      nodeId,
      newContent
    )

    if (result) {
      updateConversationTree(result.newFlatMessages, result.newActivePath)
      
      const editedMessageId = result.newActivePath[result.newActivePath.length - 1]
      const editedMessage = result.newFlatMessages.get(editedMessageId)
      
      if (editedMessage) {
        await generateAIReply(editedMessage, result.newFlatMessages, result.newActivePath)
      }
    }
  }, [conversationTree, isLoading, updateConversationTree, generateAIReply])

  // 重新生成消息（合并regeneration功能）
  const regenerateMessage = useCallback(async (nodeId: string) => {
    if (isLoading) return

    const targetMessage = conversationTree.flatMessages.get(nodeId)
    if (!targetMessage) return

    let newMessage: FlatMessage
    let newActivePath: string[]

    if (targetMessage.role === 'assistant') {
      // AI消息重新生成
      newMessage = createFlatMessage('正在生成...', 'assistant', targetMessage.parentId)
      const targetIndex = conversationTree.activePath.indexOf(nodeId)
      newActivePath = targetIndex > 0 
        ? [...conversationTree.activePath.slice(0, targetIndex), newMessage.id]
        : [newMessage.id]
    } else {
      // 用户消息重新生成
      newMessage = createFlatMessage('正在生成...', 'assistant', nodeId)
      const targetIndex = conversationTree.activePath.indexOf(nodeId)
      newActivePath = targetIndex >= 0 
        ? [...conversationTree.activePath.slice(0, targetIndex + 1), newMessage.id]
        : [...conversationTree.activePath, newMessage.id]
    }

    const { newFlatMessages } = addMessageToTree(conversationTree.flatMessages, [], newMessage)
    updateConversationTree(newFlatMessages, newActivePath)

    setIsLoading(true)
    clearStreamState()
    abortControllerRef.current = new AbortController()

    try {
      let conversationHistory: FlatMessage[]
      if (targetMessage.role === 'assistant') {
        conversationHistory = getConversationHistory(targetMessage.parentId || '', newFlatMessages)
      } else {
        conversationHistory = [...getConversationHistory(nodeId, newFlatMessages), targetMessage]
      }

      const finalMessage = await generateAIMessage(
        conversationHistory,
        newMessage,
        config,
        currentMode,
        abortControllerRef.current,
        setCurrentThinking,
        setCurrentAnswer,
        false  // 重新生成不是首次对话
      )

      const updatedFlatMessages = new Map(newFlatMessages)
      updatedFlatMessages.set(newMessage.id, finalMessage)
      updateConversationTree(updatedFlatMessages, newActivePath)

    } finally {
      setIsLoading(false)
      clearStreamState()
      abortControllerRef.current = null
    }
  }, [conversationTree, isLoading, config, currentMode, updateConversationTree, clearStreamState])

  // 获取当前要渲染的消息节点
  const activeNodes = getActiveNodesFromPath(conversationTree.activePath, conversationTree.rootNodes)

  // 状态对象
  const state: ConversationState = {
    conversationTree,
    inputValue,
    isLoading,
    currentThinking,
    currentAnswer
  }

  // 操作对象
  const actions: ConversationActions = {
    sendMessage,
    editUserMessage: handleEditUserMessage,
    updateInputValue: setInputValue,
    abortRequest,
    clearStreamState,
    updateConversationTree,
    updateActivePath
  }

  return {
    state,
    actions,
    activeNodes,
    regenerateMessage,
    abortControllerRef,
    setIsLoading,
    setCurrentThinking,
    setCurrentAnswer
  }
} 