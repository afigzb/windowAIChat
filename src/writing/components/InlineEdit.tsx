// 内联编辑组件

import { useState, useEffect, useRef } from 'react'

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
      if (value.trim()) {
        onConfirm(value.trim())
      } else {
        onCancel()
      }
    } else if (e.key === 'Escape') {
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
      className="flex items-center gap-1 py-1 px-1"
      style={{ marginLeft: level * 16 }}
    >
      <span>
        {type === 'directory' ? '📁' : '📄'}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={type === 'directory' ? '文件夹名称' : '文件名称'}
        className="flex-1 text-sm px-1 py-0 border border-gray-300 rounded text-black bg-white focus:outline-none focus:border-blue-500"
      />
    </div>
  )
}