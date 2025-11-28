/**
 * 拖拽操作Hook
 * 统一管理文件/文件夹的拖拽行为
 * 
 * 职责：
 * - 处理拖拽开始/结束
 * - 处理拖拽悬停状态
 * - 处理文件放置（内部移动和外部复制）
 * - 管理拖拽视觉反馈
 */

import { useState, useCallback } from 'react'
import { 
  setDragData, 
  extractDraggedPaths, 
  batchMoveFiles, 
  handleExternalFilesDrop 
} from '../utils/dragDropHelper'
import { getParentDir } from '../utils/pathHelper'

interface UseDragDropOptions {
  /** 当前节点路径 */
  nodePath: string
  /** 是否为目录 */
  isDirectory: boolean
  /** 当前选中的文件集合 */
  focusedFiles?: Set<string>
  /** 成功回调 */
  onSuccess?: () => void
  /** 错误回调 */
  onError?: (error: Error, message: string) => void
  /** 路径更新回调（文件移动后） */
  onUpdatePaths?: (pathMappings: Array<{ oldPath: string; newPath: string }>) => void
}

export function useDragDrop(options: UseDragDropOptions) {
  const { 
    nodePath, 
    isDirectory, 
    focusedFiles, 
    onSuccess, 
    onError,
    onUpdatePaths 
  } = options

  const [isDragOver, setIsDragOver] = useState(false)

  /**
   * 拖拽开始
   */
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    
    // 如果当前节点是被选中的，检查是否有其他选中节点
    if (focusedFiles?.has(nodePath) && focusedFiles.size > 1) {
      const files = Array.from(focusedFiles)
      setDragData(e.dataTransfer, files)
    } else {
      setDragData(e.dataTransfer, nodePath, isDirectory)
    }
  }, [nodePath, isDirectory, focusedFiles])

  /**
   * 拖拽悬停
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }, [])

  /**
   * 拖拽离开
   */
  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  /**
   * 文件放置
   */
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    // 确定目标目录
    const targetDirPath = isDirectory ? nodePath : getParentDir(nodePath)

    // 处理外部文件拖入（从桌面或其他应用）
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      try {
        const result = await handleExternalFilesDrop(e.dataTransfer.files, targetDirPath)
        
        if (result.failed > 0) {
          onError?.(
            new Error('部分文件复制失败'),
            `成功: ${result.success}, 失败: ${result.failed}\n\n${result.errors.map(e => e.message).join('\n')}`
          )
        } else {
          onSuccess?.()
        }
      } catch (err) {
        onError?.(err as Error, `无法复制文件或文件夹：${err}`)
      }
      return
    }

    // 处理内部文件拖动 - 移动文件
    const draggedData = extractDraggedPaths(e.dataTransfer)
    
    if (draggedData.type === 'none') {
      return
    }

    // 排除自身和目标目录
    const pathsToMove = draggedData.paths.filter(
      p => p !== nodePath && p !== targetDirPath
    )
    
    if (pathsToMove.length === 0) {
      return
    }

    try {
      const result = await batchMoveFiles(pathsToMove, targetDirPath)
      
      // 更新选中文件的路径
      if (result.pathMappings.length > 0 && onUpdatePaths) {
        onUpdatePaths(result.pathMappings)
      }
      
      if (result.failed > 0) {
        onError?.(
          new Error('部分文件移动失败'),
          `成功: ${result.success}, 失败: ${result.failed}`
        )
      } else {
        onSuccess?.()
      }
    } catch (err) {
      onError?.(err as Error, `无法移动文件或文件夹：${err}`)
    }
  }, [nodePath, isDirectory, onSuccess, onError, onUpdatePaths])

  return {
    isDragOver,
    dragHandlers: {
      draggable: true,
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    }
  }
}

