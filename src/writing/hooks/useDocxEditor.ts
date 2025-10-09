// DOCX文件编辑器状态管理 Hook

import { useState, useCallback } from 'react'
import type { WordCountResult } from '../../md-html-dock/types'
import { detectFileType, getSupportedFormats } from '../../md-html-dock/utils/fileTypeDetector'
import { useConfirm } from './useConfirm'
import { fileContentCache } from '../utils/fileContentCache'

export interface DocxFile {
  path: string
  name: string
  htmlContent: string
  originalHtmlContent: string
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

    if (openFile && openFile.isModified) {
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
      } else if (fileTypeInfo.readMethod === 'image') {
        // 图片文件在编辑器中显示为预览
        const imageData = await (window as any).electronAPI.readImageAsBase64(filePath)
        const sizeKB = Math.round(imageData.size / 1024)
        
        htmlContent = `
          <div style="text-align: center; padding: 20px;">
            <h3>图片预览 - ${fileName}</h3>
            <p style="color: #666; font-size: 0.9em; margin: 10px 0;">
              ${imageData.mimeType} | ${sizeKB} KB | 点击图片查看原始尺寸
            </p>
            <div style="margin: 20px 0;">
              <img 
                src="${imageData.dataUrl}" 
                alt="${fileName}"
                style="
                  max-width: 100%; 
                  max-height: 500px; 
                  height: auto; 
                  cursor: zoom-in;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  transition: transform 0.2s ease;
                "
                onclick="
                  if (this.style.maxHeight === 'none') {
                    this.style.maxHeight = '500px';
                    this.style.cursor = 'zoom-in';
                    this.style.transform = 'none';
                  } else {
                    this.style.maxHeight = 'none';
                    this.style.cursor = 'zoom-out';
                    this.style.transform = 'scale(1)';
                  }
                "
                onmouseover="if (this.style.maxHeight !== 'none') this.style.transform = 'scale(1.02)'"
                onmouseout="if (this.style.maxHeight !== 'none') this.style.transform = 'none'"
              />
            </div>
            <p style="color: #999; font-size: 0.8em; margin: 10px 0;">
              💡 提示：点击图片可以在预览模式和原始尺寸之间切换
            </p>
          </div>
        `
      } else {
        throw new Error(fileTypeInfo.reason || '不支持的文件格式')
      }
      
      setOpenFile({
        path: filePath,
        name: fileName,
        htmlContent,
        originalHtmlContent: htmlContent,
        isModified: false
      })
      
      // 重置首次更新标志
      setIsFirstUpdate(true)
    } catch (err) {
      setError(`打开文件失败: ${err}`)
      console.error('打开文件失败:', err)
    } finally {
      setIsLoading(false)
    }
  }, [openFile, saveCurrentFile, confirm])

  const updateContent = useCallback((newHtmlContent: string) => {
    if (!openFile) return
    
    // 首次更新是编辑器标准化后的 HTML，用它作为原始内容基准
    if (isFirstUpdate) {
      setOpenFile({
        ...openFile,
        htmlContent: newHtmlContent,
        originalHtmlContent: newHtmlContent,
        isModified: false
      })
      setIsFirstUpdate(false)
    } else {
      setOpenFile({
        ...openFile,
        htmlContent: newHtmlContent,
        isModified: newHtmlContent !== openFile.originalHtmlContent
      })
    }
  }, [openFile, isFirstUpdate])

  const saveFile = saveCurrentFile

  const closeFile = useCallback(async () => {
    if (openFile?.isModified) {
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
    isSupportedFile,
    confirmProps // 暴露确认对话框属性
  }
}