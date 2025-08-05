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
      <div className="flex-shrink-0">
        {type === 'directory' ? (
          <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21V6h2v13h17v2zm4-4V2h7l2 2h9v13zm2-2h14V6h-7.825l-2-2H7zm0 0V4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 22V2h10l6 6v6h-2V9h-5V4H6v16h9v2zm17.95.375L19 19.425v2.225h-2V16h5.65v2H20.4l2.95 2.95zM6 20V4z"/>
          </svg>
        )}
      </div>
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