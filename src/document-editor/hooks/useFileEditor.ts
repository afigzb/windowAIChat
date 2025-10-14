// 通用文件编辑器状态管理 Hook

import { useState, useCallback } from 'react'
import type { WordCountResult } from '../../md-html-dock/types'
import { detectFileType, getSupportedFormats } from '../../md-html-dock/utils/fileTypeDetector'
import { useConfirm } from '../../file-manager/hooks/useConfirm'
import { fileContentCache } from '../../file-manager/utils/fileContentCache'
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

  // 打开文件进行编辑或查看
  const openFileForEdit = useCallback(async (filePath: string, fileName: string) => {
    const fileSupport = isSupportedFile(filePath)
    if (!fileSupport.isSupported) {
      const supportedFormats = getSupportedFormats()
      setError(fileSupport.reason || `不支持的文件格式。支持的格式：${supportedFormats.slice(0, 10).join(', ')}${supportedFormats.length > 10 ? ' 等' : ''}`)
      return
    }

    if (openFile && openFile.path === filePath) {
      return
    }

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
      
      // 根据文件类型读取内容
      if (fileType === 'document') {
        let htmlContent = ''
        
        if (fileTypeInfo.readMethod === 'html') {
          // DOCX/DOC 文件使用特殊的HTML读取方式
          htmlContent = await (window as any).electronAPI.readDocxAsHtml(filePath)
        } else if (fileTypeInfo.readMethod === 'text') {
          // 文本文件直接读取并转换为HTML格式
          const textContent = await (window as any).electronAPI.readFile(filePath)
          
          if (textContent.trim()) {
            // 检测是否已经是HTML格式
            if (textContent.trim().startsWith('<') && textContent.includes('>')) {
              htmlContent = textContent
            } else {
              // 普通文本转换为HTML段落
              htmlContent = textContent
                .split('\n')
                .map((line: string) => line.trim() ? `<p>${line}</p>` : '<p><br></p>')
                .join('')
            }
          } else {
            htmlContent = '<p><br></p>'
          }
        }
        
        setOpenFile({
          type: 'document',
          path: filePath,
          name: fileName,
          htmlContent,
          isModified: false
        })
        
      } else if (fileType === 'image') {
        // 图片文件读取为base64
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

