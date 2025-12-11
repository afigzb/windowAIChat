/**
 * 文件内容查看器 - 重构版
 * 
 * 根据文件类型自动选择合适的展示方式
 * 使用新的联合类型定义
 */

import { useRef, useEffect } from 'react'
import { TiptapDocxEditor } from '../../md-html-dock/renderers/TiptapDocxEditor'
import { ImageViewer } from './ImageViewer'
import type { WordCountResult } from '../../md-html-dock/types'
import type { FileContent } from '../../types/file-api'

interface FileContentViewerProps {
  fileContent: FileContent
  isLoading?: boolean
  onContentChange?: (content: string) => void
  onWordCountChange?: (wordCount: WordCountResult) => void
}

/**
 * 文件内容查看器
 */
export function FileContentViewer({
  fileContent,
  isLoading = false,
  onContentChange,
  onWordCountChange
}: FileContentViewerProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null)

  // 处理编辑器内文本的拖拽
  useEffect(() => {
    const container = editorContainerRef.current
    if (!container || fileContent.type === 'image' || fileContent.type === 'unsupported') return

    const handleDragStart = (e: DragEvent) => {
      const selection = window.getSelection()
      const selectedText = selection?.toString().trim()
      
      if (selectedText && selectedText.length > 0) {
        // 设置拖拽数据
        e.dataTransfer!.effectAllowed = 'copy'
        e.dataTransfer!.setData('application/text-block', 'true')
        e.dataTransfer!.setData('application/text-content', selectedText)
        e.dataTransfer!.setData('application/source-file', fileContent.path)
        e.dataTransfer!.setData('application/source-name', fileContent.name)
      }
    }

    container.addEventListener('dragstart', handleDragStart)
    
    return () => {
      container.removeEventListener('dragstart', handleDragStart)
    }
  }, [fileContent.type, fileContent.path, fileContent.name])
  
  // 根据文件类型渲染不同的查看器
  switch (fileContent.type) {
    case 'document':
    case 'text':
      // 文档和文本类型：使用编辑器
      return (
        <div ref={editorContainerRef} className="h-full p-4 overflow-hidden">
          <TiptapDocxEditor
            key={fileContent.path}
            content={fileContent.htmlContent || ''}
            onChange={onContentChange || (() => {})}
            onWordCountChange={onWordCountChange}
            placeholder="开始编辑您的文档..."
            readOnly={isLoading}
          />
        </div>
      )

    case 'image':
      // 图片类型：使用图片查看器
      return (
        <ImageViewer
          imagePath={fileContent.path}
          fileName={fileContent.name}
          imageData={fileContent.imageData}
        />
      )

    case 'excel':
      // Excel类型：只读，提示用户双击打开
      return (
        <div className="h-full flex items-center justify-center text-slate-500">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-lg font-medium mb-2">Excel 表格文件</p>
            <p className="text-sm text-slate-400 mb-4">{fileContent.name}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-600 mb-2">
                💡 Excel文件不支持在线编辑
              </p>
              <p className="text-sm text-slate-600">
                双击文件可以用系统默认程序打开编辑
              </p>
            </div>
            <div className="text-xs text-slate-400">
              <p>✓ 勾选文件后，文本内容会自动发送给AI</p>
              <p className="mt-1">✓ 支持格式：.xlsx, .xls, .xlsm, .xlsb</p>
            </div>
          </div>
        </div>
      )

    case 'unsupported':
      // 不支持的文件类型
      return (
        <div className="h-full flex items-center justify-center text-slate-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📄</div>
            <p className="text-sm">不支持预览此文件类型</p>
            <p className="text-xs text-slate-400 mt-2">{fileContent.name}</p>
            {fileContent.reason && (
              <p className="text-xs text-red-400 mt-1">{fileContent.reason}</p>
            )}
          </div>
        </div>
      )
  }
}
