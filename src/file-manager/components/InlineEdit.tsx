// 内联编辑组件

import { useState, useEffect, useRef } from 'react'
import { Icon } from '../../components'

interface InlineEditProps {
  type: 'file' | 'directory'
  level: number
  defaultValue?: string
  selectStart?: number
  selectEnd?: number
  onConfirm: (name: string) => void
  onCancel: () => void
}

export function InlineEdit({ 
  type, 
  level, 
  defaultValue = '',
  selectStart,
  selectEnd,
  onConfirm, 
  onCancel 
}: InlineEditProps) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  // 组件挂载时聚焦并选择指定范围
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      
      // 如果指定了选择范围，使用setSelectionRange；否则全选
      if (selectStart !== undefined && selectEnd !== undefined) {
        inputRef.current.setSelectionRange(selectStart, selectEnd)
      } else {
        inputRef.current.select()
      }
    }
  }, [selectStart, selectEnd])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.stopPropagation() // 防止事件冒泡
      if (value.trim()) {
        onConfirm(value.trim())
      } else {
        onCancel()
      }
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      onCancel()
    }
  }

  const handleBlur = () => {
    if (value.trim()) {
      onConfirm(value.trim())
    } else {
      onCancel()
    }
  }

  return (
    <div 
      className="flex items-center gap-2 py-2 px-3"
      style={{ marginLeft: level * 20 }}
    >
      <div className="flex-shrink-0">
        {type === 'directory' ? (
          <Icon name="folder" className="w-5 h-5 text-blue-600" />
        ) : (
          <Icon name="file" className="w-5 h-5 text-gray-600" />
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={(e) => e.stopPropagation()}
        placeholder={type === 'directory' ? '文件夹名称' : '文件名称'}
        className="flex-1 min-w-0 text-sm px-1.5 py-0.5 border border-blue-500 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
        spellCheck={false}
      />
    </div>
  )
}
