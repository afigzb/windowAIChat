// 图片查看器组件
import { useState } from 'react'

interface ImageViewerProps {
  imagePath: string
  fileName: string
  imageData: {
    dataUrl: string
    mimeType: string
    size: number
  }
}

/**
 * 图片查看器组件
 * 显示图片预览，支持缩放查看原始尺寸
 */
export function ImageViewer({ fileName, imageData }: ImageViewerProps) {
  const [isFullSize, setIsFullSize] = useState(false)
  const sizeKB = Math.round(imageData.size / 1024)
  const sizeMB = (imageData.size / (1024 * 1024)).toFixed(2)
  
  const displaySize = imageData.size >= 1024 * 1024 
    ? `${sizeMB} MB` 
    : `${sizeKB} KB`

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 头部信息 */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{fileName}</h3>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
            {imageData.mimeType}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
            {displaySize}
          </span>
        </div>
      </div>

      {/* 图片显示区域 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-center min-h-full">
          <div className="relative">
            <img
              src={imageData.dataUrl}
              alt={fileName}
              className={`
                transition-all duration-300 ease-in-out
                border border-gray-300 rounded-lg shadow-lg
                ${isFullSize 
                  ? 'cursor-zoom-out' 
                  : 'cursor-zoom-in max-w-full max-h-[calc(100vh-200px)] hover:scale-[1.02]'
                }
              `}
              style={isFullSize ? { maxWidth: 'none', maxHeight: 'none' } : {}}
              onClick={() => setIsFullSize(!isFullSize)}
              title={isFullSize ? '点击缩小' : '点击查看原始尺寸'}
            />
          </div>
        </div>
      </div>

      {/* 底部提示 */}
      <div className="px-6 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {isFullSize 
              ? '点击图片可缩小到适应窗口大小' 
              : '点击图片可查看原始尺寸'
            }
          </span>
        </div>
      </div>
    </div>
  )
}

