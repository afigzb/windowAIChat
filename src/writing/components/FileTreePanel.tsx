// 文件树面板组件

import { useState, useEffect, useRef, useCallback } from 'react'
import fileSystemManager, { type FileSystemNode, type Workspace } from '../../storage/file-system'

// 内联编辑状态类型
interface InlineEditState {
  isActive: boolean
  mode: 'create' | 'rename'
  type: 'file' | 'directory'
  parentPath: string
  parentLevel: number
  defaultValue?: string
}

// 右键菜单项类型
interface MenuAction {
  label: string
  icon: string
  onClick: () => void
  variant?: 'normal' | 'danger'
}

// 文件图标组件
function FileIcon({ node }: { node: FileSystemNode }) {
  if (node.isDirectory) {
    return <span>📁</span>
  }
  return <span>📄</span>
}

// 内联编辑组件
function InlineEditInput({ 
  type, 
  level, 
  defaultValue = '',
  onConfirm, 
  onCancel 
}: { 
  type: 'file' | 'directory'
  level: number
  defaultValue?: string
  onConfirm: (name: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(defaultValue)
    // 自动聚焦到输入框
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select() // 如果有默认值，选中所有文本
    }
  }, [defaultValue])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (value.trim()) {
        onConfirm(value.trim())
      } else {
        onCancel()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const handleBlur = (e: React.FocusEvent) => {
    // 只有当焦点不在当前容器内时才处理失焦
    const currentTarget = e.currentTarget
    const relatedTarget = e.relatedTarget as Node
    
    // 延迟处理，确保不会因为临时失焦而误触发
    setTimeout(() => {
      if (!currentTarget.contains(relatedTarget)) {
        if (value.trim()) {
          onConfirm(value.trim())
        } else {
          onCancel()
        }
      }
    }, 150)
  }

  return (
    <div 
      className="flex items-center gap-1 py-1 px-1"
      style={{ marginLeft: level * 16 }}
    >
      <span className="text-xs">
        {type === 'directory' ? '📁' : '📄'}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={type === 'directory' ? '文件夹名称' : '文件名称'}
        className="flex-1 text-sm px-1 py-0 border border-gray-300 rounded text-black bg-white focus:outline-none focus:border-blue-500"
      />
    </div>
  )
}

// 文件树节点组件
function FileTreeNode({ 
  node, 
  level = 0, 
  onFileClick,
  onCreateFile,
  onCreateDirectory,
  onContextMenu,
  inlineEdit,
  onInlineEditConfirm,
  onInlineEditCancel
}: { 
  node: FileSystemNode
  level?: number
  onFileClick?: (node: FileSystemNode) => void
  onCreateFile?: (dirPath: string) => void
  onCreateDirectory?: (dirPath: string) => void
  onContextMenu?: (e: React.MouseEvent, node: FileSystemNode) => void
  inlineEdit?: InlineEditState
  onInlineEditConfirm?: (name: string) => void
  onInlineEditCancel?: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2) // 默认展开前两层

  const handleClick = () => {
    if (node.isDirectory) {
      setIsExpanded(!isExpanded)
    } else {
      onFileClick?.(node)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onContextMenu?.(e, node)
  }

  // 检查是否正在重命名这个节点
  const isRenaming = inlineEdit?.isActive && inlineEdit.mode === 'rename' && inlineEdit.parentPath === node.path

  return (
    <div>
      {isRenaming ? (
        <InlineEditInput
          type={inlineEdit.type}
          level={level}
          defaultValue={inlineEdit.defaultValue}
          onConfirm={onInlineEditConfirm!}
          onCancel={onInlineEditCancel!}
        />
      ) : (
        <div 
          data-file-node
          className="flex items-center gap-1 py-1 px-1 hover:bg-gray-100 cursor-pointer"
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
      )}
      
      {node.isDirectory && isExpanded && (
        <div>
          {node.children?.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
              onCreateFile={onCreateFile}
              onCreateDirectory={onCreateDirectory}
              onContextMenu={onContextMenu}
              inlineEdit={inlineEdit}
              onInlineEditConfirm={onInlineEditConfirm}
              onInlineEditCancel={onInlineEditCancel}
            />
          ))}
          {/* 渲染新建模式的内联编辑输入框 */}
          {inlineEdit?.isActive && inlineEdit.mode === 'create' && inlineEdit.parentPath === node.path && (
            <InlineEditInput
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

// 主要的文件树面板组件
export function FileTreePanel() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [fileTree, setFileTree] = useState<FileSystemNode[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    x: number
    y: number
    node: FileSystemNode | null
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    node: null
  })
  
  // 内联编辑状态
  const [inlineEdit, setInlineEdit] = useState<InlineEditState>({
    isActive: false,
    mode: 'create',
    type: 'file',
    parentPath: '',
    parentLevel: 0
  })


  useEffect(() => {
    initFileSystem()
  }, [])



  const initFileSystem = async () => {
    try {
      await fileSystemManager.init()
      const currentWorkspace = fileSystemManager.getCurrentWorkspace()
      setWorkspace(currentWorkspace)
      if (currentWorkspace) {
        const tree = fileSystemManager.getFileTree()
        setFileTree(tree)
      }
    } catch (error) {
      console.error('初始化文件系统失败:', error)
    }
  }

  const handleSelectWorkspace = async () => {
    setIsLoading(true)
    try {
      const newWorkspace = await fileSystemManager.selectWorkspace()
      if (newWorkspace) {
        setWorkspace(newWorkspace)
        const tree = fileSystemManager.getFileTree()
        setFileTree(tree)
      }
    } catch (error) {
      console.error('选择工作区失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileClick = (node: FileSystemNode) => {
    console.log('选中文件:', node.path)
    // TODO: 在中间区域打开文件进行编辑
  }

  const handleCreateFile = useCallback((dirPath: string) => {
    // 关闭右键菜单
    setContextMenu(prev => ({ ...prev, isOpen: false }))
    // 启动内联编辑
    setInlineEdit({
      isActive: true,
      mode: 'create',
      type: 'file',
      parentPath: dirPath,
      parentLevel: 0
    })
  }, [])

  const handleCreateDirectory = useCallback((parentPath: string) => {
    // 关闭右键菜单
    setContextMenu(prev => ({ ...prev, isOpen: false }))
    // 启动内联编辑
    setInlineEdit({
      isActive: true,
      mode: 'create',
      type: 'directory',
      parentPath: parentPath,
      parentLevel: 0
    })
  }, [])

  // 内联编辑确认
  const handleInlineEditConfirm = useCallback(async (name: string) => {
    const { mode, type, parentPath } = inlineEdit
    setInlineEdit({ isActive: false, mode: 'create', type: 'file', parentPath: '', parentLevel: 0 })
    
    try {
      if (mode === 'create') {
        if (type === 'file') {
          await fileSystemManager.createFile(parentPath, name)
        } else {
          await fileSystemManager.createDirectory(parentPath, name)
        }
      } else if (mode === 'rename') {
        await fileSystemManager.rename(parentPath, name)
      }
      const tree = await fileSystemManager.loadFileTree()
      setFileTree(tree)
    } catch (error) {
      const action = mode === 'create' ? '创建' : '重命名'
      const itemType = type === 'file' ? '文件' : '文件夹'
      console.error(`${action}${itemType}失败:`, error)
      alert(`${action}${itemType}失败: ${error}`)
    }
  }, [inlineEdit])

  // 内联编辑取消
  const handleInlineEditCancel = useCallback(() => {
    setInlineEdit({ isActive: false, mode: 'create', type: 'file', parentPath: '', parentLevel: 0 })
  }, [])



  // 重置内联编辑状态
  const resetInlineEdit = useCallback(() => {
    setInlineEdit({ isActive: false, mode: 'create', type: 'file', parentPath: '', parentLevel: 0 })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }))
  }, [])

  // 统一的右键菜单处理
  const handleContextMenu = useCallback((e: React.MouseEvent, node?: FileSystemNode) => {
    e.preventDefault()
    e.stopPropagation()
    
    resetInlineEdit()
    
    // 如果没有传入节点，说明是空白区域，使用根目录
    const targetNode = node || {
      id: 'root',
      name: workspace?.name || '',
      path: workspace?.rootPath || '',
      isDirectory: true
    }
    
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      node: targetNode
    })
  }, [workspace, resetInlineEdit])

  // 监听全局点击事件，关闭右键菜单
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu.isOpen) {
        handleCloseContextMenu()
      }
    }

    if (contextMenu.isOpen) {
      document.addEventListener('click', handleGlobalClick)
      return () => document.removeEventListener('click', handleGlobalClick)
    }
  }, [contextMenu.isOpen, handleCloseContextMenu])

  const handleRename = useCallback((node: FileSystemNode) => {
    handleCloseContextMenu()
    setInlineEdit({
      isActive: true,
      mode: 'rename',
      type: node.isDirectory ? 'directory' : 'file',
      parentPath: node.path,
      parentLevel: 0,
      defaultValue: node.name
    })
  }, [handleCloseContextMenu])

  // 删除文件/文件夹
  const handleDelete = useCallback(async (node: FileSystemNode) => {
    const isDirectory = node.isDirectory
    const itemType = isDirectory ? '文件夹' : '文件'
    
    handleCloseContextMenu()
    
    if (confirm(`确定要删除${itemType} "${node.name}" 吗？${isDirectory ? '这将删除文件夹及其所有内容。' : ''}`)) {
      try {
        await fileSystemManager.delete(node.path)
        const tree = await fileSystemManager.loadFileTree()
        setFileTree(tree)
      } catch (error) {
        console.error(`删除${itemType}失败:`, error)
        alert(`删除${itemType}失败: ${error}`)
      }
    }
  }, [handleCloseContextMenu])

  // 生成右键菜单项
  const getMenuActions = useCallback((node: FileSystemNode): MenuAction[] => {
    const actions: MenuAction[] = []
    
    // 目录节点可以新建文件和文件夹
    if (node.isDirectory) {
      actions.push(
        {
          label: '新建文件',
          icon: '📝',
          onClick: () => handleCreateFile(node.path)
        },
        {
          label: '新建文件夹',
          icon: '📁',
          onClick: () => handleCreateDirectory(node.path)
        }
      )
    }
    
    // 非根目录节点可以重命名和删除
    if (node.id !== 'root') {
      actions.push(
        {
          label: '重命名',
          icon: '✏️',
          onClick: () => handleRename(node)
        },
        {
          label: '删除',
          icon: '🗑️',
          onClick: () => handleDelete(node),
          variant: 'danger'
        }
      )
    }
    
    return actions
  }, [handleCreateFile, handleCreateDirectory, handleRename, handleDelete])

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
          // 确保点击的是空白区域
          const target = e.target as HTMLElement
          if (!target.closest('[data-file-node]')) {
            handleContextMenu(e)
          }
        }}
      >
        <div className="p-1 min-h-full">
          {fileTree.map((node) => (
            <FileTreeNode
              key={node.id}
              node={node}
              onFileClick={handleFileClick}
              onCreateFile={handleCreateFile}
              onCreateDirectory={handleCreateDirectory}
              onContextMenu={handleContextMenu}
              inlineEdit={inlineEdit}
              onInlineEditConfirm={handleInlineEditConfirm}
              onInlineEditCancel={handleInlineEditCancel}
            />
          ))}
          {/* 根级别的新建模式内联编辑输入框 */}
          {inlineEdit.isActive && inlineEdit.mode === 'create' && inlineEdit.parentPath === (workspace?.rootPath || '') && (
            <InlineEditInput
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

      {/* 右键菜单 */}
      {contextMenu.isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={handleCloseContextMenu}
          />
          <div 
            className="fixed bg-white rounded border border-gray-300 py-1 z-50 min-w-28 shadow"
            style={{ 
              left: contextMenu.x, 
              top: contextMenu.y,
              transform: 'translate(-50%, 0)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.node && getMenuActions(contextMenu.node).map((action, index, array) => (
              <div key={action.label}>
                {/* 在新建和其他操作之间添加分隔线 */}
                {index === 2 && array.length > 2 && (
                  <div className="border-t border-gray-200 my-1" />
                )}
                <button
                  onClick={action.onClick}
                  className={`w-full text-left px-2 py-1 text-sm ${
                    action.variant === 'danger' 
                      ? 'text-red-600 hover:bg-red-50' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {action.icon} {action.label}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}