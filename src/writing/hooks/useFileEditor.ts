// 文件编辑器状态管理 Hook

import { useState, useCallback } from 'react'
import { readFileByFormat, writeFileByFormat } from '../utils/file-handlers'

export interface OpenFile {
  path: string
  name: string
  content: string
  originalContent: string
  format: 'txt' | 'docx' | 'md'
  isModified: boolean
}

export function useFileEditor() {
  const [openFile, setOpenFile] = useState<OpenFile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取文件格式
  const getFileFormat = (filePath: string): 'txt' | 'docx' | 'md' => {
    const ext = filePath.toLowerCase().split('.').pop()
    if (ext === 'docx' || ext === 'doc') return 'docx'
    if (ext === 'md') return 'md'
    return 'txt'
  }

  // 打开文件
  const openFileForEdit = useCallback(async (filePath: string, fileName: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const format = getFileFormat(filePath)
      const content = await readFileByFormat(filePath, format)
      
      setOpenFile({
        path: filePath,
        name: fileName,
        content,
        originalContent: content,
        format,
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
  const updateContent = useCallback((newContent: string) => {
    if (!openFile) return
    
    setOpenFile({
      ...openFile,
      content: newContent,
      isModified: newContent !== openFile.originalContent
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
      await writeFileByFormat(openFile.path, openFile.content, openFile.format)
      
      // 更新状态，标记为未修改
      setOpenFile(prev => prev ? {
        ...prev,
        originalContent: prev.content,
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

  return {
    openFile,
    isLoading,
    error,
    openFileForEdit,
    updateContent,
    saveFile,
    closeFile
  }
}