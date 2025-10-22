/**
 * 文件管理相关的辅助工具函数
 * 职责：提供前端文件处理的辅助功能
 * 
 * 注意：需要纯文本时使用 electronAPI.readFileAsText()
 */

/**
 * 获取文件名（不包含路径）
 */
export function getFileName(filePath: string): string {
  const pathSeparator = filePath.includes('/') ? '/' : '\\'
  const segments = filePath.split(pathSeparator)
  return segments[segments.length - 1] || filePath
}

/**
 * 格式化文件内容为发送格式（用于AI对话）
 */
export function formatFileContent(filePath: string, content: string): string {
  const fileName = getFileName(filePath)
  
  // 限制内容长度，避免消息过长
  const maxContentLength = 5000
  let trimmedContent = content
  
  if (content.length > maxContentLength) {
    trimmedContent = content.substring(0, maxContentLength) + '\n...(内容已截断)'
  }
  
  return `\n\n--- 文件: ${fileName} ---\n${trimmedContent}\n--- 文件结束 ---`
}

