// 文件树面板组件

import React from 'react'
import { FileTreeNode } from './FileTreeNode'
import { InlineEdit } from './InlineEdit'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'
import { useFileTree } from '../hooks/useFileTree'
import { Icon } from '../../components'
import type { FileSystemNode } from '../../storage/file-system'
import { getFileName } from '../utils/fileHelper'

interface FileTreePanelProps {
  selectedFile?: string | null
  // 新增：文件选择相关
  selectedFiles?: string[]
  onFileSelect?: (filePath: string, selected: boolean) => void
  onClearSelectedFiles?: () => void
  onReorderFiles?: (newOrder: string[]) => void
  loadingFiles?: Set<string>
}

export function FileTreePanel({ selectedFile, selectedFiles, onFileSelect, onClearSelectedFiles, onReorderFiles, loadingFiles }: FileTreePanelProps) {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)

  // 拖拽处理
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    
    if (draggedIndex === null || draggedIndex === dropIndex || !selectedFiles || !onReorderFiles) return
    
    const newOrder = [...selectedFiles]
    const draggedItem = newOrder[draggedIndex]
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(dropIndex, 0, draggedItem)
    
    onReorderFiles(newOrder)
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

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
  
  const { confirm, confirmProps } = useConfirm()

  // 通知Electron设置工作区路径
  React.useEffect(() => {
    if (workspace && typeof window !== 'undefined' && (window as any).electronAPI) {
      ;(window as any).electronAPI.setWorkspacePath(workspace.rootPath)
    }
  }, [workspace])

  if (!workspace) {
    return (
      <>
        <ConfirmDialog {...confirmProps} />
        <div className="space-y-6">
        <button
          onClick={handleSelectWorkspace}
          disabled={isLoading}
          className="w-full p-5 border-2 border-dashed border-gray-300 rounded-2xl text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 disabled:opacity-50 group hover:shadow-lg"
        >
          <div className="flex items-center justify-center gap-3">
            <Icon name="folder" className="w-6 h-6 text-blue-600 group-hover:animate-pulse" />
            <span className="text-base font-semibold">{isLoading ? '正在加载...' : '选择工作目录'}</span>
          </div>
        </button>
        </div>
      </>
    )
  }

  return (
    <>
      <ConfirmDialog {...confirmProps} />
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
                ({selectedFiles?.length || 0})
              </span>
            </div>
            {onClearSelectedFiles && selectedFiles && selectedFiles.length > 0 && (
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
          <div className="h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100 bg-white rounded-lg p-1 mt-2">
            <div className="space-y-1">
              {selectedFiles && selectedFiles.map((filePath, index) => (
                <div 
                  key={filePath}
                  draggable={onReorderFiles !== undefined}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between text-sm py-1 px-1.5 rounded hover:bg-blue-100 transition-all duration-200 group min-w-0 ${
                    draggedIndex === index ? 'opacity-50' : ''
                  } ${
                    dragOverIndex === index ? 'border-t-2 border-blue-500' : ''
                  } ${
                    onReorderFiles ? 'cursor-move' : ''
                  }`}
                >
                  {onReorderFiles && (
                    <Icon name="grip" className="w-4 h-4 text-gray-400 flex-shrink-0 mr-1" />
                  )}
                  <div className="text-blue-800 flex items-center flex-1 mr-1 min-w-0" title={filePath}>
                    <Icon name="file" className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mr-1" />
                    <span className="truncate flex-1 min-w-0 text-xs font-medium">{getFileName(filePath)}</span>
                  </div>
                  {onFileSelect && (
                    <button
                      onClick={() => onFileSelect(filePath, false)}
                      className="text-gray-400 hover:text-red-500 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0"
                      title="移除此文件"
                    >
                    <Icon name="close" className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {/* 空状态提示 */}
              {(!selectedFiles || selectedFiles.length === 0) && (
                <div className="h-full flex flex-col items-center justify-center text-blue-400 space-y-2">
                  <Icon name="folder" className="w-8 h-8 text-blue-300" />
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
            <Icon name="folder" className="w-5 h-5 text-blue-600 flex-shrink-0 mr-2" />
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
          onDragOver={(e) => {
            // 允许将文件拖入根目录
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={async (e) => {
            try {
              e.preventDefault()
              e.stopPropagation()
              const sourcePath = e.dataTransfer.getData('application/x-filepath') || e.dataTransfer.getData('text/plain')
              if (!sourcePath || !workspace?.rootPath) return
              // 拖到空白区域即移动到根目录
              await (await import('../../storage/file-system')).fileSystemManager.move(sourcePath, workspace.rootPath)
            } catch (err) {
              console.error('移动失败:', err)
              await confirm({
                title: '移动失败',
                message: `无法移动文件或文件夹：${err}`,
                confirmText: '确定',
                type: 'danger'
              })
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
                <Icon name="folderEmpty" className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-base font-medium">空文件夹</p>
                <p className="text-gray-400 text-sm mt-1">右键可新建文件或文件夹</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  )
}