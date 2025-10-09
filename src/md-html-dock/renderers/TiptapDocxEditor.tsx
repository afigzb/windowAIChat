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
 * Tiptap DOCX 编辑器
 * 专为文档编辑设计，支持标题、粗体、列表等基本格式
 */
export const TiptapDocxEditor: React.FC<TiptapDocxEditorProps> = ({
  content,
  onChange,
  onWordCountChange,
  placeholder = '在这里开始编辑文档...',
  readOnly = false
}) => {
  const isInitializing = useRef(true)
  
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
    onCreate: ({ editor }) => {
      // 首次创建时，返回标准化后的 HTML
      // 这样可以避免 Tiptap 标准化导致的"未保存"问题
      const normalizedHtml = editor.getHTML()
      onChange(normalizedHtml)
      
      if (onWordCountChange) {
        onWordCountChange(countWords(normalizedHtml))
      }
      
      // 标记初始化完成
      isInitializing.current = false
    },
    onUpdate: ({ editor }) => {
      // 只有在初始化完成后才触发更新
      if (!isInitializing.current) {
        const html = editor.getHTML()
        onChange(html)
        
        if (onWordCountChange) {
          onWordCountChange(countWords(html))
        }
      }
    },
    editorProps: {
      attributes: {
        'data-placeholder': placeholder
      }
    }
  })

  // 移除这个 useEffect，让 key 的变化来触发编辑器重新创建
  // 这样可以避免内容切换时的闪烁
  // useEffect(() => {
  //   if (editor && content !== editor.getHTML()) {
  //     isInitializing.current = true
  //     editor.commands.setContent(content)
  //     
  //     // 内容设置后，再次返回标准化的 HTML
  //     setTimeout(() => {
  //       const normalizedHtml = editor.getHTML()
  //       onChange(normalizedHtml)
  //       isInitializing.current = false
  //     }, 0)
  //   }
  // }, [content, editor, onChange])

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly)
    }
  }, [readOnly, editor])

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
