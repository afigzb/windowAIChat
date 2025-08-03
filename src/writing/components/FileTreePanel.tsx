// 文件树面板组件

import React from 'react'
import { FileTreeNode } from './FileTreeNode'
import { InlineEdit } from './InlineEdit'
import { useFileTree } from './useFileTree'
import type { FileSystemNode } from '../../storage/file-system'
import { getFileName } from '../utils/fileContentReader'

interface FileTreePanelProps {
  selectedFile?: string | null
  // 新增：文件选择相关
  selectedFiles?: Set<string>
  onFileSelect?: (filePath: string, selected: boolean) => void
  onClearSelectedFiles?: () => void
  loadingFiles?: Set<string>
}

export function FileTreePanel({ selectedFile, selectedFiles, onFileSelect, onClearSelectedFiles, loadingFiles }: FileTreePanelProps) {
  const {
    workspace,
    fileTree,
    isLoading,
    inlineEdit,
    handleSelectWorkspace,
    handleFileClick,
    handleContextMenuOpen,
    handleInlineEditConfirm,
    handleInlineEditCancel
  } = useFileTree()

  // 通知Electron设置工作区路径
  React.useEffect(() => {
    if (workspace && typeof window !== 'undefined' && (window as any).electronAPI) {
      ;(window as any).electronAPI.setWorkspacePath(workspace.rootPath)
    }
  }, [workspace])

  if (!workspace) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-700">
          <p className="mb-3">选择项目工作目录开始使用文件管理功能</p>
        </div>
        <button
          onClick={handleSelectWorkspace}
          disabled={isLoading}
          className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? '正在加载...' : '📁 选择工作目录'}
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* 工作区信息 */}
      <div className="text-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-slate-900">📁 {workspace.name}</span>
          <button
            onClick={handleSelectWorkspace}
            className="text-xs text-slate-500 hover:text-indigo-600"
            title="更换工作目录"
          >
            更换
          </button>
        </div>
        <div className="text-xs text-slate-600 truncate" title={workspace.rootPath}>
          {workspace.rootPath}
        </div>
      </div>

      {/* 选中文件显示区域 */}
      {selectedFiles && selectedFiles.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-900">
              已选择文件 ({selectedFiles.size})
            </h3>
            {onClearSelectedFiles && (
              <button
                onClick={onClearSelectedFiles}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
                title="清除所有选择"
              >
                清除全部
              </button>
            )}
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {Array.from(selectedFiles).map(filePath => (
              <div key={filePath} className="flex items-center justify-between text-xs">
                <span className="text-blue-800 truncate flex-1" title={filePath}>
                  📄 {getFileName(filePath)}
                </span>
                {onFileSelect && (
                  <button
                    onClick={() => onFileSelect(filePath, false)}
                    className="ml-2 text-blue-400 hover:text-blue-600 p-0.5"
                    title="移除此文件"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-blue-600">
            这些文件将在发送消息时自动附加到对话中
          </div>
        </div>
      )}

      {/* 文件树 */}
      <div 
        className="border border-gray-300 rounded overflow-y-auto flex-1"
        style={{ minHeight: '400px' }}
        onContextMenu={(e) => {
          const target = e.target as HTMLElement
          // 如果点击的不是文件节点，则在空白区域显示根目录菜单
          if (!target.closest('[data-file-node]')) {
            e.preventDefault()
            handleContextMenuOpen()
            if (typeof window !== 'undefined' && (window as any).electronAPI) {
              ;(window as any).electronAPI.showDirectoryContextMenu(workspace?.rootPath || '')
            }
          }
        }}
      >
        <div className="p-1 min-h-full">
          {fileTree.map((node) => (
            <FileTreeNode
              key={node.id}
              node={node}
              selectedFile={selectedFile}
              onFileClick={handleFileClick}
              onContextMenu={(e, node) => {
                e.preventDefault()
                handleContextMenuOpen()
                if (typeof window !== 'undefined' && (window as any).electronAPI) {
                  ;(window as any).electronAPI.showFileContextMenu({
                    filePath: node.path,
                    fileName: node.name,
                    isDirectory: node.isDirectory
                  })
                }
              }}
              inlineEdit={inlineEdit}
              onInlineEditConfirm={handleInlineEditConfirm}
              onInlineEditCancel={handleInlineEditCancel}
              selectedFiles={selectedFiles}
              onFileSelect={onFileSelect}
              loadingFiles={loadingFiles}
            />
          ))}
          {inlineEdit.isActive && inlineEdit.mode === 'create' && inlineEdit.parentPath === (workspace?.rootPath || '') && (
            <InlineEdit
              type={inlineEdit.type}
              level={0}
              defaultValue={inlineEdit.defaultValue}
              selectStart={inlineEdit.selectStart}
              selectEnd={inlineEdit.selectEnd}
              onConfirm={handleInlineEditConfirm}
              onCancel={handleInlineEditCancel}
            />
          )}
          {fileTree.length === 0 && (
            <div className="p-2 text-center text-gray-500 text-sm">
              空文件夹 - 右键可新建文件或文件夹
            </div>
          )}
        </div>
      </div>


    </div>
  )
}