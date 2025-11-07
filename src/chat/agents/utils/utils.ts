/**
 * Agents 系统通用工具函数（精简版）
 * 
 * 只保留实际使用的函数
 */

/**
 * 生成唯一ID
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 生成WorkspaceID
 */
export function generateWorkspaceId(): string {
  return generateId('ws')
}

/**
 * 截断文本到指定长度
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength - suffix.length) + suffix
}
