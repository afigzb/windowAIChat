/**
 * 工作区拖放Hook
 * 处理拖拽文件夹到工作区以更换工作目录
 */

import { useState, useCallback } from 'react'
import type { Workspace } from '../../storage/file-system'

interface UseWorkspaceDropOptions {
  onSetWorkspace: (workspace: Workspace) => Promise<void>
  onError: (message: string) => void
}

export function useWorkspaceDrop({ onSetWorkspace, onError }: UseWorkspaceDropOptions) {
  const [isWorkspaceDragOver, setIsWorkspaceDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsWorkspaceDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsWorkspaceDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsWorkspaceDragOver(false)
    
    // 检查是否是外部文件夹拖入
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      const filePath = (window as any).electronAPI?.getPathForFile?.(file)
      
      if (filePath && (window as any).electronAPI) {
        try {
          // 检查是否为文件夹
          const stats = await (window as any).electronAPI.getFileStats(filePath)
          
          if (stats.isDirectory) {
            // 创建新工作区对象
            const newWorkspace = {
              id: Date.now().toString(36) + Math.random().toString(36).substr(2),
              name: filePath.split(/[/\\]/).filter(Boolean).pop() || filePath,
              rootPath: filePath,
              createdAt: new Date(),
              lastAccessed: new Date()
            }
            
            await onSetWorkspace(newWorkspace)
          } else {
            onError('请拖入文件夹而不是文件')
          }
        } catch (err) {
          onError(`无法更换工作目录：${err}`)
        }
      }
    }
  }, [onSetWorkspace, onError])

  return {
    isWorkspaceDragOver,
    workspaceDropHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    }
  }
}

