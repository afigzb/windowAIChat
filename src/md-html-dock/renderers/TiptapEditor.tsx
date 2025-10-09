import React, { useEffect, useCallback } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { CharacterCount } from '@tiptap/extension-character-count'
import { countWords } from '../utils/wordCount'
import type { WordCountResult } from '../types'

interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  onWordCountChange?: (wordCount: WordCountResult) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
  onWordCountChange,
  placeholder = '在这里开始编辑文档...',
  readOnly = false,
  className = ''
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        }
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline cursor-pointer'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-sm'
        }
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full border border-gray-300'
        }
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'border-b border-gray-300'
        }
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 px-4 py-2 text-left font-semibold border border-gray-300'
        }
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'px-4 py-2 border border-gray-300'
        }
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true
      }),
      CharacterCount
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
      
      if (onWordCountChange) {
        const wordCount = countWords(html)
        onWordCountChange(wordCount)
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none p-6',
        'data-placeholder': placeholder
      }
    }
  })

  // 当外部 content 变化时更新编辑器内容
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // 计算初始字数
  useEffect(() => {
    if (onWordCountChange && content) {
      const wordCount = countWords(content)
      onWordCountChange(wordCount)
    }
  }, [content, onWordCountChange])

  // 更新只读状态
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly)
    }
  }, [readOnly, editor])

  if (!editor) {
    return null
  }

  return (
    <div className={`tiptap-editor-wrapper ${className}`}>
      <EditorContent editor={editor} />
    </div>
  )
}

export default TiptapEditor

