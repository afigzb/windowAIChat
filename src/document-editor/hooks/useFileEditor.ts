/**
 * 文件编辑器状态管理 Hook - 重构版
 * 
 * 架构说明：
 * 1. 后端负责文件IO和格式转换
 * 2. 前端负责编辑器交互和状态管理
 * 3. 移除isFirstUpdate补丁，使用内容哈希判断修改状态
 */

import { useState, useCallback, useRef } from 'react'
import type { WordCountResult } from '../../md-html-dock/types'
import { useConfirm } from '../../components/useConfirm'
import { fileContentCache } from '../../storage/fileContentCache'
import type { FileContent } from '../../types/file-api'

export function useFileEditor() {
  const [openFile, setOpenFile] = useState<FileContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState<WordCountResult>({
    characters: 0,
    words: 0
  })
  
  // 保存原始内容，用于判断是否修改（直接字符串对比，不计算hash）
  const originalContentRef = useRef<string>('')
  
  const { confirm, confirmProps } = useConfirm()

  /**
   * 打开文件
   */
  const openFileForEdit = useCallback(async (filePath: string, fileName: string) => {
    // 避免重复打开
    if (openFile && openFile.path === filePath) {
      return
    }

    // 处理未保存的文件
    if (openFile && openFile.type !== 'unsupported' && 'isModified' in openFile && openFile.isModified) {
      // 在弹窗前重新比对内容，避免不必要的弹窗（用户可能撤销了所有修改）
      const actuallyModified = openFile.htmlContent !== originalContentRef.current
      
      if (actuallyModified) {
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
    }

    setError(null)
    setIsLoading(true)
    
    try {
      const result = await window.electronAPI.readFileAuto(filePath)
      
      if (!result.success) {
        setError(result.error || '读取文件失败')
        setOpenFile({
          type: 'unsupported',
          path: filePath,
          name: fileName,
          reason: result.error
        })
        return
      }

      if (result.type === 'document' || result.type === 'text') {
        const htmlContent = result.content as string
        
        // 清空原始内容，等待编辑器标准化后第一次updateContent时记录
        originalContentRef.current = ''
        
        setOpenFile({
          type: result.type,
          path: filePath,
          name: fileName,
          htmlContent,
          isModified: false
        })
        
      } else if (result.type === 'image') {
        const imageData = result.content as any
        setOpenFile({
          type: 'image',
          path: filePath,
          name: fileName,
          imageData
        })
        
      } else {
        setOpenFile({
          type: 'unsupported',
          path: filePath,
          name: fileName
        })
      }
      
    } catch (err) {
      setError(`打开文件失败: ${err}`)
      console.error('打开文件失败:', err)
    } finally {
      setIsLoading(false)
    }
  }, [openFile, confirm])

  /**
   * 更新文档内容
   * 优化策略：
   * 1. 第一次调用时记录编辑器标准化后的内容作为基准
   * 2. 每次更新时检查是否回到原始状态（支持撤销操作）
   * 3. 使用编辑器防抖（150ms）避免频繁调用此函数
   */
  const updateContent = useCallback((newHtmlContent: string) => {
    if (!openFile || (openFile.type !== 'document' && openFile.type !== 'text')) return
    
    // 第一次调用：记录编辑器标准化后的内容作为基准
    if (originalContentRef.current === '') {
      originalContentRef.current = newHtmlContent
      setOpenFile({
        ...openFile,
        htmlContent: newHtmlContent,
        isModified: false
      })
      return
    }
    
    // 实时检测修改状态（支持撤销回到原始状态）
    // 由于编辑器已有150ms防抖，这里的比较不会造成性能问题
    const isModified = newHtmlContent !== originalContentRef.current
    
    setOpenFile(prev => {
      if (!prev || (prev.type !== 'document' && prev.type !== 'text')) return prev
      
      // 内容和状态都没变化，不更新
      if (prev.htmlContent === newHtmlContent && prev.isModified === isModified) {
        return prev
      }
      
      return {
        ...prev,
        htmlContent: newHtmlContent,
        isModified
      }
    })
  }, [openFile])

  /**
   * 保存文件
   */
  const saveFile = useCallback(async (): Promise<boolean> => {
    if (!openFile || (openFile.type !== 'document' && openFile.type !== 'text') || !openFile.isModified) {
      return true
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.saveFileAuto(
        openFile.path, 
        openFile.htmlContent
      )
      
      if (!result.success) {
        setError(result.error || '保存文件失败')
        return false
      }
      
      // 保存成功后，更新原始内容
      originalContentRef.current = openFile.htmlContent
      
      setOpenFile({
        ...openFile,
        isModified: false
      })

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
    if (openFile && openFile.type !== 'unsupported' && 'isModified' in openFile && openFile.isModified) {
      // 在弹窗前重新比对内容，避免不必要的弹窗（用户可能撤销了所有修改）
      const actuallyModified = openFile.htmlContent !== originalContentRef.current
      
      if (actuallyModified) {
        const shouldClose = await confirm({
          title: '关闭文件',
          message: '文件已修改但未保存，确定要关闭吗？',
          confirmText: '确认',
          cancelText: '取消',
          type: 'warning'
        })
        if (!shouldClose) return false
      }
    }
    
    setOpenFile(null)
    setError(null)
    setWordCount({ characters: 0, words: 0 })
    originalContentRef.current = ''
    return true
  }, [openFile, confirm])

  /**
   * 更新字数统计
   */
  const updateWordCount = useCallback((newWordCount: WordCountResult) => {
    setWordCount(newWordCount)
  }, [])

  /**
   * 检查文件是否支持
   */
  const isSupportedFile = useCallback(async (filePath: string): Promise<{ isSupported: boolean; reason?: string }> => {
    try {
      const fileInfo = await window.electronAPI.getFileFormatInfo(filePath)
      return {
        isSupported: fileInfo.supported,
        reason: fileInfo.supported ? undefined : `不支持的文件格式: .${fileInfo.extension}`
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
