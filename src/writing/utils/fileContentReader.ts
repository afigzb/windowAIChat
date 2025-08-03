// 文件内容读取器
// 负责读取各种类型文件的内容，并从HTML结构中提取纯文本

/**
 * 从HTML内容中提取纯文本
 * 基于wordCount.ts中的逻辑，但专门用于文件内容提取
 */
export function extractTextFromHTML(htmlContent: string): string {
  if (!htmlContent.trim()) {
    return ''
  }

  // 创建临时DOM元素来提取纯文本
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent
  const textContent = tempDiv.textContent || tempDiv.innerText || ''
  
  return textContent.trim()
}

/**
 * 获取文件的扩展名
 */
function getFileExtension(filePath: string): string {
  const lastDotIndex = filePath.lastIndexOf('.')
  return lastDotIndex !== -1 ? filePath.substring(lastDotIndex + 1).toLowerCase() : ''
}

/**
 * 获取文件名（不包含路径）
 */
export function getFileName(filePath: string): string {
  const pathSeparator = filePath.includes('/') ? '/' : '\\'
  const segments = filePath.split(pathSeparator)
  return segments[segments.length - 1] || filePath
}

/**
 * 读取文件内容并提取纯文本
 * @param filePath 文件路径
 * @returns Promise<string> 提取的纯文本内容
 */
export async function readFileContent(filePath: string): Promise<string> {
  try {
    // 检查Electron API是否可用
    if (typeof window === 'undefined' || !(window as any).electronAPI) {
      throw new Error('Electron API不可用')
    }

    const extension = getFileExtension(filePath)
    
    switch (extension) {
      case 'docx':
      case 'doc':
        // 对于DOCX/DOC文件，使用专门的API读取HTML内容然后提取纯文本
        const htmlContent = await (window as any).electronAPI.readDocxAsHtml(filePath)
        return extractTextFromHTML(htmlContent || '')
        
      case 'txt':
      case 'md':
        // 对于纯文本文件，直接读取内容
        const textContent = await (window as any).electronAPI.readFile(filePath)
        return (textContent || '').trim()
        
      default:
        // 对于其他文件类型，尝试作为文本读取
        const content = await (window as any).electronAPI.readFile(filePath)
        const contentStr = content || ''
        // 如果内容看起来像HTML，提取纯文本；否则直接返回
        if (contentStr.includes('<') && contentStr.includes('>')) {
          return extractTextFromHTML(contentStr)
        }
        return contentStr.trim()
    }
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error)
    throw new Error(`无法读取文件: ${getFileName(filePath)}`)
  }
}

/**
 * 格式化文件内容为发送格式
 * @param filePath 文件路径
 * @param content 文件内容
 * @returns 格式化后的字符串
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

/**
 * 批量读取多个文件的内容并格式化
 * @param filePaths 文件路径数组
 * @returns Promise<string> 格式化后的所有文件内容
 */
export async function readMultipleFiles(filePaths: string[]): Promise<string> {
  if (filePaths.length === 0) {
    return ''
  }
  
  const results: string[] = []
  
  for (const filePath of filePaths) {
    try {
      const content = await readFileContent(filePath)
      if (content.trim()) {
        results.push(formatFileContent(filePath, content))
      }
    } catch (error) {
      // 记录错误但继续处理其他文件
      console.error(`处理文件失败: ${filePath}`, error)
      results.push(`\n\n--- 文件: ${getFileName(filePath)} ---\n[读取失败: ${error instanceof Error ? error.message : '未知错误'}]\n--- 文件结束 ---`)
    }
  }
  
  return results.join('')
}