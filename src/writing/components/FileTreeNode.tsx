// 文件树节点组件

import { useState } from 'react'
import { InlineEdit } from './InlineEdit'
import type { FileSystemNode } from '../../storage/file-system'

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
}

function FileIcon({ node }: { node: FileSystemNode }) {
  return <span>{node.isDirectory ? '📁' : '📄'}</span>
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
  onFileSelect
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2)

  const handleClick = () => {
    if (node.isDirectory) {
      setIsExpanded(!isExpanded)
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
          <span className={`text-sm transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}>
            ▼
          </span>
        )}
        {!node.isDirectory && (
          <input
            type="checkbox"
            checked={isFileSelected}
            onChange={handleCheckboxChange}
            className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
            title="选择此文件用于AI对话"
          />
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