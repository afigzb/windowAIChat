/**
 * 文件管理相关的辅助工具函数
 * 职责：提供前端文件处理的辅助功能
 * 
 * 注意：需要纯文本时使用 electronAPI.readFileAsText()
 */

import { getFileName } from './pathHelper'

// 重新导出 getFileName，保持向后兼容
export { getFileName }

/**
 * 格式化文件的结果
 */
export interface FormattedFileContent {
  /** 格式化后的内容（用于显示给AI） */
  content: string
  /** 文件元数据 */
  metadata: {
    /** 完整文件路径（用于缓存识别） */
    filePath: string
    /** 文件名（用于显示） */
    fileName: string
  }
}

/**
 * 格式化文件内容为发送格式（用于AI对话）
 * 
 * 改进方案：
 * - 返回包含内容和元数据的对象，而不是在内容中嵌入路径标记
 * - 元数据将存储在 Message._meta 中，实现内容和元数据的分离
 * - 格式更简洁：--- 文件: fileName.txt ---（无需路径标记）
 */
export function formatFileContent(filePath: string, content: string): FormattedFileContent {
  const fileName = getFileName(filePath)
  
  // 限制内容长度，避免消息过长
  const maxContentLength = 5000
  let trimmedContent = content
  
  if (content.length > maxContentLength) {
    trimmedContent = content.substring(0, maxContentLength) + '\n...(内容已截断)'
  }
  
  // 格式：只显示文件名，路径信息通过元数据传递
  const formattedContent = `\n\n--- 文件: ${fileName} ---\n${trimmedContent}\n--- 文件结束 ---`
  
  return {
    content: formattedContent,
    metadata: {
      filePath,
      fileName
    }
  }
}

