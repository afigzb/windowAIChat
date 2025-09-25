import { useState, useRef, useEffect } from 'react'
import type { AIConfig, ChatMode } from './types'
import { MessageBubble, ChatInputArea } from './components'
import { useConversationManager } from './conversation-manager'
import { useBranchManager } from './branch-manager'
import { useConversationHistory } from './conversation-history'
import { ConfirmDialog } from '../writing/components/ConfirmDialog'

interface ChatPanelProps {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
  currentMode: ChatMode
  onModeChange: (mode: ChatMode) => void
  additionalContent?: (() => Promise<string>) | string // 额外的上下文内容（如选中的文件内容）
}

export function ChatPanel({
  config,
  onConfigChange,
  currentMode,
  onModeChange,
  additionalContent
}: ChatPanelProps) {
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<{id: string, title: string} | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<{ focus: () => void }>(null)
  const historyDrawerRef = useRef<HTMLDivElement>(null)
  
  // 对话历史管理
  const conversationHistory = useConversationHistory()
  
  // 对话管理器
  const {
    state: conversationState,
    actions: conversationActions,
    activeNodes,
    regenerateMessage
  } = useConversationManager(config, currentMode)

  // 分支管理器
  const branchManager = useBranchManager({
    conversationTree: conversationState.conversationTree,
    updateActivePath: conversationActions.updateActivePath
  })

  // 当前选中的对话 ID
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    conversationHistory.currentConversationId
  )

  // 初始化第一次加载
  useEffect(() => {
    if (!currentConversationId) {
      if (conversationHistory.conversations.length === 0) {
        const newId = conversationHistory.createNewConversation(currentMode)
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

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationState.conversationTree.activePath])

  // 点击外部关闭抽屉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 如果有确认对话框打开，不处理外部点击
      if (showClearConfirm || showDeleteConfirm) {
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
  }, [showHistoryDrawer, showClearConfirm, showDeleteConfirm])

  // 处理发送
  const handleSendMessage = async () => {
    if (!conversationState.inputValue.trim() || conversationState.isLoading) return
    
    const content = conversationState.inputValue
    conversationActions.updateInputValue('')
    
    // 获取额外内容
    let extraContent = ''
    if (additionalContent) {
      if (typeof additionalContent === 'function') {
        extraContent = await additionalContent()
      } else {
        extraContent = additionalContent
      }
    }
    
    conversationActions.sendMessage(content, null, extraContent)
  }

  // 处理删除对话
  const handleDeleteConversation = () => {
    if (!conversationToDelete) return
    
    // 删除对话，conversation-history会自动处理活跃对话的选择
    conversationHistory.deleteConversation(conversationToDelete.id)
    
    // 同步更新本地的currentConversationId
    setCurrentConversationId(conversationHistory.currentConversationId)
    
    // 如果删除后没有对话了，创建新对话
    if (conversationHistory.conversations.length === 0) {
      const newId = conversationHistory.createNewConversation(currentMode)
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
    
    setShowDeleteConfirm(false)
    setConversationToDelete(null)
    // 恢复输入区域焦点
    setTimeout(() => {
      chatInputRef.current?.focus()
    }, 100)
  }

  return (
    <div className="bg-slate-50 border-l border-slate-300 flex flex-col h-full min-w-0">

      {/* AI区域标题 - 固定高度，不换行 */}
      <header className="flex-shrink-0 px-3 py-2 h-16 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between h-full min-w-0 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0"></div>
            <h2 className="font-semibold text-slate-900 text-sm whitespace-nowrap overflow-hidden text-ellipsis" title="AI写作助手">
              AI写作助手
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative" ref={historyDrawerRef}>
              <button
                onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                className={`p-1.5 rounded-md transition-all duration-200 flex-shrink-0 ${
                  showHistoryDrawer 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                }`}
                title="对话历史"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              {/* 对话历史抽屉 */}
              {showHistoryDrawer && (
                <div className="fixed top-14 right-8 w-96 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-96 flex flex-col">
                    {/* 抽屉头部 */}
                    <div className="flex items-center justify-between p-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                        <h3 className="text-sm font-semibold text-slate-900">对话历史</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            const newId = conversationHistory.createNewConversation(currentMode)
                            setCurrentConversationId(newId)
                            conversationActions.updateConversationTree(new Map(), [])
                          }}
                          className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors" 
                          title="新建对话"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => {
                            setShowClearConfirm(true)
                          }}
                          className="text-xs text-slate-600 hover:text-slate-900 px-1.5 py-1 rounded hover:bg-white transition-colors whitespace-nowrap"
                          title="清空所有对话"
                        >
                          清空
                        </button>
                      </div>
                    </div>
                    
                    {/* 抽屉内容 - 可滚动的对话列表 */}
                    <div className="flex-1 overflow-y-auto p-2">
                      {conversationHistory.conversations.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          暂无对话历史
                        </div>
                      ) : (
                        <div className="space-y-1">
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
                                className={`group rounded-md border transition-all duration-200 cursor-pointer p-2 ${
                                  isActive 
                                    ? 'bg-indigo-50 border-indigo-300 shadow-sm' 
                                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-start justify-between min-w-0">
                                  <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm font-medium truncate mb-1 ${
                                      isActive ? 'text-indigo-700' : 'text-slate-900 group-hover:text-indigo-700'
                                    }`} title={conv.title}>
                                      {conv.title}
                                    </h4>
                                    <time className="text-xs text-slate-500 whitespace-nowrap block" dateTime={new Date(conv.timestamp).toISOString()}>
                                      {timeStr}
                                    </time>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                    <button
                                      onClick={() => {
                                        setConversationToDelete({ id: conv.id, title: conv.title })
                                        setShowDeleteConfirm(true)
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-all duration-200 rounded flex items-center justify-center"
                                      title="删除对话"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                    <div className="w-2 h-2 flex items-center justify-center">
                                      {isActive && (
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
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
        <div className="flex-1 overflow-y-auto bg-white min-h-0">
          <div className="space-y-0">
            {activeNodes.map((node) => {
                  const branchNavigation = branchManager.getBranchNavigationForNode(node.id)
                  const isInActivePath = conversationState.conversationTree.activePath.includes(node.id)
                  const isGeneratingNode = conversationState.isLoading && node.content === '正在生成...'
                  
                  // 创建包装函数以传递临时内容
                  const handleRegenerate = async (nodeId: string) => {
                    let extraContent = ''
                    if (additionalContent) {
                      if (typeof additionalContent === 'function') {
                        extraContent = await additionalContent()
                      } else {
                        extraContent = additionalContent
                      }
                    }
                    return regenerateMessage(nodeId, extraContent)
                  }

                  const handleEditUserMessage = async (nodeId: string, newContent: string) => {
                    let extraContent = ''
                    if (additionalContent) {
                      if (typeof additionalContent === 'function') {
                        extraContent = await additionalContent()
                      } else {
                        extraContent = additionalContent
                      }
                    }
                    return conversationActions.editUserMessage(nodeId, newContent, extraContent)
                  }
                  
                  return (
                    <MessageBubble 
                      key={node.id} 
                      node={node}
                      onRegenerate={!conversationState.isLoading ? handleRegenerate : undefined}
                      onEditUserMessage={!conversationState.isLoading ? handleEditUserMessage : undefined}
                      branchNavigation={branchNavigation}
                      onBranchNavigate={(direction) => branchManager.navigateToSibling(node.id, direction)}
                      isInActivePath={isInActivePath}
                      showBranchControls={!conversationState.isLoading && branchNavigation.totalBranches > 1}
                      isGenerating={isGeneratingNode}
                      currentThinking={isGeneratingNode ? conversationState.currentThinking : ''}
                      currentAnswer={isGeneratingNode ? conversationState.currentAnswer : ''}
                    />
                  )
                })}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* AI输入区域 */}
            <div className="bg-white border-t border-slate-200 flex-shrink-0">
              <ChatInputArea
                ref={chatInputRef}
                value={conversationState.inputValue}
                onChange={conversationActions.updateInputValue}
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

      {/* 清空确认对话框 */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="确认清空"
        message="确定要清空所有对话历史吗？此操作不可恢复。"
        confirmText="清空"
        cancelText="取消"
        type="danger"
        onConfirm={() => {
          conversationHistory.clearAllConversations()
          const newId = conversationHistory.createNewConversation(currentMode)
          setCurrentConversationId(newId)
          conversationActions.updateConversationTree(new Map(), [])
          setShowClearConfirm(false)
          // 恢复输入区域焦点
          setTimeout(() => {
            chatInputRef.current?.focus()
          }, 100)
        }}
        onCancel={() => {
          setShowClearConfirm(false)
          // 恢复输入区域焦点
          setTimeout(() => {
            chatInputRef.current?.focus()
          }, 100)
        }}
      />

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="确认删除"
        message={conversationToDelete ? `确定要删除对话"${conversationToDelete.title}"吗？此操作不可恢复。` : ''}
        confirmText="删除"
        cancelText="取消"
        type="danger"
        onConfirm={handleDeleteConversation}
        onCancel={() => {
          setShowDeleteConfirm(false)
          setConversationToDelete(null)
          // 恢复输入区域焦点
          setTimeout(() => {
            chatInputRef.current?.focus()
          }, 100)
        }}
      />
    </div>
  )
}