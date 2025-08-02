// DOCX文件编辑器状态管理 Hook

import { useState, useCallback } from 'react'
import type { WordCountResult } from '../utils/wordCount'
import { detectFileType, getSupportedFormats } from '../utils/fileTypeDetector'

export interface DocxFile {
  path: string
  name: string
  htmlContent: string // 转换为HTML的内容
  originalHtmlContent: string // 原始HTML内容用于比较是否修改
  isModified: boolean
}

export function useDocxEditor() {
  const [openFile, setOpenFile] = useState<DocxFile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState<WordCountResult>({
    characters: 0,
    words: 0
  })

  // 判断文件是否为支持的格式
  const isSupportedFile = (filePath: string): { isSupported: boolean; reason?: string } => {
    const fileTypeInfo = detectFileType(filePath)
    return {
      isSupported: fileTypeInfo.isSupported,
      reason: fileTypeInfo.reason
    }
  }

  // 内部保存函数，避免依赖循环
  const saveCurrentFile = useCallback(async (): Promise<boolean> => {
    if (!openFile || !openFile.isModified) {
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
        const textContent = htmlToText(openFile.htmlContent)
        await (window as any).electronAPI.writeFile(openFile.path, textContent)
      } else {
        throw new Error('不支持保存此文件格式')
      }
      
      setOpenFile(prev => prev ? {
        ...prev,
        originalHtmlContent: prev.htmlContent,
        isModified: false
      } : null)
      
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

  // 打开文件进行编辑
  const openFileForEdit = useCallback(async (filePath: string, fileName: string) => {
    const fileSupport = isSupportedFile(filePath)
    if (!fileSupport.isSupported) {
      const supportedFormats = getSupportedFormats()
      setError(fileSupport.reason || `不支持的文件格式。支持的格式：${supportedFormats.slice(0, 10).join(', ')}${supportedFormats.length > 10 ? ' 等' : ''}`)
      return
    }

    // 如果要打开的文件已经是当前打开的文件，直接返回
    if (openFile && openFile.path === filePath) {
      return
    }

    // 如果有未保存的文件，先询问是否保存
    if (openFile && openFile.isModified) {
      const shouldSave = confirm(`文件 "${openFile.name}" 已修改但未保存，是否要先保存？`)
      if (shouldSave) {
        const saved = await saveCurrentFile()
        if (!saved) {
          return
        }
      }
    }

    // 立即清理状态，确保界面及时响应
    setOpenFile(null)
    setError(null)
    setWordCount({
      characters: 0,
      words: 0
    })

    setIsLoading(true)
    
    try {
      let htmlContent = ''
      const fileTypeInfo = detectFileType(filePath)
      
      if (fileTypeInfo.readMethod === 'html') {
        // DOCX/DOC 文件使用特殊的HTML读取方式
        htmlContent = await (window as any).electronAPI.readDocxAsHtml(filePath)
      } else if (fileTypeInfo.readMethod === 'text') {
        // 文本文件直接读取并转换为HTML格式
        const textContent = await (window as any).electronAPI.readFile(filePath)
        
        // 处理不同类型的文本内容
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
      } else {
        throw new Error('不支持的文件格式')
      }
      
      setOpenFile({
        path: filePath,
        name: fileName,
        htmlContent,
        originalHtmlContent: htmlContent,
        isModified: false
      })
    } catch (err) {
      setError(`打开文件失败: ${err}`)
      console.error('打开文件失败:', err)
    } finally {
      setIsLoading(false)
    }
  }, [openFile, saveCurrentFile])

  // 更新文件内容
  const updateContent = useCallback((newHtmlContent: string) => {
    if (!openFile) return
    
    setOpenFile({
      ...openFile,
      htmlContent: newHtmlContent,
      isModified: newHtmlContent !== openFile.originalHtmlContent
    })
  }, [openFile])

  // 对外暴露的保存文件函数
  const saveFile = saveCurrentFile

  // 关闭文件
  const closeFile = useCallback(() => {
    if (openFile?.isModified) {
      if (!confirm('文件已修改但未保存，确定要关闭吗？')) {
        return false
      }
    }
    
    setOpenFile(null)
    setError(null)
    setWordCount({
      characters: 0,
      words: 0
    })
    return true
  }, [openFile])

  // 更新字数统计
  const updateWordCount = useCallback((newWordCount: WordCountResult) => {
    setWordCount(newWordCount)
  }, [])

  // 简单的HTML转文本函数
  const htmlToText = (html: string): string => {
    // 创建临时DOM元素来提取文本
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
    isSupportedFile
  }
}