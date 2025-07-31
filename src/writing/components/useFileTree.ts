// 文件树相关的hook

import { useState, useEffect, useCallback } from 'react'
import fileSystemManager, { type FileSystemNode, type Workspace } from '../../storage/file-system'

interface InlineEditState {
  isActive: boolean
  mode: 'create' | 'rename'
  type: 'file' | 'directory'
  parentPath: string
  defaultValue?: string
}

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  node: FileSystemNode | null
}

export function useFileTree() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [fileTree, setFileTree] = useState<FileSystemNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    node: null
  })
  const [inlineEdit, setInlineEdit] = useState<InlineEditState>({
    isActive: false,
    mode: 'create',
    type: 'file',
    parentPath: ''
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

  const refreshFileTree = async () => {
    const tree = await fileSystemManager.loadFileTree()
    setFileTree(tree)
  }

  const handleFileClick = (node: FileSystemNode) => {
    // 通过回调通知父组件
    if ((window as any).onFileSelect) {
      (window as any).onFileSelect(node.path, node.name)
    }
  }

  const startInlineEdit = useCallback((mode: 'create' | 'rename', type: 'file' | 'directory', parentPath: string, defaultValue?: string) => {
    setContextMenu(prev => ({ ...prev, isOpen: false }))
    setInlineEdit({
      isActive: true,
      mode,
      type,
      parentPath,
      defaultValue
    })
  }, [])

  const handleInlineEditConfirm = useCallback(async (name: string) => {
    const { mode, type, parentPath } = inlineEdit
    setInlineEdit({ isActive: false, mode: 'create', type: 'file', parentPath: '' })
    
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
      await refreshFileTree()
    } catch (error) {
      const action = mode === 'create' ? '创建' : '重命名'
      const itemType = type === 'file' ? '文件' : '文件夹'
      console.error(`${action}${itemType}失败:`, error)
      alert(`${action}${itemType}失败: ${error}`)
    }
  }, [inlineEdit])

  const handleInlineEditCancel = useCallback(() => {
    setInlineEdit({ isActive: false, mode: 'create', type: 'file', parentPath: '' })
  }, [])

  const handleCreateFile = useCallback((dirPath: string) => {
    startInlineEdit('create', 'file', dirPath)
  }, [startInlineEdit])

  const handleCreateDirectory = useCallback((dirPath: string) => {
    startInlineEdit('create', 'directory', dirPath)
  }, [startInlineEdit])

  const handleRename = useCallback((node: FileSystemNode) => {
    setContextMenu(prev => ({ ...prev, isOpen: false }))
    startInlineEdit('rename', node.isDirectory ? 'directory' : 'file', node.path, node.name)
  }, [startInlineEdit])

  const handleDelete = useCallback(async (node: FileSystemNode) => {
    const itemType = node.isDirectory ? '文件夹' : '文件'
    setContextMenu(prev => ({ ...prev, isOpen: false }))
    
    if (confirm(`确定要删除${itemType} "${node.name}" 吗？${node.isDirectory ? '这将删除文件夹及其所有内容。' : ''}`)) {
      try {
        await fileSystemManager.delete(node.path)
        await refreshFileTree()
      } catch (error) {
        console.error(`删除${itemType}失败:`, error)
        alert(`删除${itemType}失败: ${error}`)
      }
    }
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, node?: FileSystemNode) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 右键时关闭内联编辑
    setInlineEdit({ isActive: false, mode: 'create', type: 'file', parentPath: '' })
    
    // 如果没有传入节点，使用根目录
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
  }, [workspace])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }))
  }, [])

  return {
    workspace,
    fileTree,
    isLoading,
    contextMenu,
    inlineEdit,
    handleSelectWorkspace,
    handleFileClick,
    handleCreateFile,
    handleCreateDirectory,
    handleRename,
    handleDelete,
    handleContextMenu,
    handleCloseContextMenu,
    handleInlineEditConfirm,
    handleInlineEditCancel
  }
}