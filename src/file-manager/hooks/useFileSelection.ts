import { useState, useCallback } from 'react'
import { formatFileContent } from '../utils/fileHelper'
import type { FileContent } from '../../document-editor'

/**
 * 文件选择管理Hook
 * 
 * 职责：
 * - 管理多文件选择状态（用于AI对话的上下文）
 * - 协调打开文件和选中文件的内容获取
 * - 使用后端统一API读取文件，避免重复实现
 * 
 * 属于：file-manager 模块
 * 原因：文件选择是文件管理的一部分功能
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
   * 读取文件内容为纯文本（使用后端统一API）
   * 后端会自动处理HTML到文本的转换，避免前端重复实现
   */
  const readFileContent = async (filePath: string): Promise<string> => {
    const result = await (window as any).electronAPI.readFileAsText(filePath)
    
    if (!result.success) {
      throw new Error(result.error || '读取文件失败')
    }

    return result.content || ''
  }

  /**
   * 提取HTML内容为纯文本（前端快速提取）
   * 用于编辑器中正在编辑的内容，避免保存文件或重新读取
   */
  const extractTextFromHtml = (html: string): string => {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    return (tempDiv.textContent || tempDiv.innerText || '').trim()
  }

  /**
   * 获取所有选中文件的内容（用于AI对话）
   * 
   * 策略：
   * 1. 如果文件正在编辑器中打开且已修改，使用编辑器中的最新内容（避免读取过期数据）
   * 2. 否则通过后端统一API读取（后端直接返回纯文本）
   * 
   * 注意：对于正在编辑的文档，我们使用前端DOM提取文本而不是后端API，
   * 因为编辑器中的内容可能尚未保存，直接提取可以获得最新状态。
   * 这是唯一保留前端HTML转文本的场景，其他场景统一使用后端API。
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
            // 特殊处理：如果文件正在编辑器中打开且已修改，使用编辑器中的最新内容
            if (openFile && openFile.path === filePath && openFile.type === 'document') {
              // 直接从编辑器内容提取文本（快速、实时、无需后端）
              const text = extractTextFromHtml(openFile.htmlContent || '')
              parts.push(formatFileContent(filePath, text))
            } else {
              // 标准路径：通过后端统一API读取（后端负责HTML到文本的转换）
              const content = await readFileContent(filePath)
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
