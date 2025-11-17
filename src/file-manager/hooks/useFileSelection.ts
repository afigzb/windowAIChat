import { useState, useCallback } from 'react'
import { formatFileContent, type FormattedFileContent } from '../utils/fileHelper'
import type { FileContent } from '../../types/file-api'

/**
 * 文件选择管理Hook
 * 
 * 职责：
 * - 管理多文件选择状态（用于AI对话的上下文）
 * - 协调打开文件和选中文件的内容获取
 * - 使用后端统一API读取文件，避免重复实现
 * - 支持文件顺序管理（用于独立插入模式）
 * 
 * 属于：file-manager 模块
 * 原因：文件选择是文件管理的一部分功能
 */
export function useFileSelection(openFile: FileContent | null) {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set())

  const handleFileSelect = useCallback((filePath: string, selected: boolean) => {
    setSelectedFiles(prev => {
      if (selected) {
        // 添加到末尾（如果不存在）
        if (!prev.includes(filePath)) {
          return [...prev, filePath]
        }
        return prev
      } else {
        // 移除
        return prev.filter(f => f !== filePath)
      }
    })
  }, [])

  const handleClearSelectedFiles = useCallback(() => {
    setSelectedFiles([])
  }, [])

  /**
   * 重新排序选中的文件（用于拖拽排序）
   */
  const handleReorderFiles = useCallback((newOrder: string[]) => {
    setSelectedFiles(newOrder)
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
   * 
   * 改进：现在返回格式化内容的字符串，元数据通过 getAdditionalContentList 单独获取
   */
  const getAdditionalContent = async (): Promise<string> => {
    if (selectedFiles.length === 0) return ''
    
    try {
      setLoadingFiles(new Set(selectedFiles))
      
      try {
        const parts: string[] = []
        
        for (const filePath of selectedFiles) {
          try {
            let formatted: FormattedFileContent
            
            // 特殊处理：如果文件正在编辑器中打开且已修改，使用编辑器中的最新内容
            if (openFile && openFile.path === filePath && openFile.type === 'document') {
              // 直接从编辑器内容提取文本（快速、实时、无需后端）
              const text = extractTextFromHtml(openFile.htmlContent || '')
              formatted = formatFileContent(filePath, text)
            } else {
              // 标准路径：通过后端统一API读取（后端负责HTML到文本的转换）
              const content = await readFileContent(filePath)
              formatted = formatFileContent(filePath, content)
            }
            
            parts.push(formatted.content)
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

  /**
   * 获取选中文件的内容列表（用于独立插入模式）
   * 返回按顺序排列的文件内容数组，每个元素包含完整的格式化文件内容和元数据
   */
  const getAdditionalContentList = async (): Promise<FormattedFileContent[]> => {
    if (selectedFiles.length === 0) return []

    try {
      setLoadingFiles(new Set(selectedFiles))
      
      try {
        const contents: FormattedFileContent[] = []
        
        for (const filePath of selectedFiles) {
          try {
            let formatted: FormattedFileContent
            
            // 特殊处理：如果文件正在编辑器中打开且已修改，使用编辑器中的最新内容
            if (openFile && openFile.path === filePath && openFile.type === 'document') {
              const text = extractTextFromHtml(openFile.htmlContent || '')
              formatted = formatFileContent(filePath, text)
            } else {
              const content = await readFileContent(filePath)
              formatted = formatFileContent(filePath, content)
            }
            
            contents.push(formatted)
          } catch (error) {
            console.error(`读取文件失败: ${filePath}`, error)
            // 继续处理其他文件，不中断整个流程
          } finally {
            setLoadingFiles(prev => {
              const newSet = new Set(prev)
              newSet.delete(filePath)
              return newSet
            })
          }
        }
        
        return contents
      } finally {
        setTimeout(() => {
          setLoadingFiles(new Set())
        }, 500)
      }
    } catch (error) {
      console.error('读取选中文件失败:', error)
      return []
    }
  }

  return {
    selectedFiles,
    loadingFiles,
    handleFileSelect,
    handleClearSelectedFiles,
    handleReorderFiles,
    getAdditionalContent,
    getAdditionalContentList
  }
}
