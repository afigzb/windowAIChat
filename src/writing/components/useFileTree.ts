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



export function useFileTree() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [fileTree, setFileTree] = useState<FileSystemNode[]>([])
  const [isLoading, setIsLoading] = useState(false)

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

  // startInlineEdit现在通过Electron IPC触发，不再需要直接调用

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

  // 这些操作现在通过Electron右键菜单和内联编辑处理

  const handleContextMenuOpen = useCallback(() => {
    // 右键时关闭内联编辑
    setInlineEdit({ isActive: false, mode: 'create', type: 'file', parentPath: '' })
  }, [])

  // 查找节点的辅助函数
  const findNodeByPath = useCallback((path: string): FileSystemNode | null => {
    const findInNodes = (nodes: FileSystemNode[]): FileSystemNode | null => {
      for (const node of nodes) {
        if (node.path === path) {
          return node
        }
        if (node.children) {
          const found = findInNodes(node.children)
          if (found) return found
        }
      }
      return null
    }
    
    return findInNodes(fileTree)
  }, [fileTree])

  // 监听来自Electron的内联编辑触发事件
  useEffect(() => {
    const handleTriggerInlineEdit = (event: CustomEvent) => {
      const { action, type, parentPath, filePath, defaultValue } = event.detail
      
      if (action === 'create') {
        // 新建文件或文件夹
        setInlineEdit({
          isActive: true,
          mode: 'create',
          type: type as 'file' | 'directory',
          parentPath,
          defaultValue: ''
        })
      } else if (action === 'rename') {
        // 重命名
        const node = findNodeByPath(filePath)
        setInlineEdit({
          isActive: true,
          mode: 'rename',
          type: node?.isDirectory ? 'directory' : 'file',
          parentPath: filePath,
          defaultValue: defaultValue || ''
        })
      }
    }

    window.addEventListener('trigger-inline-edit', handleTriggerInlineEdit as EventListener)
    
    return () => {
      window.removeEventListener('trigger-inline-edit', handleTriggerInlineEdit as EventListener)
    }
  }, [findNodeByPath])

  return {
    workspace,
    fileTree,
    isLoading,
    inlineEdit,
    handleSelectWorkspace,
    handleFileClick,
    handleContextMenuOpen,
    handleInlineEditConfirm,
    handleInlineEditCancel
  }
}