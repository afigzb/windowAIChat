// 内联编辑组件

import { useState, useEffect, useRef } from 'react'

interface InlineEditProps {
  type: 'file' | 'directory'
  level: number
  defaultValue?: string
  onConfirm: (name: string) => void
  onCancel: () => void
}

export function InlineEdit({ 
  type, 
  level, 
  defaultValue = '',
  onConfirm, 
  onCancel 
}: InlineEditProps) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(defaultValue)
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [defaultValue])

  const handleSubmit = () => {
    if (value.trim()) {
      onConfirm(value.trim())
    } else {
      onCancel()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const handleBlur = () => {
    setTimeout(() => handleSubmit(), 150)
  }

  return (
    <div 
      className="flex items-center gap-1 py-1 px-1"
      style={{ marginLeft: level * 16 }}
    >
      <span className="text-xs">
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