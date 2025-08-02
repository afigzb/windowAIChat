// 文件树面板组件

import React from 'react'
import { FileTreeNode } from './FileTreeNode'
import { InlineEdit } from './InlineEdit'
import { useFileTree } from './useFileTree'
import type { FileSystemNode } from '../../storage/file-system'

interface FileTreePanelProps {
  selectedFile?: string | null
}

export function FileTreePanel({ selectedFile }: FileTreePanelProps) {
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
            />
          ))}
          {inlineEdit.isActive && inlineEdit.mode === 'create' && inlineEdit.parentPath === (workspace?.rootPath || '') && (
            <InlineEdit
              type={inlineEdit.type}
              level={0}
              defaultValue={inlineEdit.defaultValue}
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