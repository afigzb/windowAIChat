// DOCX文件编辑器状态管理 Hook

import { useState, useCallback } from 'react'

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

  // 判断文件是否为支持的格式
  const isSupportedFile = (filePath: string): boolean => {
    const ext = filePath.toLowerCase().split('.').pop()
    return ext === 'docx' || ext === 'doc' || ext === 'txt' || ext === 'md'
  }

  // 打开文件进行编辑
  const openFileForEdit = useCallback(async (filePath: string, fileName: string) => {
    if (!isSupportedFile(filePath)) {
      setError('不支持的文件格式。支持的格式：.docx, .doc, .txt, .md')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      let htmlContent = ''
      const ext = filePath.toLowerCase().split('.').pop()
      
      if (ext === 'docx' || ext === 'doc') {
        // 读取DOCX文件并转换为HTML
        htmlContent = await (window as any).electronAPI.readDocxAsHtml(filePath)
      } else {
        // 读取纯文本文件
        const textContent = await (window as any).electronAPI.readFile(filePath)
        // 将纯文本转换为简单的HTML
        htmlContent = textContent
          .split('\n')
          .map((line: string) => line.trim() ? `<p>${line}</p>` : '<p><br></p>')
          .join('')
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
  }, [])

  // 更新文件内容
  const updateContent = useCallback((newHtmlContent: string) => {
    if (!openFile) return
    
    setOpenFile({
      ...openFile,
      htmlContent: newHtmlContent,
      isModified: newHtmlContent !== openFile.originalHtmlContent
    })
  }, [openFile])

  // 保存文件
  const saveFile = useCallback(async () => {
    if (!openFile || !openFile.isModified) {
      return false
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const ext = openFile.path.toLowerCase().split('.').pop()
      
      if (ext === 'docx' || ext === 'doc') {
        // 将HTML内容保存为DOCX格式
        await (window as any).electronAPI.saveHtmlAsDocx(openFile.path, openFile.htmlContent)
      } else {
        // 将HTML转换为纯文本并保存
        const textContent = htmlToText(openFile.htmlContent)
        await (window as any).electronAPI.writeFile(openFile.path, textContent)
      }
      
      // 更新状态，标记为未修改
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

  // 关闭文件
  const closeFile = useCallback(() => {
    if (openFile?.isModified) {
      if (!confirm('文件已修改但未保存，确定要关闭吗？')) {
        return false
      }
    }
    
    setOpenFile(null)
    setError(null)
    return true
  }, [openFile])

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
    openFileForEdit,
    updateContent,
    saveFile,
    closeFile,
    isSupportedFile
  }
}