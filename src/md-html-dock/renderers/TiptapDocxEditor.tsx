/**
 * Tiptap编辑器 - 重构版
 * 
 * 架构说明：
 * 1. 编辑器标准化是正常行为，直接触发onChange
 * 2. 父组件通过内容哈希判断修改状态，不需要特殊处理首次加载
 * 3. 移除isInitializing补丁逻辑
 * 4. 使用防抖优化onChange调用，避免卡顿
 */

import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TiptapToolbar } from './TiptapToolbar'
import { countWords } from '../utils/wordCount'
import type { WordCountResult } from '../types'
import '../styles/tiptap.css'

interface TiptapDocxEditorProps {
  content: string
  onChange: (content: string) => void
  onWordCountChange?: (wordCount: WordCountResult) => void
  placeholder?: string
  readOnly?: boolean
}

/**
 * Tiptap 编辑器
 * 支持文档和文本编辑
 */
export const TiptapDocxEditor: React.FC<TiptapDocxEditorProps> = ({
  content,
  onChange,
  onWordCountChange,
  placeholder = '在这里开始编辑...',
  readOnly = false
}) => {
  // 防抖定时器
  const onChangeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const wordCountTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false
      })
    ],
    content,
    editable: !readOnly,
    onCreate: async ({ editor }) => {
      // 编辑器初始化完成，获取标准化后的HTML
      // 立即触发，不防抖
      const html = editor.getHTML()
      onChange(html)
      
      if (onWordCountChange) {
        const wordCount = await countWords(html)
        onWordCountChange(wordCount)
      }
    },
    onUpdate: ({ editor }) => {
      // 性能优化：使用防抖减少onChange调用频率
      const html = editor.getHTML()
      
      // onChange防抖：150ms（快速响应，但避免每次按键都触发）
      if (onChangeTimerRef.current) {
        clearTimeout(onChangeTimerRef.current)
      }
      onChangeTimerRef.current = setTimeout(() => {
        onChange(html)
      }, 150)
      
      // 字数统计防抖：500ms（不需要太频繁更新）
      if (onWordCountChange) {
        if (wordCountTimerRef.current) {
          clearTimeout(wordCountTimerRef.current)
        }
        wordCountTimerRef.current = setTimeout(async () => {
          const wordCount = await countWords(html)
          onWordCountChange(wordCount)
        }, 500)
      }
    },
    editorProps: {
      attributes: {
        'data-placeholder': placeholder
      }
    }
  })

  // 更新只读状态
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly)
    }
  }, [readOnly, editor])

  // 当content从外部改变时，更新编辑器内容
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (onChangeTimerRef.current) {
        clearTimeout(onChangeTimerRef.current)
      }
      if (wordCountTimerRef.current) {
        clearTimeout(wordCountTimerRef.current)
      }
    }
  }, [])

  if (!editor) {
    return <div className="tiptap-loading">加载编辑器...</div>
  }

  return (
    <div className="tiptap-docx-editor">
      {!readOnly && <TiptapToolbar editor={editor} />}
      <div className="tiptap-editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default TiptapDocxEditor
