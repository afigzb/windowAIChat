import { useState, useRef, useCallback } from 'react'
import type { FlatMessage, ConversationTree, AIConfig } from '../types'
import type { AgentProgressUpdate } from '../agents'
import type { 
  ConversationState, 
  ConversationActions, 
  StreamCallbacks 
} from './conversation-state'
import {
  createInitialConversationTree,
  buildTreeFromFlat,
  getActiveNodesFromPath
} from './tree-utils'
import {
  handleSendMessage,
  handleEditUserMessage,
  handleEditAssistantMessage,
  handleDeleteNode,
  handleRegenerateMessage
} from './conversation-actions'

// 导出状态和操作接口供外部使用
export type { ConversationState, ConversationActions }

/**
 * 对话管理器主Hook
 * 管理整个对话的状态和逻辑
 * @param config AI配置
 * @param initialWelcomeMessage 初始欢迎消息
 */
export function useConversationManager(
  config: AIConfig,
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
  const [currentAgentOptimizing, setCurrentAgentOptimizing] = useState('')  // Agent 优化过程的实时内容
  


  
  // 请求控制
  const abortControllerRef = useRef<AbortController | null>(null)

  // 清理流式状态
  const clearStreamState = useCallback(() => {
    setCurrentThinking('')
    setCurrentAnswer('')
    setCurrentAgentOptimizing('')
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

  // 创建回调集合（避免在每次调用时重复创建）
  const createCallbacks = useCallback((): StreamCallbacks => ({
    onAgentProgress: (content: string | AgentProgressUpdate) => {
      const stringContent = typeof content === 'string' ? content : JSON.stringify(content)
      setCurrentAgentOptimizing(stringContent)
    },
    onThinkingUpdate: setCurrentThinking,
    onAnswerUpdate: setCurrentAnswer
  }), [])  // 这些 setter 函数是稳定的，不需要依赖

  // 中断当前请求
  const abortRequest = useCallback(() => {
    if (!abortControllerRef.current) return
    
    // 中断API请求，让generateAIMessage的catch块处理内容保存
    abortControllerRef.current.abort()
  }, [])

  /**
   * 发送新消息
   */
  const sendMessage = useCallback(async (
    content: string, 
    parentNodeId: string | null = null, 
    tempContent?: string, 
    tempPlacement: 'append' | 'after_system' = 'append', 
    tempContentList?: string[]
  ) => {
    if (isLoading) return
    
    await handleSendMessage(
      content,
      parentNodeId,
      conversationTree,
      config,
      createCallbacks(),
      abortControllerRef,
      setIsLoading,
      clearStreamState,
      updateConversationTree,
      tempContent,
      tempPlacement,
      tempContentList
    )
  }, [conversationTree, isLoading, config, createCallbacks, updateConversationTree, clearStreamState])

  /**
   * 编辑用户消息并重新生成AI回复
   */
  const editUserMessageAction = useCallback(async (
    nodeId: string, 
    newContent: string, 
    tempContent?: string, 
    tempPlacement: 'append' | 'after_system' = 'append', 
    tempContentList?: string[]
  ) => {
    if (isLoading) return
    
    await handleEditUserMessage(
      nodeId,
      newContent,
      conversationTree,
      config,
      createCallbacks(),
      abortControllerRef,
      setIsLoading,
      clearStreamState,
      updateConversationTree,
      tempContent,
      tempPlacement,
      tempContentList
    )
  }, [conversationTree, isLoading, config, createCallbacks, updateConversationTree, clearStreamState])

  /**
   * 直接编辑AI消息（不创建分支，不重新发送）
   */
  const editAssistantMessageAction = useCallback((nodeId: string, newContent: string) => {
    if (isLoading) return
    
    handleEditAssistantMessage(
      nodeId,
      newContent,
      conversationTree,
      updateConversationTree
    )
  }, [conversationTree, isLoading, updateConversationTree])

  /**
   * 删除节点及其兄弟节点，保留被删除节点的子节点
   */
  const deleteNodeAction = useCallback((nodeId: string) => {
    if (isLoading) return

    handleDeleteNode(
      nodeId,
      conversationTree,
      updateConversationTree
    )
  }, [conversationTree, isLoading, updateConversationTree])

  /**
   * 重新生成消息
   */
  const regenerateMessage = useCallback(async (
    nodeId: string, 
    tempContent?: string, 
    tempPlacement: 'append' | 'after_system' = 'append',
    tempContentList?: string[]
  ) => {
    if (isLoading) return

    await handleRegenerateMessage(
      nodeId,
      conversationTree,
      config,
      createCallbacks(),
      abortControllerRef,
      setIsLoading,
      clearStreamState,
      updateConversationTree,
      tempContent,
      tempPlacement,
      tempContentList
    )
  }, [conversationTree, isLoading, config, createCallbacks, updateConversationTree, clearStreamState])

  // 获取当前要渲染的消息节点
  const activeNodes = getActiveNodesFromPath(conversationTree.activePath, conversationTree.rootNodes)

  // 状态对象
  const state: ConversationState = {
    conversationTree,
    inputValue,
    isLoading,
    currentThinking,
    currentAnswer,
    currentAgentOptimizing
  }

  // 操作对象
  const actions: ConversationActions = {
    sendMessage,
    editUserMessage: editUserMessageAction,
    editAssistantMessage: editAssistantMessageAction,
    deleteNode: deleteNodeAction,
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