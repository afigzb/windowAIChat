// 文件内容读取器
// 负责读取各种类型文件的内容，并从HTML结构中提取纯文本

import { fileContentCache } from '../../file-manager/utils/fileContentCache'
import { detectFileType } from './fileTypeDetector'

/**
 * 从HTML内容中提取纯文本
 * 基于wordCount.ts中的逻辑，但专门用于文件内容提取
 */
export function extractTextFromHTML(htmlContent: string): string {
  if (!htmlContent.trim()) {
    return ''
  }

  // 先移除样式/脚本/头部等不应出现在纯文本中的内容
  const sanitizedHtml = htmlContent
    // 移除<style>块
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // 移除<script>块
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // 移除<head>、<title>等头部内容
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
    // 移除HTML注释
    .replace(/<!--([\s\S]*?)-->/g, '')

  // 创建临时DOM元素来提取纯文本
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = sanitizedHtml
  const textContent = tempDiv.textContent || tempDiv.innerText || ''
  
  console.log('textContent', textContent);
  console.log('textContent2:::', textContent.replace(/\r\n?/g, '\n')
  .replace(/\u00A0/g, ' ')
  .replace(/[\t ]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim());
  // 规范化空白字符，避免出现过多连续空行/空格
  return textContent
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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
 * @param useCache 是否使用缓存（默认为true）
 * @returns Promise<string> 提取的纯文本内容
 */
export async function readFileContent(filePath: string, useCache: boolean = true): Promise<string> {
  try {
    // 先检查缓存
    if (useCache) {
      const cachedContent = fileContentCache.get(filePath)
      if (cachedContent !== null) {
        return cachedContent
      }
    }
    
    // 检查Electron API是否可用
    if (typeof window === 'undefined' || !(window as any).electronAPI) {
      throw new Error('Electron API不可用')
    }

    // 检测文件类型
    const fileTypeInfo = detectFileType(filePath)
    let result: string = ''
    
    switch (fileTypeInfo.readMethod) {
      case 'html':
        // 对于DOCX/DOC文件，使用专门的API读取HTML内容然后提取纯文本
        const htmlContent = await (window as any).electronAPI.readDocxAsHtml(filePath)
        result = extractTextFromHTML(htmlContent || '')
        break
        
      case 'image':
        // 对于图片文件，读取为base64格式
        const imageData = await (window as any).electronAPI.readImageAsBase64(filePath)
        const fileName = getFileName(filePath)
        const sizeKB = Math.round(imageData.size / 1024)
        result = `[图片文件: ${fileName}]\n类型: ${imageData.mimeType}\n大小: ${sizeKB} KB\n\n![${fileName}](${imageData.dataUrl})`
        break
        
      case 'text':
        // 对于文本文件
        const extension = getFileExtension(filePath)
        if (extension === 'txt' || extension === 'md') {
          // 对于纯文本文件，直接读取内容
          const textContent = await (window as any).electronAPI.readFile(filePath)
          result = (textContent || '').trim()
        } else {
          // 对于其他文件类型，尝试作为文本读取
          const content = await (window as any).electronAPI.readFile(filePath)
          const contentStr = content || ''
          // 如果内容看起来像HTML，提取纯文本；否则直接返回
          if (contentStr.includes('<') && contentStr.includes('>')) {
            result = extractTextFromHTML(contentStr)
          } else {
            result = contentStr.trim()
          }
        }
        break
        
      case 'none':
      default:
        throw new Error(fileTypeInfo.reason || '不支持的文件格式')
    }
    
    // 保存到缓存
    if (useCache && result) {
      fileContentCache.set(filePath, result)
    }
    
    return result
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
  const fileTypeInfo = detectFileType(filePath)
  
  // 对于图片文件，使用特殊的格式化方式
  if (fileTypeInfo.readMethod === 'image') {
    // 图片内容已经包含了markdown格式的图片显示，直接使用
    return `\n\n--- 图片文件: ${fileName} ---\n${content}\n--- 图片结束 ---`
  }
  
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
 * @param batchSize 批处理大小（默认为3，避免同时处理过多文件）
 * @returns Promise<string> 格式化后的所有文件内容
 */
export async function readMultipleFiles(filePaths: string[], batchSize: number = 3, useCache: boolean = false): Promise<string> {
  if (filePaths.length === 0) {
    return ''
  }
  
  const results: string[] = []
  
  // 分批处理文件，避免同时读取过多文件导致卡顿
  for (let i = 0; i < filePaths.length; i += batchSize) {
    const batch = filePaths.slice(i, i + batchSize)
    
    // 并行处理当前批次的文件
    const batchPromises = batch.map(async (filePath) => {
      try {
        const content = await readFileContent(filePath, useCache)
        if (content.trim()) {
          return formatFileContent(filePath, content)
        }
        return ''
      } catch (error) {
        // 记录错误但继续处理其他文件
        console.error(`处理文件失败: ${filePath}`, error)
        return `\n\n--- 文件: ${getFileName(filePath)} ---\n[读取失败: ${error instanceof Error ? error.message : '未知错误'}]\n--- 文件结束 ---`
      }
    })
    
    // 等待当前批次完成
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults.filter(content => content !== ''))
  }
  
  return results.join('')
}
