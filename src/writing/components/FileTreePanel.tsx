// 文件树面板组件

import React from 'react'
import { FileTreeNode } from './FileTreeNode'
import { InlineEdit } from './InlineEdit'
import { useFileTree } from './useFileTree'
import type { FileSystemNode } from '../../storage/file-system'
import { getFileName } from '../../md-html-dock/utils/fileContentReader'

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
      <div className="space-y-6">
        <div className="text-base text-gray-700">
          <p className="mb-4 font-medium">选择项目工作目录开始使用文件管理功能</p>
        </div>
        <button
          onClick={handleSelectWorkspace}
          disabled={isLoading}
          className="w-full p-5 border-2 border-dashed border-gray-300 rounded-2xl text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 disabled:opacity-50 group hover:shadow-lg"
        >
          <div className="flex items-center justify-center gap-3">
            <svg className="w-6 h-6 text-blue-600 group-hover:animate-pulse" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21V6h2v13h17v2zm4-4V2h7l2 2h9v13zm2-2h14V6h-7.825l-2-2H7zm0 0V4z"/>
            </svg>
            <span className="text-base font-semibold">{isLoading ? '正在加载...' : '选择工作目录'}</span>
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 选中文件显示区域 - 始终显示，固定高度 */}
      <div className="flex-shrink-0 p-3 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-3 min-w-0 shadow-sm">
          <div className="flex items-center justify-between mb-2 min-w-0 gap-2">
            <div className="flex items-center min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-blue-700 whitespace-nowrap flex-shrink-0">
                已选择文件
              </h3>
              <span className="text-sm font-medium text-blue-600 whitespace-nowrap ml-1 flex-shrink-0">
                ({selectedFiles?.size || 0})
              </span>
            </div>
            {onClearSelectedFiles && selectedFiles && selectedFiles.size > 0 && (
              <button
                onClick={onClearSelectedFiles}
                className="text-sm font-medium text-blue-600 hover:text-red-600 transition-all duration-200 flex-shrink-0 whitespace-nowrap hover:underline"
                title="清除所有选择"
              >
                清除全部
              </button>
            )}
          </div>
          {/* 固定高度的文件列表区域 */}
          <div className="h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100 bg-white rounded-lg p-1 mt-2">
            <div className="space-y-1">
              {selectedFiles && Array.from(selectedFiles).map(filePath => (
                <div key={filePath} className="flex items-center justify-between text-sm py-1 px-1.5 rounded hover:bg-blue-100 transition-all duration-200 group min-w-0">
                  <div className="text-blue-800 flex items-center flex-1 mr-1 min-w-0" title={filePath}>
                    <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mr-1" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4 22V2h10l6 6v6h-2V9h-5V4H6v16h9v2zm17.95.375L19 19.425v2.225h-2V16h5.65v2H20.4l2.95 2.95zM6 20V4z"/>
                    </svg>
                    <span className="truncate flex-1 min-w-0 text-xs font-medium">{getFileName(filePath)}</span>
                  </div>
                  {onFileSelect && (
                    <button
                      onClick={() => onFileSelect(filePath, false)}
                      className="text-gray-400 hover:text-red-500 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0"
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
                <div className="h-full flex flex-col items-center justify-center text-blue-400 space-y-2">
                  <svg className="w-8 h-8 text-blue-300" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21V6h2v13h17v2zm4-4V2h7l2 2h9v13zm2-2h14V6h-7.825l-2-2H7zm0 0V4z"/>
                  </svg>
                  <div className="text-center">
                    <div className="text-sm font-medium text-blue-500">暂无选中文件</div>
                    <div className="text-xs text-blue-300 mt-1">勾选下方文件来选择</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* <div className="mt-3 text-sm font-medium text-blue-700 border-t-2 border-blue-200 pt-3 whitespace-nowrap overflow-hidden text-ellipsis">
            📄 文件将自动作为上下文发送
          </div> */}
        </div>
      </div>

      {/* 工作区信息 */}
      <div className="flex-shrink-0 px-5 py-4 border-b-2 border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3 min-w-0">
          <div className="flex items-center min-w-0 flex-1">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21V6h2v13h17v2zm4-4V2h7l2 2h9v13zm2-2h14V6h-7.825l-2-2H7zm0 0V4z"/>
            </svg>
            <span className="font-bold text-gray-900 text-base truncate">{workspace.name}</span>
          </div>
          <button
            onClick={handleSelectWorkspace}
            className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-all duration-200 flex-shrink-0 whitespace-nowrap ml-3 hover:underline"
            title="更换工作目录"
          >
            更换
          </button>
        </div>
        <div className="text-sm text-gray-600 truncate bg-gray-50 rounded-lg px-3 py-1.5 mt-2" title={workspace.rootPath}>
          {workspace.rootPath}
        </div>
      </div>

      {/* 文件树 - 占据剩余空间 */}
      <div className="flex-1 overflow-hidden">
        <div 
          className="h-full border-2 border-gray-200 rounded-xl overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 bg-white shadow-sm hover:shadow-md transition-shadow duration-300"
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
          <div className="p-4 min-h-full">
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
              <div className="py-12 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-gray-500 text-base font-medium">空文件夹</p>
                <p className="text-gray-400 text-sm mt-1">右键可新建文件或文件夹</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}