import { useState, useEffect, useCallback } from 'react'
import type { AIConfig, ChatMode } from '../chat/types'
import { DEFAULT_CONFIG } from '../chat/api'
import { ChatPanel } from '../chat/ChatPanel'
import { FileTreePanel } from './components/FileTreePanel'
import { DocxEditor } from './components/DocxEditor'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import storage from '../storage'
import { useDocxEditor } from './hooks/useDocxEditor'
import { readFileContent, readMultipleFiles } from './utils/fileContentReader'



export default function WritingPage() {
  // UI状态
  const [config, setConfig] = useState<AIConfig>(() => {
    // 初始化时从存储加载配置
    return storage.initAIConfig(DEFAULT_CONFIG)
  })
  const [currentMode, setCurrentMode] = useState<ChatMode>('r1')

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
    closeFile
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
        // 仅在需要时才读取文件内容
        const contents = await readMultipleFiles(filePaths)
        
        // 更新内容缓存（但不阻塞UI）
        Promise.all(filePaths.map(async filePath => {
          try {
            const content = await readFileContent(filePath)
            setFileContents(prev => {
              const newContents = new Map(prev)
              newContents.set(filePath, content)
              return newContents
            })
          } catch (error) {
            console.error(`缓存文件内容失败: ${filePath}`, error)
          } finally {
            setLoadingFiles(prev => {
              const newSet = new Set(prev)
              newSet.delete(filePath)
              return newSet
            })
          }
        }))
        
        return contents
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
  const handleCloseFile = () => {
    const result = closeFile()
    if (result) {
      setSelectedFile(null) // 清除选中状态
    }
    return result
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 主内容区 */}
      <div className="flex border-t border-slate-300 flex-col min-h-screen">
        {/* 主工作区域 - 使用react-resizable-panels */}
        <main className="flex-1">
          <PanelGroup direction="horizontal" style={{ height: '100vh' }}>
            {/* 左侧：功能模块面板 */}
            <Panel defaultSize={25}>
              <div className="bg-white border-r border-slate-300 flex flex-col h-full">
                <div className="p-4 h-16 border-b border-slate-200 flex items-center">
                  <h2 className="font-semibold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
                    文件管理
                  </h2>
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

            <PanelResizeHandle className="w-0.5 bg-slate-300" />

            {/* 中间：DOCX编辑区域 */}
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
              <ChatPanel
                config={config}
                onConfigChange={handleConfigChange}
                currentMode={currentMode}
                onModeChange={setCurrentMode}
                additionalContent={getAdditionalContent}
              />
            </Panel>
          </PanelGroup>
        </main>
      </div>
    </div>
  )
}