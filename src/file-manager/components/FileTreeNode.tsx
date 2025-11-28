// 文件树节点组件

import { useState, useEffect } from 'react'
import { InlineEdit } from './InlineEdit'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'
import { Icon } from '../../components'
import type { FileSystemNode } from '../../storage/file-system'
import { fileSystemManager } from '../../storage/file-system'

interface InlineEditState {
  isActive: boolean
  mode: 'create' | 'rename'
  type: 'file' | 'directory'
  parentPath: string
  defaultValue?: string
  selectStart?: number
  selectEnd?: number
}

interface FileTreeNodeProps {
  node: FileSystemNode
  level?: number
  selectedFile?: string | null
  onFileClick?: (node: FileSystemNode) => void
  onContextMenu?: (e: React.MouseEvent, node: FileSystemNode) => void
  inlineEdit?: InlineEditState
  onInlineEditConfirm?: (name: string) => void
  onInlineEditCancel?: () => void
  // 新增：文件选择相关
  selectedFiles?: string[]
  onFileSelect?: (filePath: string, selected: boolean) => void
  loadingFiles?: Set<string>
}

function FileIcon({ node }: { node: FileSystemNode }) {
  if (node.isDirectory) {
    return <Icon name="folder" className="w-5 h-5 text-blue-600 flex-shrink-0" />
  }
  return <Icon name="file" className="w-5 h-5 text-gray-600 flex-shrink-0" />
}

export function FileTreeNode({ 
  node, 
  level = 0, 
  selectedFile,
  onFileClick,
  onContextMenu,
  inlineEdit,
  onInlineEditConfirm,
  onInlineEditCancel,
  selectedFiles,
  onFileSelect,
  loadingFiles
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(() => 
    node.isDirectory ? fileSystemManager.isFolderExpanded(node.path, level) : false
  )
  const [isDragOver, setIsDragOver] = useState(false)
  const { confirm, confirmProps } = useConfirm()

  // 当节点路径变化时，更新展开状态
  useEffect(() => {
    if (node.isDirectory) {
      setIsExpanded(fileSystemManager.isFolderExpanded(node.path, level))
    }
  }, [node.path, node.isDirectory, level])

  const handleClick = () => {
    if (node.isDirectory) {
      const newExpanded = !isExpanded
      setIsExpanded(newExpanded)
      // 更新文件系统管理器中的展开状态
      fileSystemManager.setFolderExpanded(node.path, newExpanded)
    } else {
      onFileClick?.(node)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu?.(e, node)
  }

  const isRenaming = inlineEdit?.isActive && 
                    inlineEdit.mode === 'rename' && 
                    inlineEdit.parentPath === node.path
  
  const isSelected = selectedFile === node.path
  const isFileSelected = selectedFiles?.includes(node.path) || false
  const isLoading = loadingFiles?.has(node.path) || false

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation() // 防止触发文件点击
    onFileSelect?.(node.path, e.target.checked)
  }

  // 原生拖拽处理
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    try {
      e.stopPropagation()
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('application/x-filepath', node.path)
      e.dataTransfer.setData('text/plain', node.path)
      e.dataTransfer.setData('application/x-isdir', node.isDirectory ? '1' : '0')
    } catch {}
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // 允许拖放到任何节点（目录或文件）
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const sourcePath = e.dataTransfer.getData('application/x-filepath') || e.dataTransfer.getData('text/plain')
    if (!sourcePath) return

    // 自身无需处理
    if (sourcePath === node.path) return

    // 确定目标目录
    let targetDirPath: string
    if (node.isDirectory) {
      targetDirPath = node.path
    } else {
      // 如果是文件，目标是其父目录
      targetDirPath = (window as any).path 
        ? (window as any).path.dirname(node.path) 
        : node.path.substring(0, Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\')))
    }

    // 检查源文件的父目录是否就是目标目录（文件已经在目标位置）
    const sourceParentDir = (window as any).path 
      ? (window as any).path.dirname(sourcePath)
      : sourcePath.substring(0, Math.max(sourcePath.lastIndexOf('/'), sourcePath.lastIndexOf('\\')))

    // 简单规范化路径比较 (处理 Windows 路径分隔符和大小写)
    const normalize = (p: string) => p.replace(/\\/g, '/').toLowerCase()
    
    if (normalize(sourceParentDir) === normalize(targetDirPath)) {
      return
    }

    try {
      await fileSystemManager.move(sourcePath, targetDirPath)
    } catch (err) {
      console.error('移动失败:', err)
      await confirm({
        title: '移动失败',
        message: `无法移动文件或文件夹：${err}`,
        confirmText: '确定',
        type: 'danger'
      })
    }
  }

  // 移除重命名时的提前返回，改为在下方渲染

  return (
    <>
      <ConfirmDialog {...confirmProps} />
      <div>
        {isRenaming ? (
          <InlineEdit
            type={inlineEdit.type}
            level={level}
            defaultValue={inlineEdit.defaultValue}
            selectStart={inlineEdit.selectStart}
            selectEnd={inlineEdit.selectEnd}
            onConfirm={onInlineEditConfirm!}
            onCancel={onInlineEditCancel!}
          />
        ) : (
          <div 
            data-file-node
            className={`group flex items-center gap-2 py-2 px-3 cursor-pointer transition-all duration-100 ${
              isSelected 
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 ' 
                : `${isDragOver ? 'bg-blue-50/70 ring-2 ring-blue-300' : 'hover:bg-gray-50'}`
            }`}
            style={{ marginLeft: level * 20 }}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {node.isDirectory && (
              <div className={`transition-transform duration-300 ${isExpanded ? '' : '-rotate-90'}`}>
                <Icon name="chevronDown" className="w-4 h-4 text-gray-500" />
              </div>
            )}
            {!node.isDirectory && (
              <div className="relative group/checkbox flex items-center">
                <input
                  type="checkbox"
                  checked={isFileSelected}
                  onChange={handleCheckboxChange}
                  onClick={(e) => e.stopPropagation()} // 防止触发父元素的点击事件
                  disabled={isLoading}
                  className={`w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-400 focus:ring-2 focus:ring-offset-1 transition-all duration-200 ${isLoading ? 'opacity-50' : 'hover:border-blue-400 hover:shadow-sm'} ${isFileSelected ? 'scale-110 border-blue-500' : ''}`}
                  title={isLoading ? '文件内容加载中...' : '选择此文件用于AI对话'}
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {/* 选中状态指示器 */}
                {isFileSelected && !isLoading && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileIcon node={node} />
              <span className="text-sm font-medium truncate">{node.name}</span>
            </div>
          </div>
        )}
      
      {node.isDirectory && isExpanded && (
        <div>
          {node.children?.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedFile={selectedFile}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
              inlineEdit={inlineEdit}
              onInlineEditConfirm={onInlineEditConfirm}
              onInlineEditCancel={onInlineEditCancel}
              selectedFiles={selectedFiles}
              onFileSelect={onFileSelect}
              loadingFiles={loadingFiles}
            />
          ))}
          {inlineEdit?.isActive && 
           inlineEdit.mode === 'create' && 
           inlineEdit.parentPath === node.path && (
            <InlineEdit
              type={inlineEdit.type}
              level={level + 1}
              defaultValue={inlineEdit.defaultValue}
              selectStart={inlineEdit.selectStart}
              selectEnd={inlineEdit.selectEnd}
              onConfirm={onInlineEditConfirm!}
              onCancel={onInlineEditCancel!}
            />
          )}
        </div>
      )}
      </div>
    </>
  )
}