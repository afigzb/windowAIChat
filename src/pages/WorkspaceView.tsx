// 工作区视图组件 - 整合文件管理、文档编辑、AI聊天三栏布局
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import type { AIConfig } from '../chat'
import { ChatPanel } from '../chat'
import { FileTreePanel } from '../file-manager'
import { FileContentViewer } from '../document-editor'
import type { FileContent } from '../types/file-api'
import type { WordCountResult } from '../md-html-dock/types'

interface WordCount {
  words: number
  characters: number
}

interface WorkspaceViewProps {
  // 文件状态
  selectedFile: string | null
  selectedFiles: string[]
  loadingFiles: Set<string>
  onFileSelect: (filePath: string, selected: boolean) => void
  onClearSelectedFiles: () => void
  onReorderFiles?: (newOrder: string[]) => void
  
  // 编辑器状态
  openFile: FileContent | null
  isFileLoading: boolean
  fileError: string | null
  wordCount: WordCount
  
  // 编辑器操作
  onContentUpdate: (content: string) => void
  onWordCountChange: (count: WordCountResult) => void
  onSaveFile: () => void
  onCloseFile: () => void
  
  // AI配置
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
  additionalContent: () => Promise<string>
  additionalContentList?: () => Promise<string[]>
}

export function WorkspaceView({
  selectedFile,
  selectedFiles,
  loadingFiles,
  onFileSelect,
  onClearSelectedFiles,
  onReorderFiles,
  openFile,
  isFileLoading,
  fileError,
  wordCount,
  onContentUpdate,
  onWordCountChange,
  onSaveFile,
  onCloseFile,
  config,
  onConfigChange,
  additionalContent,
  additionalContentList
}: WorkspaceViewProps) {
  
  // 是否显示保存按钮（只有文档和文本类型且已修改才显示）
  const showSaveButton = (openFile?.type === 'document' || openFile?.type === 'text') && openFile?.isModified
  // 是否显示字数统计（只有文档和文本类型才显示）
  const showWordCount = openFile?.type === 'document' || openFile?.type === 'text'
  
  return (
    <PanelGroup direction="horizontal" style={{ height: '100%' }} autoSaveId="writing-page-panels">
      <Panel defaultSize={15}>
        <div className="bg-white border-r border-slate-300 flex flex-col h-full">
          <div className="p-4 h-16 border-b border-slate-200 flex items-center">
            <h2 className="font-semibold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">文件管理</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <FileTreePanel 
              selectedFile={selectedFile} 
              selectedFiles={selectedFiles}
              onFileSelect={onFileSelect}
              onClearSelectedFiles={onClearSelectedFiles}
              onReorderFiles={onReorderFiles}
              loadingFiles={loadingFiles}
            />
          </div>
        </div>
      </Panel>

      <PanelResizeHandle className="w-px bg-slate-200" />

      <Panel defaultSize={50}>
        <div className="bg-white flex flex-col h-full">
          {/* 顶部工具栏 */}
          <div className="p-4 h-16 border-b border-slate-200 flex items-center">
            <div className="flex items-center justify-between min-w-0 w-full">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <h2 
                  className="font-semibold text-slate-900 truncate" 
                  title={openFile ? openFile.name : '文件查看器'}
                >
                  {openFile ? openFile.name : '文件查看器'}
                </h2>
                {(openFile?.type === 'document' || openFile?.type === 'text') && openFile?.isModified && (
                  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded flex-shrink-0">未保存</span>
                )}
                {openFile?.type === 'image' && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded flex-shrink-0">图片预览</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {showWordCount && (
                  <div className="text-sm text-slate-600 px-2 py-1 bg-slate-100 rounded-md whitespace-nowrap">
                    {wordCount.words}字
                  </div>
                )}
                {showSaveButton && (
                  <button
                    onClick={onSaveFile}
                    disabled={isFileLoading}
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
                    onClick={onCloseFile}
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
          </div>

          {/* 错误/加载提示 */}
          {(fileError || isFileLoading) && (
            <div className="px-4 py-2 border-b border-slate-200">
              {fileError && (
                <div className="px-4 py-2 bg-red-50 text-red-600 text-sm rounded">{fileError}</div>
              )}
              {isFileLoading && (
                <div className="px-4 py-2 bg-blue-50 text-blue-600 text-sm rounded">正在处理文件...</div>
              )}
            </div>
          )}

          {/* 文件内容区域 */}
          <div className="flex-1 overflow-hidden">
            {openFile ? (
              <FileContentViewer
                fileContent={openFile}
                isLoading={isFileLoading}
                onContentChange={onContentUpdate}
                onWordCountChange={onWordCountChange}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-medium mb-2">文件查看器</h3>
                  <p className="text-sm mb-4">从左侧文件管理中选择一个文件开始</p>
                  <div className="text-xs text-slate-400">支持格式：.docx, .doc, .txt, .md, .png, .jpg 等</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Panel>

      <PanelResizeHandle className="w-px bg-slate-200" />

      <Panel defaultSize={35}>
        <ChatPanel
          config={config}
          onConfigChange={onConfigChange}
          additionalContent={additionalContent}
          additionalContentList={additionalContentList}
        />
      </Panel>
    </PanelGroup>
  )
}
