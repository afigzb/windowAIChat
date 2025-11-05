/**
 * 聊天面板主组件
 * 
 * 这是整个聊天界面的核心组件，协调所有子组件工作。
 * 
 * 主要功能：
 * - 对话管理（创建、切换、删除对话）
 * - 消息发送和接收（支持流式响应）
 * - 对话历史记录（持久化存储）
 * - 分支管理（多分支回复支持）
 * - 上下文管理（动态计算上下文窗口）
 * - 消息预览（发送前预览请求详情）
 * - 对话概括（新建对话并总结历史）
 * - 文件内容集成（将选中文件内容注入到消息中）
 * 
 * 子组件：
 * - ChatInputArea: 消息输入区域
 * - MessageBubble: 消息气泡显示
 * - MessagePreviewDialog: 消息预览对话框
 * - 对话历史抽屉（内联实现）
 */

import { useState, useRef, useEffect } from 'react'
import type { AIConfig, ConversationTree, FlatMessage } from '../types'
import { MessageBubble, ChatInputArea } from './components'
import { useConversationManager } from '../core/conversation-manager'
import { useBranchManager } from '../core/branch-manager'
import { useConversationHistory } from '../core/conversation-history'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useConfirm } from '../../components/useConfirm'
import { contextEngine, setSystemPrompt, clearSystemPrompt, buildSummarizePlan } from '../core/context'
import { MessagePreviewDialog } from './MessagePreviewDialog'
import { getPreviewData } from '../core/api'
import { getConversationHistory, createFlatMessage } from '../core/tree-utils'
import { useSmartScroll } from './useSmartScroll'

interface ChatPanelProps {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
  additionalContent?: (() => Promise<string>) | string // 额外的上下文内容（如选中的文件内容）
  additionalContentList?: () => Promise<string[]> // 额外的上下文内容列表（用于独立插入模式）
}

/**
 * 将对话树的有效历史消息转换为文本格式
 * 根据 historyLimit 配置限制消息数量
 */
function getConversationHistoryText(tree: ConversationTree, config: AIConfig): string {
  const pathIds = tree.activePath
  const flat = tree.flatMessages

  // 获取活跃路径上的所有用户和助手消息
  const history = pathIds
    .map(id => flat.get(id))
    .filter((m): m is NonNullable<typeof m> => !!m)
    .filter(m => m.role === 'user' || m.role === 'assistant')

  // 根据 historyLimit 限制消息数量
  const limit = Math.max(0, config.historyLimit || 0)
  const includedMessages = limit > 0 ? history.slice(-limit) : history

  // 如果没有历史消息，返回空字符串
  if (includedMessages.length === 0) {
    return ''
  }

  // 将消息格式化为文本
  const lines = includedMessages.map(msg => {
    const roleLabel = msg.role === 'user' ? '用户' : '助手'
    return `${roleLabel}：${msg.content}`
  })

  return lines.join('\n\n')
}

export function ChatPanel({
  config,
  onConfigChange,
  additionalContent,
  additionalContentList
}: ChatPanelProps) {
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewData, setPreviewData] = useState<{
    requestBody: Record<string, any>
    headers: Record<string, string>
    url: string
  } | null>(null)
  const chatInputRef = useRef<{ focus: () => void; getValue: () => string; clear: () => void }>(null)
  const historyDrawerRef = useRef<HTMLDivElement>(null)
  const { confirm, confirmProps } = useConfirm()
  
  // 记录预览时的依赖快照，用于检测是否需要自动刷新
  const previewDepsRef = useRef<{
    inputValue: string
    activePath: string[]
  } | null>(null)
  
  // 对话历史管理
  const conversationHistory = useConversationHistory()
  
  // 对话管理器
  const {
    state: conversationState,
    actions: conversationActions,
    activeNodes,
    regenerateMessage
  } = useConversationManager(config)

  // 分支管理器
  const branchManager = useBranchManager({
    conversationTree: conversationState.conversationTree,
    updateActivePath: conversationActions.updateActivePath
  })

  // 智能滚动管理
  const { scrollContainerRef } = useSmartScroll({
    trigger: conversationState.conversationTree.flatMessages.size,
    isGenerating: conversationState.isLoading
  })

  // 当前选中的对话 ID
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    conversationHistory.currentConversationId
  )

  // 初始化第一次加载
  useEffect(() => {
    if (!currentConversationId) {
      if (conversationHistory.conversations.length === 0) {
        const newId = conversationHistory.createNewConversation()
        setCurrentConversationId(newId)
      } else {
        // 使用conversation-history中已经处理好的活跃对话ID
        setCurrentConversationId(conversationHistory.currentConversationId)
      }
    }
  }, [])

  // 加载对话内容
  useEffect(() => {
    if (currentConversationId) {
      const loadedTree = conversationHistory.loadConversation(currentConversationId)
      if (loadedTree) {
        conversationActions.updateConversationTree(loadedTree.flatMessages, loadedTree.activePath)
      }
    }
  }, [currentConversationId])

  // 当对话树更新时，同步到历史记录
  useEffect(() => {
    if (currentConversationId && conversationState.conversationTree.flatMessages.size > 0) {
      conversationHistory.updateConversation(currentConversationId, conversationState.conversationTree)
    }
  }, [conversationState.conversationTree])

  // 点击外部关闭抽屉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 如果有确认对话框打开，不处理外部点击
      if (confirmProps.isOpen) {
        return
      }
      
      if (showHistoryDrawer && historyDrawerRef.current && !historyDrawerRef.current.contains(event.target as Node)) {
        setShowHistoryDrawer(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showHistoryDrawer, confirmProps.isOpen])

  /**
   * 统一的文件内容获取函数
   * 根据配置获取额外的文件内容，支持合并模式和独立模式
   */
  const getFileContent = async (): Promise<{
    extraContent: string
    extraContentList: string[] | undefined
    placement: 'append' | 'after_system'
  }> => {
    // 使用配置的文件内容插入位置和模式
    const placement = config.fileContentPlacement ?? 'append'
    const mode = config.fileContentMode ?? 'merged'
    
    // 根据模式获取文件内容
    let extraContent = ''
    let extraContentList: string[] | undefined = undefined
    
    if (placement === 'after_system' && mode === 'separate' && additionalContentList) {
      // 独立模式：获取文件列表
      extraContentList = await additionalContentList()
    } else if (additionalContent) {
      // 合并模式或 append 模式：获取合并后的内容
      if (typeof additionalContent === 'function') {
        extraContent = await additionalContent()
      } else {
        extraContent = additionalContent
      }
    }
    
    return { extraContent, extraContentList, placement }
  }

  // 处理发送
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || conversationState.isLoading) return
    
    const { extraContent, extraContentList, placement } = await getFileContent()
    conversationActions.sendMessage(content, null, extraContent, placement, extraContentList)
  }

  // 生成预览数据（不打开对话框）
  const generatePreviewData = async () => {
    try {
      // 获取输入框的值
      const inputValue = chatInputRef.current?.getValue() || ''

      // 获取额外内容（使用统一的文件内容获取函数）
      const { extraContent, extraContentList, placement } = await getFileContent()

      // 获取对话历史（与实际发送时的逻辑完全一致）
      // 从活跃路径获取最后一个节点ID，如果没有则使用null
      const lastNodeId = conversationState.conversationTree.activePath.length > 0
        ? conversationState.conversationTree.activePath[conversationState.conversationTree.activePath.length - 1]
        : null

      let history: FlatMessage[] = []
      if (lastNodeId) {
        history = getConversationHistory(
          lastNodeId,
          conversationState.conversationTree.flatMessages
        )
      }

      // 创建临时的用户消息（不添加到树中）
      const tempUserMessage = createFlatMessage(
        inputValue,
        'user',
        null
      )

      // 将临时消息添加到历史中用于预览
      const historyWithCurrentMessage = [...history, tempUserMessage]

      // 使用与实际发送完全相同的逻辑获取预览数据
      const { url, headers, body } = getPreviewData(
        historyWithCurrentMessage,
        config,
        extraContent,
        placement,
        extraContentList
      )

      setPreviewData({ 
        requestBody: body, 
        headers, 
        url 
      })
      
      // 记录当前预览的依赖快照
      previewDepsRef.current = {
        inputValue: inputValue,
        activePath: [...conversationState.conversationTree.activePath]
      }
    } catch (error: any) {
      console.error('生成预览数据失败:', error)
      alert(`预览失败: ${error.message || '未知错误'}`)
    }
  }

  // 处理预览（生成数据并打开对话框）
  const handlePreview = async () => {
    await generatePreviewData()
    setShowPreviewDialog(true)
  }

  // 概括状态
  const [pendingSummarize, setPendingSummarize] = useState<{
    userMessageContent: string
    extraContext: string
    systemPrompt: string
  } | null>(null)

  // 处理挂起的概括请求
  useEffect(() => {
    if (pendingSummarize && currentConversationId && conversationState.conversationTree.flatMessages.size === 0) {
      const { userMessageContent, extraContext, systemPrompt } = pendingSummarize
      setPendingSummarize(null)
      
      // 发送概括请求
      const doSummarize = async () => {
        try {
          // 使用覆盖模式（override=true）确保概括提示词不会与 prompt 卡片合并
          setSystemPrompt(systemPrompt, true)
          // 计算当前激活路径的对话摘录（仅 user/assistant），用于提供更完整上下文
          const pathIds = conversationState.conversationTree.activePath
          const flat = conversationState.conversationTree.flatMessages
          const transcriptParts: string[] = []
          for (const id of pathIds) {
            const m = flat.get(id)
            if (m && (m.role === 'user' || m.role === 'assistant')) {
              const prefix = m.role === 'user' ? '用户' : '助手'
              transcriptParts.push(`${prefix}: ${m.content}`)
            }
          }
          const transcript = transcriptParts.length > 0 ? `\n\n【过往对话】\n${transcriptParts.join('\n')}` : ''
          const mergedExtra = `${extraContext || ''}${transcript}`
          // 将上下文放置于 system 之后，避免被拼接到最后一条用户消息
          await conversationActions.sendMessage(userMessageContent, null, mergedExtra, 'after_system')
        } finally {
          clearSystemPrompt()
        }
      }
      doSummarize()
    }
  }, [pendingSummarize, currentConversationId, conversationState.conversationTree.flatMessages.size, conversationActions, conversationState.conversationTree.activePath, conversationState.conversationTree.flatMessages])

  // 概括：新建对话 -> 使用输入为主体，文件内容拼接到尾部 -> 一次性系统提示
  const handleSummarize = async () => {
    if (conversationState.isLoading) return

    // 1) 获取当前对话的有效历史上下文（根据 historyLimit 限制）
    const conversationHistoryText = getConversationHistoryText(
      conversationState.conversationTree,
      config
    )

    // 2) 收集已选文件内容
    let filesText = ''
    if (additionalContent) {
      filesText = typeof additionalContent === 'function' 
        ? await additionalContent() 
        : additionalContent
      filesText = filesText?.trim() || ''
    }

    // 3) 获取输入框的值
    const inputValue = chatInputRef.current?.getValue() || ''

    // 4) 使用与聊天系统解耦的概括构建器，包含对话历史
    const plan = buildSummarizePlan(
      inputValue?.trim(),
      conversationHistoryText,
      filesText,
      config.summarizePrompt
    )

    // 5) 设置挂起状态，然后新建对话
    setPendingSummarize({
      userMessageContent: plan.userMessageContent,
      extraContext: plan.extraContext,
      systemPrompt: plan.systemPrompt
    })

    // 6) 清空输入框
    chatInputRef.current?.clear()

    // 7) 新建对话并切换
    const newId = conversationHistory.createNewConversation()
    setCurrentConversationId(newId)
    conversationActions.updateConversationTree(new Map(), [])
  }

  // 处理删除对话
  const handleDeleteConversation = async (conversationId: string, conversationTitle: string) => {
    const shouldDelete = await confirm({
      title: '确认删除',
      message: `确定要删除对话"${conversationTitle}"吗？此操作不可恢复。`,
      confirmText: '删除',
      cancelText: '取消',
      type: 'danger'
    })
    
    if (!shouldDelete) {
      // 恢复输入区域焦点
      setTimeout(() => {
        chatInputRef.current?.focus()
      }, 100)
      return
    }
    
    // 删除对话，conversation-history会自动处理活跃对话的选择
    conversationHistory.deleteConversation(conversationId)
    
    // 同步更新本地的currentConversationId
    setCurrentConversationId(conversationHistory.currentConversationId)
    
    // 如果删除后没有对话了，创建新对话
    if (conversationHistory.conversations.length === 0) {
      const newId = conversationHistory.createNewConversation()
      setCurrentConversationId(newId)
    } else {
      // 加载新的活跃对话
      const activeId = conversationHistory.currentConversationId
      if (activeId) {
        const tree = conversationHistory.loadConversation(activeId)
        if (tree) {
          conversationActions.updateConversationTree(tree.flatMessages, tree.activePath)
        }
      } else {
        conversationActions.updateConversationTree(new Map(), [])
      }
    }
    
    // 恢复输入区域焦点
    setTimeout(() => {
      chatInputRef.current?.focus()
    }, 100)
  }
  
  // 处理清空所有对话
  const handleClearConversations = async () => {
    const shouldClear = await confirm({
      title: '确认清空',
      message: '确定要清空所有对话历史吗？此操作不可恢复。',
      confirmText: '清空',
      cancelText: '取消',
      type: 'danger'
    })
    
    if (!shouldClear) {
      // 恢复输入区域焦点
      setTimeout(() => {
        chatInputRef.current?.focus()
      }, 100)
      return
    }
    
    conversationHistory.clearAllConversations()
    const newId = conversationHistory.createNewConversation()
    setCurrentConversationId(newId)
    conversationActions.updateConversationTree(new Map(), [])
    
    // 恢复输入区域焦点
    setTimeout(() => {
      chatInputRef.current?.focus()
    }, 100)
  }

  // 处理删除节点
  const handleDeleteNode = async (nodeId: string) => {
    const shouldDelete = await confirm({
      title: '确认删除',
      message: '特别注意，删除按钮会将该节点对应的其他分支节点一起删除，只留下该节点后的子节点。并且此操作不可恢复。',
      confirmText: '删除',
      cancelText: '取消',
      type: 'danger'
    })
    
    if (!shouldDelete) {
      // 恢复输入区域焦点
      setTimeout(() => {
        chatInputRef.current?.focus()
      }, 100)
      return
    }
    
    conversationActions.deleteNode(nodeId)
    
    // 恢复输入区域焦点
    setTimeout(() => {
      chatInputRef.current?.focus()
    }, 100)
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-l-2 border-gray-200 flex flex-col h-full min-w-0">

      {/* AI区域标题 - 固定高度，不换行 */}
      <header className="flex-shrink-0 px-6 py-4 h-16 border-b-2 border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between h-full min-w-0 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 animate-pulse shadow-lg shadow-blue-500/30"></div>
            <h2 className="font-bold text-gray-900 text-lg whitespace-nowrap overflow-hidden text-ellipsis" title="AI写作助手">
              AI写作助手
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* 预览按钮 */}
            <button
              onClick={handlePreview}
              disabled={conversationState.isLoading}
              className={`p-2.5 rounded-xl transition-all duration-300 flex-shrink-0 ${
                !conversationState.isLoading
                  ? 'text-gray-600 hover:text-purple-600 hover:bg-purple-50 hover:shadow-md hover:scale-105'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="预览消息"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>

            <div className="relative" ref={historyDrawerRef}>
              <button
                onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                className={`p-2.5 rounded-xl transition-all duration-300 flex-shrink-0 ${
                  showHistoryDrawer 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-110' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 hover:shadow-md hover:scale-105'
                }`}
                title="对话历史"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              {/* 对话历史抽屉 */}
              {showHistoryDrawer && (
                <div className="fixed top-8 right-18 w-[420px] bg-white border-2 border-gray-200 rounded-xl shadow-2xl z-50 max-h-[480px] flex flex-col">
                    {/* 抽屉头部 */}
                    <div className="flex items-center h-16 rounded-t-xl justify-between p-5 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm"></div>
                        <h3 className="text-base font-bold text-gray-900">对话历史</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            const newId = conversationHistory.createNewConversation()
                            setCurrentConversationId(newId)
                            conversationActions.updateConversationTree(new Map(), [])
                          }}
                          className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md" 
                          title="新建对话"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <button 
                          onClick={handleClearConversations}
                          className="text-sm text-gray-600 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all duration-200 whitespace-nowrap font-medium"
                          title="清空所有对话"
                        >
                          清空
                        </button>
                      </div>
                    </div>
                    
                    {/* 抽屉内容 - 可滚动的对话列表 */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {conversationHistory.conversations.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <p className="text-base font-medium">暂无对话历史</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {conversationHistory.conversations.map((conv) => {
                            const isActive = conv.id === currentConversationId
                            const timeStr = new Date(conv.timestamp).toLocaleString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              month: 'numeric',
                              day: 'numeric'
                            })
                            
                            return (
                              <div 
                                key={conv.id}
                                onClick={() => {
                                  if (conv.id !== currentConversationId) {
                                    const tree = conversationHistory.loadConversation(conv.id)
                                    if (tree) {
                                      setCurrentConversationId(conv.id)
                                      conversationActions.updateConversationTree(tree.flatMessages, tree.activePath)
                                    }
                                  }
                                }}
                                className={`group rounded-xl border-2 transition-all duration-300 cursor-pointer p-4 transform hover:scale-[1.02] ${
                                  isActive 
                                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-md' 
                                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50'
                                }`}
                              >
                                <div className="flex items-start justify-between min-w-0">
                                  <div className="flex-1 min-w-0">
                                    <h4 className={`text-base font-semibold truncate mb-2 ${
                                      isActive ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-700'
                                    }`} title={conv.title}>
                                      {conv.title}
                                    </h4>
                                    <time className="text-sm text-gray-500 whitespace-nowrap block" dateTime={new Date(conv.timestamp).toISOString()}>
                                      {timeStr}
                                    </time>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                    <button
                                      onClick={() => handleDeleteConversation(conv.id, conv.title)}
                                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 rounded-lg flex items-center justify-center"
                                      title="删除对话"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                    <div className="w-3 h-3 flex items-center justify-center">
                                      {isActive && (
                                        <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm animate-pulse"></div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
              )}
            </div>
            
            {/* 移除原设置入口，设置改由左侧工具栏管理 */}
          </div>
        </div>
      </header>
      
      {/* 当前对话区域 - 占据全部空间 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50 min-h-0">
          {/* 上下文统计条（由 ContextEngine 提供数据）*/}
          {(() => {
            const meta = contextEngine.getContextMetadataFromTree(conversationState.conversationTree, config)
            if (meta.totalMessages === 0) return null
            const limit = Math.max(0, config.historyLimit || 0)
            return (
              <div className="sticky top-0 z-10 px-6 py-2 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border-b-2 border-blue-200 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm whitespace-nowrap overflow-hidden">
                    <span className="text-blue-700 font-semibold">上下文</span>
                    <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 font-medium">计入 {meta.includedMessages}</span>
                    {meta.excludedMessages > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700">未计入 {meta.excludedMessages}</span>
                    )}
                    <span className="text-gray-500">(历史消息共 {meta.totalMessages} 条，保留上限 {limit || '∞'})</span>
                  </div>
                  {/* 概括按钮 */}
                  <button
                    onClick={handleSummarize}
                    className="px-2 py-1 rounded text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100/50 transition-all duration-200 flex items-center gap-1 border border-blue-200 hover:border-blue-300 whitespace-nowrap"
                    title="新建对话并对当前上下文进行概括"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h8M6 10h12M8 14h8M10 18h4" />
                    </svg>
                    <span>概括</span>
                  </button>
                </div>
              </div>
            )
          })()}
          <div className="space-y-0">
            {activeNodes.map((node) => {
              const branchNavigation = branchManager.getBranchNavigationForNode(node.id)
              const isInActivePath = conversationState.conversationTree.activePath.includes(node.id)
              const isGeneratingNode = conversationState.isLoading && (node.content === '正在生成...' || node.content === '正在优化输入...')
              
              // 计算是否计入上下文：由 ContextEngine 提供
              let isInContext: boolean | undefined = undefined
              if (node.role === 'user' || node.role === 'assistant') {
                const meta = contextEngine.getContextMetadataFromTree(conversationState.conversationTree, config)
                isInContext = !!meta.inclusionMap.get(node.id)
              }
              
              // 创建包装函数以传递临时内容
              const handleRegenerate = async (nodeId: string) => {
                const { extraContent, extraContentList, placement } = await getFileContent()
                return regenerateMessage(nodeId, extraContent, placement, extraContentList)
              }

              const handleEditUserMessage = async (nodeId: string, newContent: string) => {
                const { extraContent, extraContentList, placement } = await getFileContent()
                return conversationActions.editUserMessage(nodeId, newContent, extraContent, placement, extraContentList)
              }

              const handleEditAssistantMessage = (nodeId: string, newContent: string) => {
                conversationActions.editAssistantMessage(nodeId, newContent)
              }
              
              return (
                <MessageBubble 
                  key={node.id} 
                  node={node}
                  onRegenerate={!conversationState.isLoading ? handleRegenerate : undefined}
                  onEditUserMessage={!conversationState.isLoading ? handleEditUserMessage : undefined}
                  onEditAssistantMessage={!conversationState.isLoading ? handleEditAssistantMessage : undefined}
                  onDelete={!conversationState.isLoading ? handleDeleteNode : undefined}
                  branchNavigation={branchNavigation}
                  onBranchNavigate={(direction) => branchManager.navigateToSibling(node.id, direction)}
                  isInActivePath={isInActivePath}
                  showBranchControls={!conversationState.isLoading && branchNavigation.totalBranches > 1}
                  isGenerating={isGeneratingNode}
                  currentThinking={isGeneratingNode ? conversationState.currentThinking : ''}
                  currentAnswer={isGeneratingNode ? conversationState.currentAnswer : ''}
                  currentAgentOptimizing={isGeneratingNode ? conversationState.currentAgentOptimizing : ''}
                  isInContext={isInContext}
                />
              )
            })}
          </div>
        </div>

        {/* AI输入区域 */}
        <div>
          <ChatInputArea
            ref={chatInputRef}
            onSend={handleSendMessage}
            isLoading={conversationState.isLoading}
            onAbort={conversationActions.abortRequest}
            config={config}
            onProviderChange={(providerId) => onConfigChange({
              ...config,
              currentProviderId: providerId
            })}
          />
        </div>
      </div>

      {/* 统一的确认对话框 */}
      <ConfirmDialog {...confirmProps} />
      
      {/* 消息预览对话框 */}
      <MessagePreviewDialog
        isOpen={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        previewData={previewData}
        onRefreshPreview={generatePreviewData}
      />
    </div>
  )
}