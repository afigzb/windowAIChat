import { useState, useRef, useCallback } from 'react'
import type { 
  FlatMessage, 
  ConversationTree, 
  AIConfig,
  MessageComponents
} from '../types'
import { callAIAPI } from './api'
import { contextEngine } from './context'
import { agentEngine } from '../agents'
import {
  createInitialConversationTree,
  createFlatMessage,
  buildTreeFromFlat,
  getActiveNodesFromPath,
  addMessageToTree,
  getConversationHistory,
  editUserMessage,
  updateAssistantMessage,
  deleteNodeAndSiblings
} from './tree-utils'

// 对话管理器的状态接口
export interface ConversationState {
  conversationTree: ConversationTree
  inputValue: string
  isLoading: boolean
  currentThinking: string
  currentAnswer: string
  currentAgentOptimizing: string  // Agent 优化过程中的实时内容
}

// 对话管理器的操作接口
export interface ConversationActions {
  sendMessage: (content: string, parentNodeId?: string | null, tempContent?: string, tempPlacement?: 'append' | 'after_system', tempContentList?: string[]) => Promise<void>
  editUserMessage: (nodeId: string, newContent: string, tempContent?: string, tempPlacement?: 'append' | 'after_system', tempContentList?: string[]) => Promise<void>
  editAssistantMessage: (nodeId: string, newContent: string) => void
  deleteNode: (nodeId: string) => void
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
  abortController: AbortController,
  onThinkingUpdate: (thinking: string) => void,
  onAnswerUpdate: (answer: string) => void,
  tempContent?: string,
  tempPlacement: 'append' | 'after_system' = 'append',
  tempContentList?: string[]
): Promise<FlatMessage> {
  let currentGeneratedContent = ''
  let currentReasoningContent = ''
  
  try {
    // 新架构：直接传递conversationHistory和tempContent到API层
    // API层内部会通过ContextEngine处理消息编辑
    const result = await callAIAPI(
      conversationHistory,
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
      tempContent,
      tempPlacement,
      tempContentList
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
 * 处理Agent优化和AI回复的通用函数
 * 抽取sendMessage和editUserMessage中的重复逻辑
 */
async function processWithAgent(
  userMessage: FlatMessage,
  userContent: string,
  components: MessageComponents,
  flatMessages: Map<string, FlatMessage>,
  activePath: string[],
  config: AIConfig,
  abortControllerRef: React.MutableRefObject<AbortController | null>,
  setIsLoading: (loading: boolean) => void,
  setCurrentAgentOptimizing: (content: string) => void,
  setCurrentThinking: (thinking: string) => void,
  setCurrentAnswer: (answer: string) => void,
  clearStreamState: () => void,
  updateConversationTree: (flatMessages: Map<string, FlatMessage>, activePath: string[]) => void,
  tempContent?: string,
  tempPlacement: 'append' | 'after_system' = 'append',
  tempContentList?: string[]
): Promise<void> {
  // 创建占位AI消息，显示"正在优化输入"
  const placeholderAI = createFlatMessage('正在优化输入...', 'assistant', userMessage.id)
  const { newFlatMessages: withPlaceholder, newActivePath: pathWithAI } = addMessageToTree(
    flatMessages,
    activePath,
    placeholderAI
  )
  updateConversationTree(withPlaceholder, pathWithAI)
  setIsLoading(true)

  try {
    // 调用 Agent 进行输入优化
    const agentResult = await agentEngine.processUserInput(
      userContent,
      components,
      config.agentConfig!,
      config,
      undefined,
      (optimizedContent) => {
        setCurrentAgentOptimizing(optimizedContent)
      }
    )
    
    // 使用 agent 优化后的输入
    const finalContent = agentResult.finalInput || userContent
    
    // 更新用户消息：保持原始 content 不变，将优化后的内容存到 components.optimizedInput
    const updatedUserMessage = {
      ...userMessage,
      components: {
        ...userMessage.components,
        optimizedInput: finalContent !== userContent ? finalContent : undefined
      }
    }
    const updatedFlatMessages = new Map(withPlaceholder)
    updatedFlatMessages.set(userMessage.id, updatedUserMessage)
    
    // 更新占位AI消息，添加 Agent 处理结果到 components
    const aiComponents: MessageComponents = {
      agentResults: agentResult.results.length > 0 ? agentResult.results : undefined
    }
    const updatedPlaceholderAI = {
      ...placeholderAI,
      content: '正在生成...',
      components: aiComponents
    }
    updatedFlatMessages.set(placeholderAI.id, updatedPlaceholderAI)
    
    updateConversationTree(updatedFlatMessages, pathWithAI)
    
    // 继续生成 AI 回复
    const conversationHistory = getConversationHistory(updatedUserMessage.id, updatedFlatMessages)
    
    abortControllerRef.current = new AbortController()
    let currentGeneratedContent = ''
    let currentReasoningContent = ''
    
    try {
      const result = await callAIAPI(
        conversationHistory,
        config,
        abortControllerRef.current.signal,
        (thinking) => {
          currentReasoningContent = thinking
          setCurrentThinking(thinking)
        },
        (answer) => {
          currentGeneratedContent = answer
          setCurrentAnswer(answer)
        },
        tempContent,
        tempPlacement,
        tempContentList
      )
      
      // 更新最终消息
      const finalAIMessage = {
        ...updatedPlaceholderAI,
        content: result.content,
        reasoning_content: result.reasoning_content,
        components: aiComponents
      }
      updatedFlatMessages.set(placeholderAI.id, finalAIMessage)
      updateConversationTree(updatedFlatMessages, pathWithAI)
    } catch (error: any) {
      // 处理中断或错误
      if (error.name === 'AbortError') {
        const finalContent = currentGeneratedContent.trim() || '生成被中断'
        const finalReasoning = currentReasoningContent.trim() || undefined
        const finalAIMessage = {
          ...updatedPlaceholderAI,
          content: finalContent,
          reasoning_content: finalReasoning,
          components: aiComponents
        }
        updatedFlatMessages.set(placeholderAI.id, finalAIMessage)
        updateConversationTree(updatedFlatMessages, pathWithAI)
      } else {
        const errorMessage = {
          ...updatedPlaceholderAI,
          content: `生成失败: ${error.message || '未知错误'}`,
          components: aiComponents
        }
        updatedFlatMessages.set(placeholderAI.id, errorMessage)
        updateConversationTree(updatedFlatMessages, pathWithAI)
      }
    } finally {
      setIsLoading(false)
      clearStreamState()
      abortControllerRef.current = null
    }
  } catch (error) {
    console.error('Agent 处理失败:', error)
    
    // 移除占位AI消息
    const updatedFlatMessages = new Map(withPlaceholder)
    updatedFlatMessages.delete(placeholderAI.id)
    const finalPath = pathWithAI.slice(0, -1)
    
    updateConversationTree(updatedFlatMessages, finalPath)
    setIsLoading(false)
    clearStreamState()
    
    // 重新抛出错误，让调用者处理
    throw error
  }
}

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

  /**
   * 生成AI回复的核心逻辑
   * 创建占位消息、调用API、更新最终结果
   */
  const generateAIReply = useCallback(async (
    userMessage: FlatMessage,
    currentFlatMessages?: Map<string, FlatMessage>,
    currentActivePath?: string[],
    tempContent?: string,
    tempPlacement: 'append' | 'after_system' = 'append',
    tempContentList?: string[]
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
      const finalMessage = await generateAIMessage(
        conversationHistory,
        placeholderMessage,
        config,
        abortControllerRef.current,
        setCurrentThinking,
        setCurrentAnswer,
        tempContent,
        tempPlacement,
        tempContentList
      )
      


      // 更新最终消息
      const finalFlatMessages = new Map(newFlatMessages)
      finalFlatMessages.set(placeholderMessage.id, finalMessage)
      updateConversationTree(finalFlatMessages, newActivePath)
      
    } finally {
      setIsLoading(false)
      clearStreamState()
      abortControllerRef.current = null
    }
  }, [conversationTree, config, updateConversationTree, clearStreamState])

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
  const sendMessage = useCallback(async (content: string, parentNodeId: string | null = null, tempContent?: string, tempPlacement: 'append' | 'after_system' = 'append', tempContentList?: string[]) => {
    if (isLoading || !content.trim()) return

    // 确定父节点ID
    const actualParentId = parentNodeId || (
      conversationTree.activePath.length > 0 
        ? conversationTree.activePath[conversationTree.activePath.length - 1]
        : null
    )

    // 构建初始消息组件
    let components: MessageComponents = {
      userInput: content.trim()
    }
    
    // 添加附加文件内容（如果有）
    if (tempContentList && tempContentList.length > 0) {
      components.attachedFiles = tempContentList
    } else if (tempContent && tempContent.trim()) {
      components.attachedFiles = [tempContent]
    }

    // 先创建用户消息并立即显示（使用原始输入）
    const userMessage = createFlatMessage(
      content.trim(), 
      'user', 
      actualParentId,
      undefined,
      components
    )
    const { newFlatMessages, newActivePath } = addMessageToTree(
      conversationTree.flatMessages,
      conversationTree.activePath,
      userMessage
    )

    // 立即更新UI，不阻塞用户
    updateConversationTree(newFlatMessages, newActivePath)

    // ===== Agent 处理（异步，不阻塞UI） =====
    if (config.agentConfig && config.agentConfig.enabled) {
      try {
        await processWithAgent(
          userMessage,
          content.trim(),
          components,
          newFlatMessages,
          newActivePath,
          config,
          abortControllerRef,
          setIsLoading,
          setCurrentAgentOptimizing,
          setCurrentThinking,
          setCurrentAnswer,
          clearStreamState,
          updateConversationTree,
          tempContent,
          tempPlacement,
          tempContentList
        )
      } catch (error) {
        // Agent 处理失败，使用原始输入继续
        await generateAIReply(userMessage, newFlatMessages, newActivePath, tempContent, tempPlacement, tempContentList)
      }
    } else {
      // 如果 Agent 未启用，直接生成 AI 回复
      await generateAIReply(userMessage, newFlatMessages, newActivePath, tempContent, tempPlacement, tempContentList)
    }
  }, [conversationTree, isLoading, generateAIReply, updateConversationTree, config, clearStreamState])

  /**
   * 编辑用户消息并重新生成AI回复
   * @param nodeId 要编辑的消息ID
   * @param newContent 新的消息内容
   */
  const handleEditUserMessage = useCallback(async (nodeId: string, newContent: string, tempContent?: string, tempPlacement: 'append' | 'after_system' = 'append', tempContentList?: string[]) => {
    if (isLoading) return

    // 获取原消息，保留或更新 components
    const originalMessage = conversationTree.flatMessages.get(nodeId)
    let components: MessageComponents = {
      userInput: newContent.trim(),
      // 保留原有的附加文件（如果有），否则使用新传入的
      attachedFiles: originalMessage?.components?.attachedFiles
    }
    
    // 更新附加文件内容（如果有新的）
    if (tempContentList && tempContentList.length > 0) {
      components.attachedFiles = tempContentList
    } else if (tempContent && tempContent.trim()) {
      components.attachedFiles = [tempContent]
    }

    // 先使用原始输入创建编辑后的消息
    const result = editUserMessage(
      conversationTree.flatMessages,
      conversationTree.activePath,
      nodeId,
      newContent.trim(),
      components
    )

    if (!result) return

    // 立即更新UI
    updateConversationTree(result.newFlatMessages, result.newActivePath)

    const editedMessageId = result.newActivePath[result.newActivePath.length - 1]
    let editedMessage = result.newFlatMessages.get(editedMessageId)
    
    if (!editedMessage) return

    // ===== Agent 处理（异步，不阻塞UI） =====
    if (config.agentConfig && config.agentConfig.enabled) {
      try {
        await processWithAgent(
          editedMessage,
          newContent.trim(),
          components,
          result.newFlatMessages,
          result.newActivePath,
          config,
          abortControllerRef,
          setIsLoading,
          setCurrentAgentOptimizing,
          setCurrentThinking,
          setCurrentAnswer,
          clearStreamState,
          updateConversationTree,
          tempContent,
          tempPlacement,
          tempContentList
        )
      } catch (error) {
        // Agent 处理失败，使用原始输入继续
        await generateAIReply(editedMessage, result.newFlatMessages, result.newActivePath, tempContent, tempPlacement, tempContentList)
      }
    } else {
      // 如果 Agent 未启用，直接生成 AI 回复
      await generateAIReply(editedMessage, result.newFlatMessages, result.newActivePath, tempContent, tempPlacement, tempContentList)
    }
  }, [conversationTree, isLoading, updateConversationTree, generateAIReply, config, clearStreamState])

  /**
   * 直接编辑AI消息（不创建分支，不重新发送）
   * @param nodeId 要编辑的消息ID
   * @param newContent 新的消息内容
   */
  const handleEditAssistantMessage = useCallback((nodeId: string, newContent: string) => {
    if (isLoading) return

    const newFlatMessages = updateAssistantMessage(
      conversationTree.flatMessages,
      nodeId,
      newContent
    )

    if (newFlatMessages) {
      updateConversationTree(newFlatMessages, conversationTree.activePath)
    }
  }, [conversationTree, isLoading, updateConversationTree])

  /**
   * 删除节点及其兄弟节点，保留被删除节点的子节点
   * @param nodeId 要删除的消息ID
   */
  const handleDeleteNode = useCallback((nodeId: string) => {
    if (isLoading) return

    const result = deleteNodeAndSiblings(
      conversationTree.flatMessages,
      conversationTree.activePath,
      nodeId
    )

    if (result) {
      updateConversationTree(result.newFlatMessages, result.newActivePath)
    }
  }, [conversationTree, isLoading, updateConversationTree])

  // 重新生成消息（合并regeneration功能）
  const regenerateMessage = useCallback(async (nodeId: string, tempContent?: string, tempPlacement: 'append' | 'after_system' = 'append') => {
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
        abortControllerRef.current,
        setCurrentThinking,
        setCurrentAnswer,
        tempContent,
        tempPlacement
      )

      const updatedFlatMessages = new Map(newFlatMessages)
      updatedFlatMessages.set(newMessage.id, finalMessage)
      updateConversationTree(updatedFlatMessages, newActivePath)

    } finally {
      setIsLoading(false)
      clearStreamState()
      abortControllerRef.current = null
    }
  }, [conversationTree, isLoading, config, updateConversationTree, clearStreamState])

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
    editUserMessage: handleEditUserMessage,
    editAssistantMessage: handleEditAssistantMessage,
    deleteNode: handleDeleteNode,
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