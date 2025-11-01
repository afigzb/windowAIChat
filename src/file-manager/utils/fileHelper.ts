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
 * 
 * 格式说明：
 * - 显示文件名（简短，不占用AI注意力）
 * - 在特殊标记中保存完整路径（用于缓存识别）
 * - 格式：--- 文件: fileName.txt <!PATH:完整路径!> ---
 */
export function formatFileContent(filePath: string, content: string): string {
  const fileName = getFileName(filePath)
  
  // 限制内容长度，避免消息过长
  const maxContentLength = 5000
  let trimmedContent = content
  
  if (content.length > maxContentLength) {
    trimmedContent = content.substring(0, maxContentLength) + '\n...(内容已截断)'
  }
  
  // 格式：显示文件名，在特殊标记中保存完整路径
  // 这样AI看到的是简短的文件名，preprocessor可以提取完整路径用于缓存
  return `\n\n--- 文件: ${fileName} <!PATH:${filePath}!> ---\n${trimmedContent}\n--- 文件结束 ---`
}

