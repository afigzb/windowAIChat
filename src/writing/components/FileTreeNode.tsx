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
}

interface FileTreeNodeProps {
  node: FileSystemNode
  level?: number
  selectedFile?: string | null
  onFileClick?: (node: FileSystemNode) => void
  onCreateFile?: (dirPath: string) => void
  onCreateDirectory?: (dirPath: string) => void
  onContextMenu?: (e: React.MouseEvent, node: FileSystemNode) => void
  inlineEdit?: InlineEditState
  onInlineEditConfirm?: (name: string) => void
  onInlineEditCancel?: () => void
}

function FileIcon({ node }: { node: FileSystemNode }) {
  return <span>{node.isDirectory ? '📁' : '📄'}</span>
}

export function FileTreeNode({ 
  node, 
  level = 0, 
  selectedFile,
  onFileClick,
  onCreateFile,
  onCreateDirectory,
  onContextMenu,
  inlineEdit,
  onInlineEditConfirm,
  onInlineEditCancel
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

  if (isRenaming) {
    return (
      <InlineEdit
        type={inlineEdit.type}
        level={level}
        defaultValue={inlineEdit.defaultValue}
        onConfirm={onInlineEditConfirm!}
        onCancel={onInlineEditCancel!}
      />
    )
  }

  return (
    <div>
      <div 
        data-file-node
        className={`flex items-center gap-1 py-1 px-1 cursor-pointer ${
          isSelected 
            ? 'bg-indigo-100 text-indigo-900 border-l-2 border-indigo-500' 
            : 'hover:bg-gray-100'
        }`}
        style={{ marginLeft: level * 16 }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {node.isDirectory && (
          <span className="text-xs">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        <FileIcon node={node} />
        <span className="text-sm truncate flex-1">{node.name}</span>
        {node.isDirectory && (
          <div className="opacity-0 hover:opacity-100 flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCreateFile?.(node.path)
              }}
              className="text-xs hover:bg-gray-200 p-1 rounded"
              title="新建文件"
            >
              📝
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCreateDirectory?.(node.path)
              }}
              className="text-xs hover:bg-gray-200 p-1 rounded"
              title="新建文件夹"
            >
              📁
            </button>
          </div>
        )}
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
              onCreateFile={onCreateFile}
              onCreateDirectory={onCreateDirectory}
              onContextMenu={onContextMenu}
              inlineEdit={inlineEdit}
              onInlineEditConfirm={onInlineEditConfirm}
              onInlineEditCancel={onInlineEditCancel}
            />
          ))}
          {inlineEdit?.isActive && 
           inlineEdit.mode === 'create' && 
           inlineEdit.parentPath === node.path && (
            <InlineEdit
              type={inlineEdit.type}
              level={level + 1}
              defaultValue={inlineEdit.defaultValue}
              onConfirm={onInlineEditConfirm!}
              onCancel={onInlineEditCancel!}
            />
          )}
        </div>
      )}
    </div>
  )
}