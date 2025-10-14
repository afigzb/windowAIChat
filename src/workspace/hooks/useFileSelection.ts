import { useState, useCallback } from 'react'
import { readMultipleFiles, readFileContent, extractTextFromHTML, formatFileContent } from '../../md-html-dock/utils/fileContentReader'
import type { FileContent } from '../../document-editor'

/**
 * 文件选择管理Hook
 * 
 * 职责：
 * - 管理多文件选择状态（用于AI对话的上下文）
 * - 协调打开文件和选中文件的内容获取
 * - 统一使用 fileContentReader 读取文件，避免重复实现
 */
export function useFileSelection(openFile: FileContent | null) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set())

  const handleFileSelect = useCallback((filePath: string, selected: boolean) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(filePath)
      } else {
        newSet.delete(filePath)
      }
      return newSet
    })
  }, [])

  const handleClearSelectedFiles = useCallback(() => {
    setSelectedFiles(new Set())
  }, [])

  /**
   * 获取所有选中文件的内容（用于AI对话）
   * 
   * 策略：
   * 1. 如果文件正在编辑器中打开，优先从 openFile 获取最新内容
   * 2. 否则通过 readFileContent 统一读取
   */
  const getAdditionalContent = async (): Promise<string> => {
    if (selectedFiles.size === 0) return ''
    
    try {
      const filePaths = Array.from(selectedFiles)
      setLoadingFiles(new Set(filePaths))
      
      try {
        const parts: string[] = []
        
        for (const filePath of filePaths) {
          try {
            // 如果文件正在编辑器中打开，使用编辑器中的最新内容
            if (openFile && openFile.path === filePath) {
              if (openFile.type === 'image') {
                // 图片：重新读取（因为编辑器不会修改图片）
                const content = await readFileContent(filePath, false)
                parts.push(formatFileContent(filePath, content))
              } else if (openFile.type === 'document') {
                // 文档：使用编辑器中的HTML内容并提取文本
                const text = extractTextFromHTML(openFile.htmlContent || '')
                parts.push(formatFileContent(filePath, text))
              }
            } else {
              // 未打开的文件：通过统一接口读取
              const content = await readFileContent(filePath, false)
              parts.push(formatFileContent(filePath, content))
            }
          } catch (error) {
            console.error(`读取文件失败: ${filePath}`, error)
            // 继续处理其他文件，不中断整个流程
          } finally {
            // 逐个移除加载状态
            setLoadingFiles(prev => {
              const newSet = new Set(prev)
              newSet.delete(filePath)
              return newSet
            })
          }
        }
        
        return parts.join('')
      } finally {
        // 确保清空加载状态
        setTimeout(() => {
          setLoadingFiles(new Set())
        }, 500)
      }
    } catch (error) {
      console.error('读取选中文件失败:', error)
      return ''
    }
  }

  return {
    selectedFiles,
    loadingFiles,
    handleFileSelect,
    handleClearSelectedFiles,
    getAdditionalContent
  }
}

