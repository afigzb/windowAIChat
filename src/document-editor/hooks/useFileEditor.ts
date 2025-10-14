// 通用文件编辑器状态管理 Hook
// 职责：管理单个文件的打开、编辑、保存状态

import { useState, useCallback } from 'react'
import type { WordCountResult } from '../../md-html-dock/types'
import { detectFileType, getSupportedFormats } from '../../md-html-dock/utils/fileTypeDetector'
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

  // 判断文件是否为支持的格式
  const isSupportedFile = (filePath: string): { isSupported: boolean; reason?: string } => {
    const fileTypeInfo = detectFileType(filePath)
    return {
      isSupported: fileTypeInfo.isSupported,
      reason: fileTypeInfo.reason
    }
  }

  // 将readMethod转换为FileType
  const getFileType = (readMethod: string): FileType => {
    switch (readMethod) {
      case 'html':
      case 'text':
        return 'document'
      case 'image':
        return 'image'
      default:
        return 'unsupported'
    }
  }

  // 内部保存函数
  const saveCurrentFile = useCallback(async (): Promise<boolean> => {
    if (!openFile || openFile.type !== 'document' || !openFile.isModified) {
      return true
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const fileTypeInfo = detectFileType(openFile.path)
      
      if (fileTypeInfo.readMethod === 'html') {
        // DOCX/DOC 文件保存为对应格式
        await (window as any).electronAPI.saveHtmlAsDocx(openFile.path, openFile.htmlContent)
      } else if (fileTypeInfo.readMethod === 'text') {
        // 文本文件保存为纯文本
        const textContent = htmlToText(openFile.htmlContent || '')
        await (window as any).electronAPI.writeFile(openFile.path, textContent)
      } else {
        throw new Error('不支持保存此文件格式')
      }
      
      setOpenFile(prev => prev ? {
        ...prev,
        isModified: false
      } : null)

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
   * 打开文件进行编辑或查看
   * 
   * 策略：
   * 1. 检查文件格式是否支持
   * 2. 处理未保存的文件（提示用户）
   * 3. 根据文件类型调用对应的Electron API读取
   * 4. 文本文件转换为HTML格式供编辑器使用
   */
  const openFileForEdit = useCallback(async (filePath: string, fileName: string) => {
    // 1. 验证文件格式
    const fileSupport = isSupportedFile(filePath)
    if (!fileSupport.isSupported) {
      const supportedFormats = getSupportedFormats()
      setError(fileSupport.reason || `不支持的文件格式。支持的格式：${supportedFormats.slice(0, 10).join(', ')}${supportedFormats.length > 10 ? ' 等' : ''}`)
      return
    }

    // 2. 避免重复打开同一文件
    if (openFile && openFile.path === filePath) {
      return
    }

    // 3. 处理未保存的文件
    if (openFile && openFile.type === 'document' && openFile.isModified) {
      const shouldSave = await confirm({
        title: '文件未保存',
        message: `文件 "${openFile.name}" 已修改但未保存，是否要先保存？`,
        confirmText: '保存',
        cancelText: '不保存',
        type: 'warning'
      })
      if (shouldSave) {
        const saved = await saveCurrentFile()
        if (!saved) return
      }
    }

    setError(null)
    setIsLoading(true)
    
    try {
      const fileTypeInfo = detectFileType(filePath)
      const fileType = getFileType(fileTypeInfo.readMethod)
      
      // 4. 根据文件类型读取并构建 FileContent
      if (fileType === 'document') {
        const htmlContent = await readDocumentAsHtml(filePath, fileTypeInfo.readMethod)
        
        setOpenFile({
          type: 'document',
          path: filePath,
          name: fileName,
          htmlContent,
          isModified: false
        })
        
      } else if (fileType === 'image') {
        const imageData = await (window as any).electronAPI.readImageAsBase64(filePath)
        
        setOpenFile({
          type: 'image',
          path: filePath,
          name: fileName,
          imageData: {
            dataUrl: imageData.dataUrl,
            mimeType: imageData.mimeType,
            size: imageData.size
          }
        })
        
      } else {
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
  }, [openFile, saveCurrentFile, confirm])

  /**
   * 读取文档文件为HTML格式
   * 封装不同文件类型的读取逻辑
   */
  const readDocumentAsHtml = async (filePath: string, readMethod: string): Promise<string> => {
    if (readMethod === 'html') {
      // DOCX/DOC 文件：使用专用转换器
      return await (window as any).electronAPI.readDocxAsHtml(filePath)
    } else if (readMethod === 'text') {
      // 文本文件：读取后转换为HTML
      const textContent = await (window as any).electronAPI.readFile(filePath)
      return textToHtml(textContent)
    }
    
    return '<p><br></p>'
  }

  /**
   * 将纯文本转换为HTML格式
   */
  const textToHtml = (text: string): string => {
    if (!text || !text.trim()) {
      return '<p><br></p>'
    }
    
    // 检测是否已经是HTML格式
    if (text.trim().startsWith('<') && text.includes('>')) {
      return text
    }
    
    // 普通文本转换为HTML段落
    return text
      .split('\n')
      .map((line: string) => line.trim() ? `<p>${line}</p>` : '<p><br></p>')
      .join('')
  }

  // 更新文档内容
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

  const saveFile = saveCurrentFile

  // 关闭文件
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

  // 更新字数统计
  const updateWordCount = useCallback((newWordCount: WordCountResult) => {
    setWordCount(newWordCount)
  }, [])

  // 简单的HTML转文本函数
  const htmlToText = (html: string): string => {
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent || temp.innerText || ''
  }

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

