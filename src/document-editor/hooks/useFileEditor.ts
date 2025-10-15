// 通用文件编辑器状态管理 Hook
// 职责：管理单个文件的打开、编辑、保存状态
// 重构说明：文件解析和格式检测已移至后端 ConverterManager

import { useState, useCallback } from 'react'
import type { WordCountResult } from '../../md-html-dock/types'
import { useConfirm } from '../../components/useConfirm'
import { fileContentCache } from '../../storage/fileContentCache'
import type { FileContent, FileType, ImageData } from '../components/FileContentViewer'

export function useFileEditor() {
  const [openFile, setOpenFile] = useState<FileContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState<WordCountResult>({
    characters: 0,
    words: 0
  })
  const [isFirstUpdate, setIsFirstUpdate] = useState(true)
  
  const { confirm, confirmProps } = useConfirm()

  /**
   * 打开文件进行编辑或查看
   * 使用后端统一的文件处理API
   */
  const openFileForEdit = useCallback(async (filePath: string, fileName: string) => {
    // 1. 避免重复打开同一文件
    if (openFile && openFile.path === filePath) {
      return
    }

    // 2. 处理未保存的文件
    if (openFile && openFile.type === 'document' && openFile.isModified) {
      const shouldSave = await confirm({
        title: '文件未保存',
        message: `文件 "${openFile.name}" 已修改但未保存，是否要先保存？`,
        confirmText: '保存',
        cancelText: '不保存',
        type: 'warning'
      })
      if (shouldSave) {
        const saved = await saveFile()
        if (!saved) return
      }
    }

    setError(null)
    setIsLoading(true)
    
    try {
      // 3. 调用后端统一API读取文件
      const result = await (window as any).electronAPI.readFileAuto(filePath)
      
      if (!result.success) {
        setError(result.error || '读取文件失败')
        return
      }

      // 4. 根据后端返回的类型构建 FileContent
      if (result.type === 'document' || result.type === 'text') {
        // 文档或文本文件：content 是 HTML 字符串
        setOpenFile({
          type: 'document',
          path: filePath,
          name: fileName,
          htmlContent: result.content,
          isModified: false
        })
        
      } else if (result.type === 'image') {
        // 图片文件：content 是图片数据对象
        setOpenFile({
          type: 'image',
          path: filePath,
          name: fileName,
          imageData: {
            dataUrl: result.content.dataUrl,
            mimeType: result.content.mimeType,
            size: result.content.size
          }
        })
        
      } else {
        // 不支持的格式
        setOpenFile({
          type: 'unsupported',
          path: filePath,
          name: fileName
        })
      }
      
      // 重置首次更新标志
      setIsFirstUpdate(true)
    } catch (err) {
      setError(`打开文件失败: ${err}`)
      console.error('打开文件失败:', err)
    } finally {
      setIsLoading(false)
    }
  }, [openFile, confirm])

  /**
   * 更新文档内容
   */
  const updateContent = useCallback((newHtmlContent: string) => {
    if (!openFile || openFile.type !== 'document') return
    
    // 首次更新是编辑器标准化后的 HTML，用它作为原始内容基准
    if (isFirstUpdate) {
      setOpenFile({
        ...openFile,
        htmlContent: newHtmlContent,
        isModified: false
      })
      setIsFirstUpdate(false)
    } else {
      const currentContent = openFile.htmlContent || ''
      setOpenFile({
        ...openFile,
        htmlContent: newHtmlContent,
        isModified: newHtmlContent !== currentContent
      })
    }
  }, [openFile, isFirstUpdate])

  /**
   * 保存文件
   * 使用后端统一的保存API
   */
  const saveFile = useCallback(async (): Promise<boolean> => {
    if (!openFile || openFile.type !== 'document' || !openFile.isModified) {
      return true
    }

    setIsLoading(true)
    setError(null)
    
    try {
      // 调用后端统一API保存文件
      const result = await (window as any).electronAPI.saveFileAuto(
        openFile.path, 
        openFile.htmlContent
      )
      
      if (!result.success) {
        setError(result.error || '保存文件失败')
        return false
      }
      
      // 保存成功，更新状态
      setOpenFile(prev => prev ? {
        ...prev,
        isModified: false
      } : null)

      // 清除缓存
      fileContentCache.remove(openFile.path)
      
      return true
    } catch (err) {
      const errorMessage = `保存文件失败: ${err}`
      setError(errorMessage)
      console.error(errorMessage, err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [openFile])

  /**
   * 关闭文件
   */
  const closeFile = useCallback(async () => {
    if (openFile?.type === 'document' && openFile?.isModified) {
      const shouldClose = await confirm({
        title: '关闭文件',
        message: '文件已修改但未保存，确定要关闭吗？',
        confirmText: '确认',
        cancelText: '取消',
        type: 'warning'
      })
      if (!shouldClose) return false
    }
    
    setOpenFile(null)
    setError(null)
    setWordCount({ characters: 0, words: 0 })
    setIsFirstUpdate(true)
    return true
  }, [openFile, confirm])

  /**
   * 更新字数统计
   */
  const updateWordCount = useCallback((newWordCount: WordCountResult) => {
    setWordCount(newWordCount)
  }, [])

  /**
   * 检查文件是否为支持的格式
   * 现在使用后端API进行检查
   */
  const isSupportedFile = useCallback(async (filePath: string): Promise<{ isSupported: boolean; reason?: string }> => {
    try {
      const formatInfo = await (window as any).electronAPI.getFileFormatInfo(filePath)
      return {
        isSupported: formatInfo.isSupported,
        reason: formatInfo.reason
      }
    } catch (error) {
      return {
        isSupported: false,
        reason: '无法检测文件格式'
      }
    }
  }, [])

  return {
    openFile,
    isLoading,
    error,
    wordCount,
    openFileForEdit,
    updateContent,
    updateWordCount,
    saveFile,
    closeFile,
    isSupportedFile,
    confirmProps
  }
}
