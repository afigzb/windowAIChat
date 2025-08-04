import { useState, useRef, useEffect } from 'react'
import type { AIConfig, ChatMode } from './types'
import { MessageBubble, AISettings, ChatInputArea } from './components'
import { useConversationManager } from './conversation-manager'
import { useBranchManager } from './branch-manager'
import { useConversationHistory } from './conversation-history'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
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
  const [showSettings, setShowSettings] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<{ focus: () => void }>(null)
  
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
        setCurrentConversationId(conversationHistory.conversations[0].id)
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

  return (
    <div className="bg-slate-50 border-l border-slate-300 flex flex-col h-full min-w-0">
      {/* 设置侧边栏 */}
      <AISettings
        config={config}
        onConfigChange={onConfigChange}
        onClose={() => setShowSettings(false)}
        isOpen={showSettings}
      />

      {/* AI区域标题 - 固定高度，不换行 */}
      <header className="flex-shrink-0 px-3 py-2 h-16 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between h-full min-w-0 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0"></div>
            <h2 className="font-semibold text-slate-900 text-sm whitespace-nowrap overflow-hidden text-ellipsis" title="AI写作助手">
              AI写作助手
            </h2>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-md transition-all duration-200 flex-shrink-0 ${
              showSettings 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
            }`}
            title="AI设置"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
      </header>
      
      {/* AI区域内容 - 垂直分割 */}
      <PanelGroup direction="vertical" className="flex-1 min-h-0">
        {/* 对话历史区域 */}
        <Panel defaultSize={35}>
          <div className="bg-slate-50 border-b border-slate-200 h-full flex flex-col min-w-0">
            {/* 对话历史标题栏 - 固定高度 */}
            <header className="flex-shrink-0 p-3 border-b border-slate-200">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-2 h-2 bg-slate-600 rounded-full flex-shrink-0"></div>
                  <h3 className="text-sm font-semibold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
                    对话历史
                  </h3>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
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
                    onClick={() => setShowClearConfirm(true)}
                    className="text-xs text-slate-600 hover:text-slate-900 px-1.5 py-1 rounded hover:bg-white transition-colors whitespace-nowrap"
                    title="清空所有对话"
                  >
                    清空
                  </button>
                </div>
              </div>
            </header>
            
            {/* 对话列表区域 - 可滚动 */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {conversationHistory.conversations.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    暂无对话历史
                  </div>
                ) : (
                  conversationHistory.conversations.map((conv) => {
                    const isActive = conv.id === currentConversationId
                    const timeStr = new Date(conv.timestamp).toLocaleString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      month: 'numeric',
                      day: 'numeric'
                    })
                    
                    return (
                      <article 
                        key={conv.id}
                        className={`group rounded-lg border transition-all duration-200 min-w-0 ${
                          isActive 
                            ? 'bg-indigo-50 border-indigo-300 shadow-sm' 
                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                        }`}
                      >
                        <div 
                          onClick={() => {
                            if (conv.id !== currentConversationId) {
                              setCurrentConversationId(conv.id)
                              const tree = conversationHistory.loadConversation(conv.id)
                              if (tree) {
                                conversationActions.updateConversationTree(tree.flatMessages, tree.activePath)
                              }
                            }
                          }}
                          className="p-2.5 cursor-pointer flex items-start min-w-0"
                        >
                          <div className="flex-1 min-w-0 mr-2">
                            <h4 className={`text-sm font-medium truncate mb-1 ${
                              isActive ? 'text-indigo-700' : 'text-slate-900 group-hover:text-indigo-700'
                            }`} title={conv.title}>
                              {conv.title}
                            </h4>
                            <time className="text-xs text-slate-500 mb-1 whitespace-nowrap block" dateTime={new Date(conv.timestamp).toISOString()}>
                              {timeStr}
                            </time>
                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2" title={conv.preview}>
                              {conv.preview}
                            </p>
                          </div>
                          <div className="flex items-start gap-1 flex-shrink-0">
                            {isActive && (
                              <div className="w-2 h-2 bg-indigo-600 rounded-full mt-1"></div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`确定要删除对话“${conv.title}”吗？`)) {
                                  if (conv.id === currentConversationId) {
                                    const allConversations = conversationHistory.conversations
                                    const remaining = allConversations.filter(c => c.id !== conv.id)
                                    
                                    if (remaining.length > 0) {
                                      const nextConv = remaining[0]
                                      setCurrentConversationId(nextConv.id)
                                      const tree = conversationHistory.loadConversation(nextConv.id)
                                      if (tree) {
                                        conversationActions.updateConversationTree(tree.flatMessages, tree.activePath)
                                      }
                                    } else {
                                      setCurrentConversationId(null)
                                      conversationActions.updateConversationTree(new Map(), [])
                                    }
                                  }
                                  
                                  conversationHistory.deleteConversation(conv.id)
                                  
                                  if (conversationHistory.conversations.length === 1) {
                                    const newId = conversationHistory.createNewConversation(currentMode)
                                    setCurrentConversationId(newId)
                                  }
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-all duration-200 rounded"
                              title="删除对话"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="h-0.5 bg-slate-300" />
        
        {/* 当前对话区域 */}
        <Panel defaultSize={65}>
          <div className="flex flex-col h-full min-w-0">
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
                      showThinking={config.showThinking}
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
                currentMode={currentMode}
                onModeChange={onModeChange}
              />
            </div>
          </div>
        </Panel>
      </PanelGroup>

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
    </div>
  )
}