// DOCX格式的富文本编辑器组件

import { useState, useEffect, useRef, useCallback } from 'react'
import { countWords } from '../../md-html-dock/utils/wordCount'
import type { WordCountResult } from '../../md-html-dock/types'

interface DocxEditorProps {
  content: string // HTML内容
  onChange: (content: string) => void
  onWordCountChange?: (wordCount: WordCountResult) => void
  placeholder?: string
  readOnly?: boolean
}

export function DocxEditor({ 
  content, 
  onChange, 
  onWordCountChange,
  placeholder = "在这里开始编辑DOCX文档...",
  readOnly = false 
}: DocxEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // 初始化编辑器内容
  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = content || ''
      setIsInitialized(true)
    }
  }, [content, isInitialized])

  // 处理内容变化
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML
      onChange(newContent)
      
      // 计算字数统计
      if (onWordCountChange) {
        const wordCount = countWords(newContent)
        onWordCountChange(wordCount)
      }
    }
  }, [onChange, onWordCountChange])

  // 当内容从外部更新时也要计算字数
  useEffect(() => {
    if (onWordCountChange && content) {
      const wordCount = countWords(content)
      onWordCountChange(wordCount)
    }
  }, [content, onWordCountChange])

  // 处理粘贴事件
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    // 允许正常的粘贴行为，包括富文本
    // 不做特殊处理
  }, [])

  // 右键菜单由Electron层自动处理，无需额外处理

  return (
    <div className="h-full w-full flex flex-col border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* 编辑区域 */}
      <div 
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleInput}
        onPaste={handlePaste}

        className="flex-1 p-6 overflow-y-auto focus:outline-none content-theme bg-white rounded-xl"
        style={{ 
          fontFamily: 'system-ui, -apple-system, sans-serif', 
          fontSize: '16px',
          lineHeight: '1.8',
          minHeight: '320px'
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
      
      {/* 占位符样式 */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          font-style: italic;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}