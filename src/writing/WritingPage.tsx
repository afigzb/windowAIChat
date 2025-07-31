import { useState, useRef, useEffect } from 'react'
import type { AIConfig, ChatMode } from '../chat/types'
import { DEFAULT_CONFIG } from '../chat/api'
import { MessageBubble, AISettings, ChatInputArea } from '../chat/components'
import { useConversationManager } from '../chat/conversation-manager'
import { useBranchManager } from '../chat/branch-manager'
import { ChaptersPanel, CharactersPanel, OutlinePanel, SettingsDataPanel } from './components/Panels'
import { FileTreePanel } from './components/FileTreePanel'
import { WritingArea } from './components/WritingArea'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import storage from '../storage'

// 页面头部组件
function Header({ 
  onSettingsClick, 
  showSettings,
  activeModule,
  onModuleChange
}: { 
  onSettingsClick: () => void
  showSettings: boolean
  activeModule: string
  onModuleChange: (module: string) => void
}) {
  const modules = [
    { id: 'chapters', name: '章节'},
    { id: 'characters', name: '人物'},
    { id: 'outline', name: '大纲' },
    { id: 'settings-data', name: '设定' },
  ]

  return (
    <header className="bg-slate-50 border-b border-slate-300 px-6 py-4 sticky top-0 z-40">
      <div className="w-full flex items-center justify-between">
        {/* 左侧：标题 */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">AI写作助手</h1>
        </div>
        
        {/* 中间：功能模块导航 */}
        <nav className="flex items-center gap-1">
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => onModuleChange(module.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                activeModule === module.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-indigo-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              <span>{module.name}</span>
            </button>
          ))}
        </nav>
        
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
  const [activeModule, setActiveModule] = useState<string>('chapters')

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
          activeModule={activeModule}
          onModuleChange={setActiveModule}
        />

        {/* 主工作区域 - 使用react-resizable-panels */}
        <main className="flex-1">
          <PanelGroup direction="horizontal" style={{ height: 'calc(100vh - 73px)' }}>
            {/* 左侧：功能模块面板 */}
            <Panel defaultSize={25}>
              <div className="bg-white border-r border-slate-300 flex flex-col h-full">
                <div className="p-4 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-900">
                    {activeModule === 'chapters' && '文件管理'}
                    {activeModule === 'characters' && '人物设定'}
                    {activeModule === 'outline' && '大纲规划'}
                    {activeModule === 'settings-data' && '世界设定'}
                  </h2>
                </div>
                            <div className="flex-1 overflow-y-auto p-4">
              {activeModule === 'chapters' && <FileTreePanel />}
              {activeModule === 'characters' && <CharactersPanel />}
              {activeModule === 'outline' && <OutlinePanel />}
              {activeModule === 'settings-data' && <SettingsDataPanel />}
            </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-0.5 bg-slate-300" />

            {/* 中间：写作区域 */}
            <Panel defaultSize={50}>
              <div className="bg-white flex flex-col h-full">
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900">写作区域</h2>
                    <div className="text-sm text-slate-600">
                      字数统计: 0
                    </div>
                  </div>
                </div>
                <div className="flex-1 p-4">
                  <WritingArea />
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
                            <button className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm" title="新建对话">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-white transition-colors">清空</button>
                          </div>
                        </div>
                        
                        {/* 历史对话列表 */}
                        <div className="space-y-2">
                          <div className="group p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all duration-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-900 group-hover:text-indigo-700">人物性格讨论</div>
                                <div className="text-xs text-slate-500 mt-1">今天 14:30</div>
                                <div className="text-xs text-slate-600 mt-1.5 leading-relaxed">主角的成长弧线和性格发展轨迹...</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="group p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all duration-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-900 group-hover:text-indigo-700">情节发展建议</div>
                                <div className="text-xs text-slate-500 mt-1">今天 13:15</div>
                                <div className="text-xs text-slate-600 mt-1.5 leading-relaxed">关于第三章情节转折点的讨论...</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="group p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all duration-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-900 group-hover:text-indigo-700">世界观设定</div>
                                <div className="text-xs text-slate-500 mt-1">今天 11:45</div>
                                <div className="text-xs text-slate-600 mt-1.5 leading-relaxed">故事背景和世界观的细节完善...</div>
                              </div>
                            </div>
                          </div>
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