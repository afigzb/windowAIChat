/**
 * 路径处理工具函数
 * 统一处理路径相关的操作，避免重复代码
 */

/**
 * 规范化路径（统一使用正斜杠，转小写用于比较）
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').toLowerCase()
}

/**
 * 比较两个路径是否相同（忽略大小写和分隔符差异）
 */
export function isSamePath(path1: string, path2: string): boolean {
  return normalizePath(path1) === normalizePath(path2)
}

/**
 * 获取路径的父目录
 */
export function getParentDir(filePath: string): string {
  // 优先使用 window.path（如果 Electron 环境提供）
  if (typeof window !== 'undefined' && (window as any).path) {
    return (window as any).path.dirname(filePath)
  }
  
  // 降级方案：手动解析
  const lastSlashIndex = Math.max(
    filePath.lastIndexOf('/'),
    filePath.lastIndexOf('\\')
  )
  
  return lastSlashIndex > 0 ? filePath.substring(0, lastSlashIndex) : filePath
}

/**
 * 从完整路径提取文件名
 */
export function getFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/).filter(Boolean)
  return parts[parts.length - 1] || filePath
}

/**
 * 检查源文件是否已经在目标目录中
 */
export function isAlreadyInTargetDir(sourcePath: string, targetDirPath: string): boolean {
  const sourceParent = getParentDir(sourcePath)
  return isSamePath(sourceParent, targetDirPath)
}

