import { useState, useEffect, useCallback } from 'react'
import type { AIConfig, ChatMode } from '../chat/types'
import { DEFAULT_CONFIG } from '../chat/api'
import { ChatPanel } from '../chat/ChatPanel'
import { ApiProviderManager } from '../chat/components'
import { FileTreePanel } from './components/FileTreePanel'
import { DocxEditor } from './components/DocxEditor'
import { ConfirmDialog } from './components/ConfirmDialog'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import storage from '../storage'
import { useDocxEditor } from './hooks/useDocxEditor'
import { readFileContent, readMultipleFiles, extractTextFromHTML, formatFileContent } from './utils/fileContentReader'
import { detectFileType } from './utils/fileTypeDetector'



export default function WritingPage() {
  // UI状态
  const [config, setConfig] = useState<AIConfig>(() => {
    // 初始化时从存储加载配置
    return storage.initAIConfig(DEFAULT_CONFIG)
  })
  const [currentMode, setCurrentMode] = useState<ChatMode>('r1')
  const [activeTool, setActiveTool] = useState<'workspace' | 'api' | 'settings'>('workspace')

  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  
  // 选中文件状态管理
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map())
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set())
  
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
    closeFile,
    confirmProps
  } = useDocxEditor()

  // 配置变更处理
  const handleConfigChange = (newConfig: AIConfig) => {
    setConfig(newConfig)
    storage.saveAIConfig(newConfig)
  }

  // 处理文件选择 - 不再立即读取文件内容
  const handleFileSelect = useCallback((filePath: string, selected: boolean) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(filePath)
      } else {
        newSet.delete(filePath)
        // 移除对应的文件内容缓存
        setFileContents(prevContents => {
          const newContents = new Map(prevContents)
          newContents.delete(filePath)
          return newContents
        })
      }
      return newSet
    })
  }, [])

  // 清除所有选中文件
  const handleClearSelectedFiles = useCallback(() => {
    setSelectedFiles(new Set())
    setFileContents(new Map())
  }, [])

  // 生成AI聊天的额外上下文（选中的文件内容）
  const getAdditionalContent = async (): Promise<string> => {
    if (selectedFiles.size === 0) return ''
    
    try {
      // 显示加载状态
      const filePaths = Array.from(selectedFiles)
      const needsLoading = filePaths.filter(path => !fileContents.has(path))
      
      if (needsLoading.length > 0) {
        setLoadingFiles(new Set(needsLoading))
      }
      
      try {
        // 为了包含未保存的编辑内容：优先使用当前打开文件的编辑器内容
        const parts: string[] = []
        for (const filePath of filePaths) {
          try {
            if (openFile && openFile.path === filePath) {
              const typeInfo = detectFileType(filePath)
              if (typeInfo.readMethod === 'image') {
                // 图片仍从磁盘读取（包含元信息）且不使用缓存
                const content = await readFileContent(filePath, false)
                parts.push(formatFileContent(filePath, content))
                setFileContents(prev => {
                  const newContents = new Map(prev)
                  newContents.set(filePath, content)
                  return newContents
                })
              } else {
                const text = extractTextFromHTML(openFile.htmlContent || '')
                parts.push(formatFileContent(filePath, text))
                setFileContents(prev => {
                  const newContents = new Map(prev)
                  newContents.set(filePath, text)
                  return newContents
                })
              }
            } else {
              // 其他文件从磁盘读取最新内容，禁用缓存以避免旧内容
              const content = await readFileContent(filePath, false)
              parts.push(formatFileContent(filePath, content))
              setFileContents(prev => {
                const newContents = new Map(prev)
                newContents.set(filePath, content)
                return newContents
              })
            }
          } catch (error) {
            console.error(`读取文件失败: ${filePath}`, error)
          } finally {
            setLoadingFiles(prev => {
              const newSet = new Set(prev)
              newSet.delete(filePath)
              return newSet
            })
          }
        }
        return parts.join('')
      } finally {
        // 确保加载状态被清除
        setTimeout(() => {
          setLoadingFiles(new Set())
        }, 500)
      }
    } catch (error) {
      console.error('读取选中文件失败:', error)
      return ''
    }
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
  const handleCloseFile = async () => {
    const result = await closeFile()
    if (result) {
      setSelectedFile(null) // 清除选中状态
    }
    return result
  }

  return (
    <div className="h-screen bg-slate-100 flex flex-col">
      {/* 主内容区 */}
      <div className="flex border-t border-slate-300 flex-col flex-1">
        {/* 主工作区域 */}
        <main className="flex-1">
          <div className="flex h-[calc(100vh-1px)]">
            {/* 最左：工具栏 */}
            <div className="w-14 bg-white border-r border-slate-300 flex flex-col items-center py-3 gap-2">
              {([
                { key: 'workspace', label: '工作区', icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                )},
                { key: 'api', label: 'API', icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                )},
                { key: 'settings', label: '设置', icon: (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                  </svg>
                )},
              ] as const).map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveTool(item.key as typeof activeTool)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    activeTool === (item.key as typeof activeTool) ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  title={item.label}
                >
                  {item.icon}
                </button>
              ))}
            </div>

            {/* 右侧内容区，工作区始终渲染，其他按需渲染 */}
            <div className="flex-1 relative">
              {/* 工作区视图 - 始终渲染，避免重复动画 */}
              <div className={`absolute inset-0 ${activeTool === 'workspace' ? 'block' : 'hidden'}`}>
                <PanelGroup direction="horizontal" style={{ height: '100%' }} autoSaveId="writing-page-panels">
                  {/* 左侧：文件管理 */}
                  <Panel defaultSize={20}>
                    <div className="bg-white border-r border-slate-300 flex flex-col h-full">
                      <div className="p-4 h-16 border-b border-slate-200 flex items-center">
                        <h2 className="font-semibold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">文件管理</h2>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <FileTreePanel 
                          selectedFile={selectedFile} 
                          selectedFiles={selectedFiles}
                          onFileSelect={handleFileSelect}
                          onClearSelectedFiles={handleClearSelectedFiles}
                          loadingFiles={loadingFiles}
                        />
                      </div>
                    </div>
                  </Panel>

                  <PanelResizeHandle className="w-px bg-slate-200" />

                  {/* 中间：DOCX编辑 */}
                  <Panel defaultSize={50}>
                    <div className="bg-white flex flex-col h-full">
                      <div className="p-4 h-16 border-b border-slate-200">
                        <div className="flex items-center justify-between min-w-0">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <h2 
                              className="font-semibold text-slate-900 truncate" 
                              title={openFile ? openFile.name : 'DOCX编辑器'}
                            >
                              {openFile ? openFile.name : 'DOCX编辑器'}
                            </h2>
                            {openFile?.isModified && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded flex-shrink-0">未保存</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {openFile && (
                              <div className="text-sm text-slate-600 px-2 py-1 bg-slate-100 rounded-md whitespace-nowrap">
                                {wordCount.words}字
                              </div>
                            )}
                            {openFile && (
                              <button
                                onClick={saveFile}
                                disabled={!openFile.isModified || isFileLoading}
                                className="px-2 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                title="保存 (Ctrl+S)"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                <span className="hidden xl:inline">保存</span>
                              </button>
                            )}
                            {openFile && (
                              <button
                                onClick={handleCloseFile}
                                className="px-2 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors flex items-center gap-1"
                                title="关闭"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="hidden xl:inline">关闭</span>
                              </button>
                            )}
                          </div>
                        </div>
                        {fileError && (
                          <div className="mt-2 px-4 py-2 bg-red-50 text-red-600 text-sm rounded">{fileError}</div>
                        )}
                        {isFileLoading && (
                          <div className="mt-2 px-4 py-2 bg-blue-50 text-blue-600 text-sm rounded">正在处理文件...</div>
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
                              <div className="text-xs text-slate-400">支持格式：.docx, .doc, .txt, .md</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Panel>

                  <PanelResizeHandle className="w-px bg-slate-200" />

                  {/* 右侧：AI 助手 */}
                  <Panel defaultSize={30}>
                    <ChatPanel
                      config={config}
                      onConfigChange={handleConfigChange}
                      currentMode={currentMode}
                      onModeChange={setCurrentMode}
                      additionalContent={getAdditionalContent}
                    />
                  </Panel>
                </PanelGroup>
              </div>

              {/* API配置视图 - 按需渲染 */}
              {activeTool === 'api' && (
                <div className="absolute inset-0">
                  <div className="h-full bg-white border-l border-slate-300 flex flex-col">
                    <div className="h-16 px-4 border-b border-slate-200 flex items-center">
                      <h2 className="font-semibold text-slate-900">API 配置</h2>
                    </div>
                    <div className="flex-1 overflow-auto p-6">
                      <ApiProviderManager config={config} onConfigChange={handleConfigChange} />
                    </div>
                  </div>
                </div>
              )}

              {/* 设置视图 - 按需渲染 */}
              {activeTool === 'settings' && (
                <div className="absolute inset-0">
                  <div className="h-full bg-white border-l border-slate-300 flex flex-col">
                    <div className="h-16 px-4 border-b border-slate-200 flex items-center">
                      <h2 className="font-semibold text-slate-900">设置</h2>
                    </div>
                  <div className="flex-1 overflow-auto p-6">
                    <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">系统提示</label>
                          <textarea
                            value={config.systemPrompt}
                            onChange={(e) => handleConfigChange({ ...config, systemPrompt: e.target.value })}
                            placeholder="设置AI的角色和行为..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[80px] resize-none"
                            rows={3}
                          />
                          <p className="text-xs text-gray-500">定义AI的角色定位和回答风格</p>
                        </div>
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-gray-700">历史消息保留数量 ({config.historyLimit})</label>
                          <input
                            type="range"
                            min={4}
                            max={40}
                            step={2}
                            value={config.historyLimit}
                            onChange={(e) => handleConfigChange({ ...config, historyLimit: parseInt(e.target.value, 10) })}
                            className="w-full accent-indigo-600"
                          />
                          <div className="text-xs text-gray-500">为节约 tokens，只保留最近的消息发送给 AI</div>
                        </div>
                        <div>
                          <button
                            onClick={() => handleConfigChange(DEFAULT_CONFIG)}
                            className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-slate-50 transition-colors text-slate-700"
                          >
                            重置为默认设置
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* 确认对话框 */}
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}