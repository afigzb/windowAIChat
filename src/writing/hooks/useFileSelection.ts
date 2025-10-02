import { useState, useCallback } from 'react'
import { readFileContent, extractTextFromHTML, formatFileContent } from '../../md-html-dock/utils/fileContentReader'
import { detectFileType } from '../../md-html-dock/utils/fileTypeDetector'

interface OpenFile {
  path: string
  htmlContent?: string
}

export function useFileSelection(openFile: OpenFile | null) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map())
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set())

  const handleFileSelect = useCallback((filePath: string, selected: boolean) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(filePath)
      } else {
        newSet.delete(filePath)
        setFileContents(prevContents => {
          const newContents = new Map(prevContents)
          newContents.delete(filePath)
          return newContents
        })
      }
      return newSet
    })
  }, [])

  const handleClearSelectedFiles = useCallback(() => {
    setSelectedFiles(new Set())
    setFileContents(new Map())
  }, [])

  const getAdditionalContent = async (): Promise<string> => {
    if (selectedFiles.size === 0) return ''
    try {
      const filePaths = Array.from(selectedFiles)
      const needsLoading = filePaths.filter(path => !fileContents.has(path))
      if (needsLoading.length > 0) {
        setLoadingFiles(new Set(needsLoading))
      }
      try {
        const parts: string[] = []
        for (const filePath of filePaths) {
          try {
            if (openFile && openFile.path === filePath) {
              const typeInfo = detectFileType(filePath)
              if (typeInfo.readMethod === 'image') {
                const content = await readFileContent(filePath, false)
                parts.push(formatFileContent(filePath, content))
                setFileContents(prev => {
                  const newContents = new Map(prev)
                  newContents.set(filePath, content)
                  return newContents
                })
              } else {
                const text = extractTextFromHTML(openFile.htmlContent || '')
                parts.push(formatFileContent(filePath, text))
                setFileContents(prev => {
                  const newContents = new Map(prev)
                  newContents.set(filePath, text)
                  return newContents
                })
              }
            } else {
              const content = await readFileContent(filePath, false)
              parts.push(formatFileContent(filePath, content))
              setFileContents(prev => {
                const newContents = new Map(prev)
                newContents.set(filePath, content)
                return newContents
              })
            }
          } catch (error) {
            console.error(`读取文件失败: ${filePath}`, error)
          } finally {
            setLoadingFiles(prev => {
              const newSet = new Set(prev)
              newSet.delete(filePath)
              return newSet
            })
          }
        }
        return parts.join('')
      } finally {
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

