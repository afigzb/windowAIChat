// DOCX格式的富文本编辑器组件

import { useState, useEffect, useRef, useCallback } from 'react'

interface DocxEditorProps {
  content: string // HTML内容
  onChange: (content: string) => void
  placeholder?: string
  readOnly?: boolean
}

export function DocxEditor({ 
  content, 
  onChange, 
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
    }
  }, [onChange])

  // 处理粘贴事件，清理格式
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  // 工具栏按钮处理
  const formatText = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      editorRef.current.focus()
      handleInput()
    }
  }, [handleInput])

  return (
    <div className="h-full w-full flex flex-col border border-slate-200 rounded-lg">
      {/* 工具栏 */}
      {!readOnly && (
        <div className="flex items-center gap-2 p-3 border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => formatText('bold')}
            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100 font-bold"
            title="粗体"
          >
            B
          </button>
          <button
            onClick={() => formatText('italic')}
            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100 italic"
            title="斜体"
          >
            I
          </button>
          <button
            onClick={() => formatText('underline')}
            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100 underline"
            title="下划线"
          >
            U
          </button>
          <div className="w-px h-4 bg-slate-300 mx-2"></div>
          <button
            onClick={() => formatText('insertUnorderedList')}
            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100"
            title="无序列表"
          >
            • 列表
          </button>
          <button
            onClick={() => formatText('insertOrderedList')}
            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100"
            title="有序列表"
          >
            1. 列表
          </button>
          <div className="w-px h-4 bg-slate-300 mx-2"></div>
          <select
            onChange={(e) => formatText('formatBlock', e.target.value)}
            className="px-2 py-1 text-sm border border-slate-300 rounded"
            defaultValue=""
          >
            <option value="">格式</option>
            <option value="p">正文</option>
            <option value="h1">标题 1</option>
            <option value="h2">标题 2</option>
            <option value="h3">标题 3</option>
          </select>
        </div>
      )}
      
      {/* 编辑区域 */}
      <div 
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleInput}
        onPaste={handlePaste}
        className="flex-1 p-4 overflow-y-auto focus:outline-none"
        style={{ 
          fontFamily: 'system-ui, -apple-system, sans-serif', 
          lineHeight: '1.6',
          minHeight: '300px'
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
      
      {/* 占位符样式 */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}