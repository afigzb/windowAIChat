// 文件树节点组件

import { useState, useEffect } from 'react'
import { InlineEdit } from './InlineEdit'
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
  selectedFiles?: Set<string>
  onFileSelect?: (filePath: string, selected: boolean) => void
  loadingFiles?: Set<string>
}

function FileIcon({ node }: { node: FileSystemNode }) {
  if (node.isDirectory) {
    return (
      <svg className="w-4 h-4 text-slate-700 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M1 21V6h2v13h17v2zm4-4V2h7l2 2h9v13zm2-2h14V6h-7.825l-2-2H7zm0 0V4z"/>
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4 text-slate-700 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 22V2h10l6 6v6h-2V9h-5V4H6v16h9v2zm17.95.375L19 19.425v2.225h-2V16h5.65v2H20.4l2.95 2.95zM6 20V4z"/>
    </svg>
  )
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
  const isFileSelected = selectedFiles?.has(node.path) || false
  const isLoading = loadingFiles?.has(node.path) || false

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation() // 防止触发文件点击
    onFileSelect?.(node.path, e.target.checked)
  }

  if (isRenaming) {
    return (
      <InlineEdit
        type={inlineEdit.type}
        level={level}
        defaultValue={inlineEdit.defaultValue}
        selectStart={inlineEdit.selectStart}
        selectEnd={inlineEdit.selectEnd}
        onConfirm={onInlineEditConfirm!}
        onCancel={onInlineEditCancel!}
      />
    )
  }

  return (
    <div>
      <div 
        data-file-node
        className={`group flex items-center gap-1 py-1 px-1 cursor-pointer ${
          isSelected 
            ? 'bg-indigo-100 text-indigo-900 border-l-2 border-indigo-500' 
            : 'hover:bg-gray-100'
        }`}
        style={{ marginLeft: level * 16 }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {node.isDirectory && (
          <div className={`transition-transform duration-200 w-3 h-3 ${isExpanded ? '' : '-rotate-90'}`}>
            <svg className="-translate-x-1.5 -translate-y-1.5 w-6 h-6 text-slate-700" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.465 10.293a1 1 0 0 1 1.414 0L12 12.414l2.121-2.121a1 1 0 0 1 1.415 1.414l-2.829 2.829a1 1 0 0 1-1.414 0l-2.828-2.829a1 1 0 0 1 0-1.414"/>
            </svg>
          </div>
        )}
        {!node.isDirectory && (
          <div className="relative group/checkbox">
            <input
              type="checkbox"
              checked={isFileSelected}
              onChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()} // 防止触发父元素的点击事件
              disabled={isLoading}
              className={`w-3 h-3 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 transition-all duration-150 ${isLoading ? 'opacity-50' : 'hover:border-indigo-400'} ${isFileSelected ? 'scale-105' : ''}`}
              title={isLoading ? '文件内容加载中...' : '选择此文件用于AI对话'}
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2 h-2 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            {/* 选中状态指示器 */}
            {isFileSelected && !isLoading && (
              <div className="absolute top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
        )}
        <FileIcon node={node} />
        <span className="text-sm truncate flex-1">{node.name}</span>

      </div>
      
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
  )
}