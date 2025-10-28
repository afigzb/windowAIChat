import { useState, useEffect, useCallback } from 'react'
import type { AIConfig } from '../chat'
import { DEFAULT_CONFIG, ApiConfigPanel } from '../chat'
import { ConfirmDialog} from '../components'
import { SideToolbar } from './SideToolbar'
import { SettingsPanel } from './SettingsPanel'
import { AgentsPage } from './AgentsPage'
import { DocsPage } from './DocsPage'
import { WorkspaceView } from './WorkspaceView'
import storage from '../storage'
import { useFileEditor } from '../document-editor'
import { useFileSelection } from '../file-manager'

export default function EditorWorkspace() {
  const [config, setConfig] = useState<AIConfig>(() => {
    return storage.initAIConfig(DEFAULT_CONFIG)
  })
  const [activeTool, setActiveTool] = useState<'workspace' | 'api' | 'docs' | 'settings' | 'prompt' | 'agents'>('workspace')
  const [isPromptWindowOpen, setIsPromptWindowOpen] = useState(false)
  const [isTextEditorWindowOpen, setIsTextEditorWindowOpen] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

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
  } = useFileEditor()

  const {
    selectedFiles,
    loadingFiles,
    handleFileSelect,
    handleClearSelectedFiles,
    handleReorderFiles,
    getAdditionalContent,
    getAdditionalContentList
  } = useFileSelection(openFile)

  const handleConfigChange = (newConfig: AIConfig) => {
    setConfig(newConfig)
    storage.saveAIConfig(newConfig)
  }

  const handleResetConfig = () => {
    handleConfigChange({
      ...config,
      currentProviderId: DEFAULT_CONFIG.currentProviderId,
      providers: DEFAULT_CONFIG.providers
    })
    setShowResetConfirm(false)
  }

  const handleOpenPromptWindow = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      setIsPromptWindowOpen(true)
      ;(window as any).electronAPI.openChildWindow('prompt-window')
    }
  }

  const handleOpenTextEditorWindow = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      setIsTextEditorWindowOpen(true)
      ;(window as any).electronAPI.openChildWindow('text-editor-window')
    }
  }

  const handleCloseFile = async () => {
    const result = await closeFile()
    if (result) {
      setSelectedFile(null)
    }
    return result
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      ;(window as any).onFileSelect = (filePath: string, fileName: string) => {
        setSelectedFile(filePath)
        openFileForEdit(filePath, fileName)
      }

      const handleTriggerInlineEdit = (data: any) => {
        const event = new CustomEvent('trigger-inline-edit', { detail: data })
        window.dispatchEvent(event)
      }

      ;(window as any).electronAPI.onTriggerInlineEdit(handleTriggerInlineEdit)
    }
  }, [openFileForEdit])

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      // 监听提示词窗口状态
      ;(window as any).electronAPI.isChildWindowOpen('prompt-window').then((isOpen: boolean) => {
        setIsPromptWindowOpen(isOpen)
      })
      ;(window as any).electronAPI.onChildWindowStateChanged('prompt-window', (isOpen: boolean) => {
        setIsPromptWindowOpen(isOpen)
      })

      // 监听文本编辑器窗口状态
      ;(window as any).electronAPI.isChildWindowOpen('text-editor-window').then((isOpen: boolean) => {
        setIsTextEditorWindowOpen(isOpen)
      })
      ;(window as any).electronAPI.onChildWindowStateChanged('text-editor-window', (isOpen: boolean) => {
        setIsTextEditorWindowOpen(isOpen)
      })
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if ((openFile?.type === 'document' || openFile?.type === 'text') && openFile?.isModified) {
          saveFile()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [openFile, saveFile])

  return (
    <div className="h-screen bg-slate-100 flex flex-col">
      <div className="flex border-t border-slate-300 flex-col flex-1">
        <main className="flex-1">
          <div className="flex h-[calc(100vh-1px)]">
            <SideToolbar
              activeTool={activeTool}
              isPromptWindowOpen={isPromptWindowOpen}
              isTextEditorWindowOpen={isTextEditorWindowOpen}
              onSelectTool={(tool: 'workspace' | 'api' | 'docs' | 'settings' | 'prompt' | 'agents') => setActiveTool(tool)}
              onOpenPromptWindow={handleOpenPromptWindow}
              onOpenTextEditorWindow={handleOpenTextEditorWindow}
            />

            <div className="flex-1 relative">
              <div className={`absolute inset-0 ${activeTool === 'workspace' ? 'block' : 'hidden'}`}>
                <WorkspaceView
                  selectedFile={selectedFile}
                  selectedFiles={selectedFiles}
                  loadingFiles={loadingFiles}
                  onFileSelect={handleFileSelect}
                  onClearSelectedFiles={handleClearSelectedFiles}
                  onReorderFiles={handleReorderFiles}
                  openFile={openFile}
                  isFileLoading={isFileLoading}
                  fileError={fileError}
                  wordCount={wordCount}
                  onContentUpdate={updateContent}
                  onWordCountChange={updateWordCount}
                  onSaveFile={saveFile}
                  onCloseFile={handleCloseFile}
                  config={config}
                  onConfigChange={handleConfigChange}
                  additionalContent={getAdditionalContent}
                  additionalContentList={getAdditionalContentList}
                />
              </div>

              {activeTool === 'api' && (
                <div className="absolute inset-0">
                  <ApiConfigPanel config={config} onConfigChange={handleConfigChange} />
                </div>
              )}

              {activeTool === 'agents' && (
                <div className="absolute inset-0">
                  <AgentsPage config={config} onConfigChange={handleConfigChange} />
                </div>
              )}

              {activeTool === 'docs' && <DocsPage />}

              {activeTool === 'settings' && (
                <div className="absolute inset-0">
                  <SettingsPanel
                    config={config}
                    onConfigChange={handleConfigChange}
                    onRequestReset={() => setShowResetConfirm(true)}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <ConfirmDialog {...confirmProps} />

      <ConfirmDialog
        isOpen={showResetConfirm}
        title="重置API配置"
        message="确定要将API配置重置为默认设置吗？这将重置所有API提供商和密钥配置，但会保留您的其他设置（如历史消息数量）。"
        confirmText="确定重置"
        cancelText="取消"
        type="warning"
        onConfirm={handleResetConfig}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  )
}

