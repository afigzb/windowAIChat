/**
 * 文件块组件 - 内联标签样式
 * 
 * 功能：
 * - 以小巧的标签形式显示文件
 * - 支持删除块
 * - 内联显示在文本中
 */

import { Icon } from '../../../components'

export interface FileBlockData {
  id: string
  filePath: string
  fileName: string
  content: string
  size: number
}

interface FileBlockProps {
  block: FileBlockData
  onRemove: (id: string) => void
}

export function FileBlock({
  block,
  onRemove
}: FileBlockProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <span
      contentEditable={false}
      className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 bg-blue-100 border border-blue-300 rounded text-blue-700 text-sm whitespace-nowrap hover:bg-blue-200 transition-colors cursor-default align-middle"
      title={`${block.filePath}\n${formatSize(block.size)}`}
    >
      <Icon name="file" className="w-3 h-3 flex-shrink-0" />
      <span className="font-medium max-w-[150px] truncate">
        {block.fileName}
      </span>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onRemove(block.id)
        }}
        className="ml-0.5 p-0.5 rounded hover:bg-blue-300 transition-colors"
        title="删除"
      >
        <Icon name="close" className="w-3 h-3" />
      </button>
    </span>
  )
}

