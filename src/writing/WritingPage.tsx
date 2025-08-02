import { useState, useRef, useEffect } from 'react'
import type { AIConfig, ChatMode } from '../chat/types'
import { DEFAULT_CONFIG } from '../chat/api'
import { MessageBubble, AISettings, ChatInputArea } from '../chat/components'
import { useConversationManager } from '../chat/conversation-manager'
import { useBranchManager } from '../chat/branch-manager'
import { useConversationHistory } from '../chat/conversation-history'
import { FileTreePanel } from './components/FileTreePanel'
import { DocxEditor } from './components/DocxEditor'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import storage from '../storage'
import { useDocxEditor } from './hooks/useDocxEditor'

// 页面头部组件
function Header({ 
  onSettingsClick, 
  showSettings
}: { 
  onSettingsClick: () => void
  showSettings: boolean
}) {

  return (
    <header className="bg-slate-50 border-b border-slate-300 px-6 py-4 sticky top-0 z-40">
      <div className="w-full flex items-center justify-between">
        {/* 左侧：标题 */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">AI写作助手</h1>
        </div>
        {/* 右侧：设置按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSettingsClick}
            className={`p-2 rounded-xl transition-all duration-200 ${
              showSettings 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-700 hover:text-indigo-600 hover:bg-white hover:shadow-sm'
            }`}
            title="AI设置"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

export default function WritingPage() {
  // UI状态
  const [config, setConfig] = useState<AIConfig>(() => {
    // 初始化时从存储加载配置
    return storage.initAIConfig(DEFAULT_CONFIG)
  })
  const [currentMode, setCurrentMode] = useState<ChatMode>('r1')
  const [showSettings, setShowSettings] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  
  // 对话历史管理
  const conversationHistory = useConversationHistory()
  
  // DOCX编辑器状态管理
  const {
    openFile,
    isLoading: isFileLoading,
    error: fileError,
    wordCount,
    openFileForEdit,
    updateContent,
    updateWordCount,
    saveFile,
    closeFile
  } = useDocxEditor()

  // 配置变更处理
  const handleConfigChange = (newConfig: AIConfig) => {
    setConfig(newConfig)
    // 自动保存配置到本地存储
    storage.saveAIConfig(newConfig)
  }

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 对话管理器（现在包含重新生成功能）
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
        // 没有任何对话，创建一个新的
        const newId = conversationHistory.createNewConversation(currentMode)
        setCurrentConversationId(newId)
      } else {
        // 有对话历史，选择第一个
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
  const handleSendMessage = () => {
    if (!conversationState.inputValue.trim()) return
    
    const content = conversationState.inputValue
    conversationActions.updateInputValue('')
    conversationActions.sendMessage(content)
  }
  
  // 设置文件选择回调和Electron事件监听
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      // 文件选择回调
      ;(window as any).onFileSelect = (filePath: string, fileName: string) => {
        setSelectedFile(filePath)
        openFileForEdit(filePath, fileName)
      }

      // 监听内联编辑触发事件
      const handleTriggerInlineEdit = (data: any) => {
        // 将事件传递给文件树组件
        const event = new CustomEvent('trigger-inline-edit', { detail: data })
        window.dispatchEvent(event)
      }

      // 文件系统变化事件现在由useFileTree hook处理，这里只需要监听内联编辑事件
      ;(window as any).electronAPI.onTriggerInlineEdit(handleTriggerInlineEdit)
    }
  }, [openFileForEdit])
  
  // 快捷键保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (openFile?.isModified) {
          saveFile()
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [openFile, saveFile])

  // 处理文件关闭
  const handleCloseFile = () => {
    const result = closeFile()
    if (result) {
      setSelectedFile(null) // 清除选中状态
    }
    return result
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 设置侧边栏 - 绝对定位 */}
      <AISettings
        config={config}
        onConfigChange={handleConfigChange}
        onClose={() => setShowSettings(false)}
        isOpen={showSettings}
      />



      {/* 主内容区 */}
      <div className="flex flex-col min-h-screen">
        <Header 
          onSettingsClick={() => setShowSettings(!showSettings)} 
          showSettings={showSettings}
        />

        {/* 主工作区域 - 使用react-resizable-panels */}
        <main className="flex-1">
          <PanelGroup direction="horizontal" style={{ height: 'calc(100vh - 73px)' }}>
            {/* 左侧：功能模块面板 */}
            <Panel defaultSize={25}>
              <div className="bg-white border-r border-slate-300 flex flex-col h-full">
                <div className="p-4 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-900">
                    文件管理
                  </h2>
                </div>
                            <div className="flex-1 overflow-y-auto p-4">
              <FileTreePanel selectedFile={selectedFile} />
            </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-0.5 bg-slate-300" />

            {/* 中间：DOCX编辑区域 */}
            <Panel defaultSize={50}>
              <div className="bg-white flex flex-col h-full">
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="font-semibold text-slate-900">
                        {openFile ? openFile.name : 'DOCX编辑器'}
                      </h2>
                      {openFile?.isModified && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">未保存</span>
                      )}
                      {openFile && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {openFile.path.toLowerCase().endsWith('.docx') ? 'DOCX' : 
                           openFile.path.toLowerCase().endsWith('.doc') ? 'DOC' : 
                           openFile.path.toLowerCase().endsWith('.md') ? 'Markdown' : 'Text'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {openFile && (
                        <div className="text-sm text-slate-600 px-3 py-1.5 bg-slate-100 rounded-md">
                          📊 {wordCount.words}字
                        </div>
                      )}
                      {openFile && (
                        <button
                          onClick={saveFile}
                          disabled={!openFile.isModified || isFileLoading}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                          保存 (Ctrl+S)
                        </button>
                      )}
                      {openFile && (
                        <button
                          onClick={handleCloseFile}
                          className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          关闭
                        </button>
                      )}
                    </div>
                  </div>
                  {fileError && (
                    <div className="mt-2 px-4 py-2 bg-red-50 text-red-600 text-sm rounded">
                      {fileError}
                    </div>
                  )}
                  {isFileLoading && (
                    <div className="mt-2 px-4 py-2 bg-blue-50 text-blue-600 text-sm rounded">
                      正在处理文件...
                    </div>
                  )}
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                  {openFile ? (
                    <DocxEditor 
                      content={openFile.htmlContent}
                      onChange={updateContent}
                      onWordCountChange={updateWordCount}
                      placeholder="开始编辑您的文档..."
                      readOnly={isFileLoading}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      <div className="text-center">
                        <div className="text-6xl mb-4">📝</div>
                        <h3 className="text-lg font-medium mb-2">DOCX文档编辑器</h3>
                        <p className="text-sm mb-4">从左侧文件管理中选择一个DOCX文件开始编辑</p>
                        <div className="text-xs text-slate-400">
                          支持格式：.docx, .doc, .txt, .md
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-0.5 bg-slate-300" />

            {/* 右侧：AI助手区域 */}
            <Panel defaultSize={25}>
              <div className="bg-slate-50 border-l border-slate-300 flex flex-col h-full">
                {/* AI区域标题 */}
                <div className="p-4 border-b border-slate-200 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                    <h2 className="font-semibold text-slate-900">AI写作助手</h2>
                  </div>
                </div>
                
                {/* AI区域内容 - 垂直分割 */}
                <PanelGroup direction="vertical" className="flex-1">
                  {/* 对话历史区域 */}
                  <Panel defaultSize={35}>
                    <div className="bg-slate-50 border-b border-slate-200 overflow-y-auto h-full">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                            <h3 className="text-sm font-semibold text-slate-900">对话历史</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                const newId = conversationHistory.createNewConversation(currentMode)
                                setCurrentConversationId(newId)
                                // 清空当前对话树，准备新对话
                                conversationActions.updateConversationTree(new Map(), [])
                              }}
                              className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm" 
                              title="新建对话"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm('确定要清空所有对话历史吗？')) {
                                  conversationHistory.clearAllConversations()
                                  // 创建新对话
                                  const newId = conversationHistory.createNewConversation(currentMode)
                                  setCurrentConversationId(newId)
                                  conversationActions.updateConversationTree(new Map(), [])
                                }
                              }}
                              className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-white transition-colors"
                            >
                              清空
                            </button>
                          </div>
                        </div>
                        
                        {/* 历史对话列表 */}
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
                                <div 
                                  key={conv.id}
                                  className={`group rounded-lg border transition-all duration-200 ${
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
                                    className="p-3 cursor-pointer flex items-start justify-between"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className={`text-sm font-medium truncate ${
                                        isActive ? 'text-indigo-700' : 'text-slate-900 group-hover:text-indigo-700'
                                      }`}>
                                        {conv.title}
                                      </div>
                                      <div className="text-xs text-slate-500 mt-1">{timeStr}</div>
                                      <div className="text-xs text-slate-600 mt-1.5 leading-relaxed truncate">
                                        {conv.preview}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                      {isActive && (
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation() // 防止触发对话切换
                                          if (confirm(`确定要删除对话"${conv.title}"吗？`)) {
                                            // 如果删除的是当前对话，需要先处理切换逻辑
                                            if (conv.id === currentConversationId) {
                                              const allConversations = conversationHistory.conversations
                                              const remaining = allConversations.filter(c => c.id !== conv.id)
                                              
                                              if (remaining.length > 0) {
                                                // 切换到第一个剩余对话
                                                const nextConv = remaining[0]
                                                setCurrentConversationId(nextConv.id)
                                                const tree = conversationHistory.loadConversation(nextConv.id)
                                                if (tree) {
                                                  conversationActions.updateConversationTree(tree.flatMessages, tree.activePath)
                                                }
                                              } else {
                                                // 没有剩余对话，准备创建新的
                                                setCurrentConversationId(null)
                                                conversationActions.updateConversationTree(new Map(), [])
                                              }
                                            }
                                            
                                            // 执行删除
                                            conversationHistory.deleteConversation(conv.id)
                                            
                                            // 如果删除后没有任何对话，创建新的
                                            if (conversationHistory.conversations.length === 1) { // 删除前只有1个，删除后为0
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
                                </div>
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
                    <div className="flex flex-col h-full">
                      <div className="flex-1 overflow-y-auto bg-white">
                        <div className="space-y-0">
                          {activeNodes.map((node) => {
                            const branchNavigation = branchManager.getBranchNavigationForNode(node.id)
                            const isInActivePath = conversationState.conversationTree.activePath.includes(node.id)
                            const isGeneratingNode = conversationState.isLoading && node.content === '正在生成...'
                            
                            return (
                              <MessageBubble 
                                key={node.id} 
                                node={node}
                                onRegenerate={!conversationState.isLoading ? regenerateMessage : undefined}
                                onEditUserMessage={!conversationState.isLoading ? conversationActions.editUserMessage : undefined}
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
                      <div className="border-t border-slate-200 bg-white">
                        <ChatInputArea
                          value={conversationState.inputValue}
                          onChange={conversationActions.updateInputValue}
                          onSend={handleSendMessage}
                          isLoading={conversationState.isLoading}
                          onAbort={conversationActions.abortRequest}
                          currentMode={currentMode}
                          onModeChange={setCurrentMode}
                        />
                      </div>
                    </div>
                  </Panel>
                </PanelGroup>
              </div>
            </Panel>
          </PanelGroup>
        </main>
      </div>
    </div>
  )
}