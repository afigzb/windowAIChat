// 写作区域组件

import { useState, useEffect } from 'react'
import { useDebouncedCallback } from '../hooks/useDebounce'

interface WritingAreaProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  readOnly?: boolean
}

export function WritingArea({ 
  content, 
  onChange, 
  placeholder = "在这里开始您的创作...",
  readOnly = false 
}: WritingAreaProps) {
  // 本地状态管理当前编辑的内容，避免每次输入都触发父组件重新渲染
  const [localContent, setLocalContent] = useState(content)
  
  // 防抖的onChange回调，延迟500ms更新父组件状态
  const debouncedOnChange = useDebouncedCallback(onChange, 500)
  
  // 当外部content变化时（如文件切换），同步到本地状态
  useEffect(() => {
    setLocalContent(content)
  }, [content])
  
  // 处理文本输入
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    
    // 立即更新本地状态，保证输入的实时性
    setLocalContent(newContent)
    
    // 防抖调用父组件的onChange，减少重新渲染
    debouncedOnChange(newContent)
  }
  
  return (
    <div className="h-full w-full flex flex-col">
      <textarea 
        value={localContent}
        onChange={handleChange}
        readOnly={readOnly}
        className="flex-1 w-full p-4 border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-slate-300 overflow-y-auto"
        placeholder={placeholder}
        style={{ 
          fontFamily: 'system-ui, -apple-system, sans-serif', 
          lineHeight: '1.8',
          minHeight: '200px'
        }}
        spellCheck={false}
      />
    </div>
  )
}