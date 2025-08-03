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
    <div className="h-full flex flex-col">
      {/* 选中文件显示区域 - 始终显示，固定高度 */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0 gap-2">
            <div className="flex items-center min-w-0 flex-1">
              <h3 className="text-sm font-medium text-blue-900 whitespace-nowrap flex-shrink-0">
                已选择文件
              </h3>
              <span className="text-sm font-medium text-blue-900 whitespace-nowrap ml-1 flex-shrink-0">
                ({selectedFiles?.size || 0})
              </span>
            </div>
            {onClearSelectedFiles && selectedFiles && selectedFiles.size > 0 && (
              <button
                onClick={onClearSelectedFiles}
                className="text-xs text-blue-600 hover:text-blue-800 underline transition-colors flex-shrink-0 whitespace-nowrap"
                title="清除所有选择"
              >
                清除全部
              </button>
            )}
          </div>
          {/* 固定高度的文件列表区域 */}
          <div className="h-16 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100">
            <div className="space-y-1 pr-1">
              {selectedFiles && Array.from(selectedFiles).map(filePath => (
                <div key={filePath} className="flex items-center justify-between text-xs py-1 px-1 rounded hover:bg-blue-100 transition-colors group min-w-0">
                  <div className="text-blue-800 flex items-center flex-1 mr-2 min-w-0" title={filePath}>
                    <span className="flex-shrink-0 mr-1">📄</span>
                    <span className="truncate flex-1 min-w-0">{getFileName(filePath)}</span>
                  </div>
                  {onFileSelect && (
                    <button
                      onClick={() => onFileSelect(filePath, false)}
                      className="text-blue-400 hover:text-red-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      title="移除此文件"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {/* 空状态提示 */}
              {(!selectedFiles || selectedFiles.size === 0) && (
                <div className="h-full flex flex-col items-center justify-center text-blue-400 text-xs space-y-2">
                  <div className="text-lg">📁</div>
                  <div className="text-center">
                    <div className="whitespace-nowrap">暂无选中文件</div>
                    <div className="text-blue-300 mt-1 whitespace-nowrap">勾选下方文件来选择</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-600 border-t border-blue-200 pt-2 whitespace-nowrap overflow-hidden text-ellipsis">
            文件将会自动发送
          </div>
        </div>
      </div>

      {/* 工作区信息 */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2 min-w-0">
          <div className="flex items-center min-w-0 flex-1">
            <span className="flex-shrink-0 mr-1">📁</span>
            <span className="font-medium text-slate-900 text-sm truncate">{workspace.name}</span>
          </div>
          <button
            onClick={handleSelectWorkspace}
            className="text-xs text-slate-500 hover:text-indigo-600 transition-colors flex-shrink-0 whitespace-nowrap ml-2"
            title="更换工作目录"
          >
            更换
          </button>
        </div>
        <div className="text-xs text-slate-600 truncate" title={workspace.rootPath}>
          {workspace.rootPath}
        </div>
      </div>

      {/* 文件树 - 占据剩余空间 */}
      <div className="flex-1 overflow-hidden">
        <div 
          className="h-full border border-gray-300 rounded overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300"
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
          <div className="p-2 min-h-full">
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
              <div className="p-4 text-center text-gray-500 text-sm">
                空文件夹 - 右键可新建文件或文件夹
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}