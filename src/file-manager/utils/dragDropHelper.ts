/**
 * 拖拽操作辅助工具
 * 统一处理文件拖拽相关的数据传输和解析
 */

import { fileSystemManager } from '../../storage/file-system'
import { isAlreadyInTargetDir, getParentDir } from './pathHelper'

/**
 * 拖拽数据传输的键名常量
 */
export const DRAG_DATA_KEYS = {
  SINGLE_PATH: 'application/x-filepath',
  MULTIPLE_PATHS: 'application/x-filepaths',
  IS_DIRECTORY: 'application/x-isdir',
  TEXT_PLAIN: 'text/plain'
} as const

/**
 * 从 DataTransfer 中提取拖拽的文件路径
 */
export function extractDraggedPaths(dataTransfer: DataTransfer): {
  type: 'single' | 'multiple' | 'none'
  paths: string[]
} {
  // 检查是否是多文件
  const multiplePathsData = dataTransfer.getData(DRAG_DATA_KEYS.MULTIPLE_PATHS)
  if (multiplePathsData) {
    try {
      const paths = JSON.parse(multiplePathsData) as string[]
      return { type: 'multiple', paths }
    } catch {
      // JSON 解析失败，忽略
    }
  }

  // 检查单文件
  const singlePath = dataTransfer.getData(DRAG_DATA_KEYS.SINGLE_PATH) ||
                    dataTransfer.getData(DRAG_DATA_KEYS.TEXT_PLAIN)
  if (singlePath) {
    return { type: 'single', paths: [singlePath] }
  }

  return { type: 'none', paths: [] }
}

/**
 * 设置拖拽数据
 */
export function setDragData(dataTransfer: DataTransfer, paths: string | string[], isDirectory?: boolean): void {
  if (typeof paths === 'string') {
    // 单文件
    dataTransfer.setData(DRAG_DATA_KEYS.SINGLE_PATH, paths)
    dataTransfer.setData(DRAG_DATA_KEYS.TEXT_PLAIN, paths)
    if (isDirectory !== undefined) {
      dataTransfer.setData(DRAG_DATA_KEYS.IS_DIRECTORY, isDirectory ? '1' : '0')
    }
  } else if (paths.length > 1) {
    // 多文件
    dataTransfer.setData(DRAG_DATA_KEYS.MULTIPLE_PATHS, JSON.stringify(paths))
    dataTransfer.setData(DRAG_DATA_KEYS.TEXT_PLAIN, paths.join('\n'))
  } else if (paths.length === 1) {
    // 单文件（数组形式）
    dataTransfer.setData(DRAG_DATA_KEYS.SINGLE_PATH, paths[0])
    dataTransfer.setData(DRAG_DATA_KEYS.TEXT_PLAIN, paths[0])
  }
}

/**
 * 批量移动文件到目标目录
 * @returns 成功移动的文件数量和路径映射
 */
export async function batchMoveFiles(
  sourcePaths: string[],
  targetDirPath: string
): Promise<{ 
  success: number
  failed: number
  errors: Error[]
  pathMappings: Array<{ oldPath: string; newPath: string }>
}> {
  let success = 0
  let failed = 0
  const errors: Error[] = []
  const pathMappings: Array<{ oldPath: string; newPath: string }> = []

  // 过滤掉已经在目标目录的文件
  const pathsToMove = sourcePaths.filter(path => {
    // 排除自身
    if (path === targetDirPath) return false
    // 排除已经在目标目录的文件
    if (isAlreadyInTargetDir(path, targetDirPath)) return false
    return true
  })

  for (const sourcePath of pathsToMove) {
    try {
      await fileSystemManager.move(sourcePath, targetDirPath)
      
      // 计算新路径
      const fileName = sourcePath.split(/[/\\]/).pop() || ''
      const separator = targetDirPath.includes('\\') ? '\\' : '/'
      const newPath = `${targetDirPath}${separator}${fileName}`
      
      pathMappings.push({ oldPath: sourcePath, newPath })
      success++
    } catch (error) {
      failed++
      errors.push(error as Error)
      console.error(`移动失败: ${sourcePath}`, error)
    }
  }

  return { success, failed, errors, pathMappings }
}

/**
 * 处理外部文件拖入（从桌面等）
 */
export async function handleExternalFilesDrop(
  files: FileList,
  targetDirPath: string
): Promise<{ success: number; failed: number; errors: Error[] }> {
  let success = 0
  let failed = 0
  const errors: Error[] = []

  const fileArray = Array.from(files)

  for (const file of fileArray) {
    try {
      // 使用 Electron 的 webUtils.getPathForFile 获取文件路径
      const filePath = (window as any).electronAPI?.getPathForFile?.(file)
      
      if (filePath) {
        await fileSystemManager.copy(filePath, targetDirPath)
        success++
      } else {
        failed++
        errors.push(new Error('无法获取文件路径'))
      }
    } catch (error) {
      failed++
      errors.push(error as Error)
      console.error('复制文件失败:', error)
    }
  }

  return { success, failed, errors }
}

