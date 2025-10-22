/**
 * 文件内容查看器 - 重构版
 * 
 * 根据文件类型自动选择合适的展示方式
 * 使用新的联合类型定义
 */

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
  
  // 根据文件类型渲染不同的查看器
  switch (fileContent.type) {
    case 'document':
    case 'text':
      // 文档和文本类型：使用编辑器
      return (
        <div className="h-full p-4 overflow-hidden">
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
