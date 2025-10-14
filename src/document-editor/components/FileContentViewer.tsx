// 统一的文件内容展示/编辑组件
// 根据文件类型自动选择合适的查看器或编辑器

import { DocxEditor } from './DocxEditor'
import { ImageViewer } from './ImageViewer'
import type { WordCountResult } from '../../md-html-dock/types'

/**
 * 文件类型定义
 */
export type FileType = 'document' | 'image' | 'unsupported'

/**
 * 图片数据
 */
export interface ImageData {
  dataUrl: string
  mimeType: string
  size: number
}

/**
 * 文件内容数据
 */
export interface FileContent {
  type: FileType
  path: string
  name: string
  // 文档类型字段
  htmlContent?: string
  isModified?: boolean
  // 图片类型字段
  imageData?: ImageData
}

interface FileContentViewerProps {
  fileContent: FileContent
  isLoading?: boolean
  // 文档编辑器回调
  onContentChange?: (content: string) => void
  onWordCountChange?: (wordCount: WordCountResult) => void
}

/**
 * 文件内容查看器
 * 根据文件类型自动选择合适的展示方式
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
      // 文档类型：使用富文本编辑器
      return (
        <div className="h-full p-4 overflow-hidden">
          <DocxEditor
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
      if (!fileContent.imageData) {
        return (
          <div className="h-full flex items-center justify-center text-red-500">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <p>图片数据加载失败</p>
            </div>
          </div>
        )
      }
      return (
        <ImageViewer
          imagePath={fileContent.path}
          fileName={fileContent.name}
          imageData={fileContent.imageData}
        />
      )

    case 'unsupported':
    default:
      // 不支持的文件类型
      return (
        <div className="h-full flex items-center justify-center text-slate-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📄</div>
            <p className="text-sm">不支持预览此文件类型</p>
            <p className="text-xs text-slate-400 mt-2">{fileContent.name}</p>
          </div>
        </div>
      )
  }
}

