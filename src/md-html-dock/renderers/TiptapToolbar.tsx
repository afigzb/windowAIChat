import React from 'react'
import { Editor } from '@tiptap/react'

interface TiptapToolbarProps {
  editor: Editor | null
}

/**
 * Tiptap 工具栏组件
 * 提供文档编辑的核心格式化功能
 */
export const TiptapToolbar: React.FC<TiptapToolbarProps> = ({ editor }) => {
  if (!editor) return null

  const getCurrentStyle = () => {
    if (editor.isActive('heading', { level: 1 })) return 'h1'
    if (editor.isActive('heading', { level: 2 })) return 'h2'
    if (editor.isActive('heading', { level: 3 })) return 'h3'
    return 'p'
  }

  const setStyle = (style: string) => {
    if (style === 'p') {
      editor.chain().focus().setParagraph().run()
    } else {
      const level = parseInt(style.charAt(1)) as 1 | 2 | 3
      editor.chain().focus().toggleHeading({ level }).run()
    }
  }

  return (
    <div className="tiptap-toolbar">
      <select
        value={getCurrentStyle()}
        onChange={(e) => setStyle(e.target.value)}
        className="tiptap-toolbar-select"
        title="段落样式"
      >
        <option value="p">正文</option>
        <option value="h1">标题 1</option>
        <option value="h2">标题 2</option>
        <option value="h3">标题 3</option>
      </select>

      <div className="tiptap-toolbar-divider" />

      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`tiptap-toolbar-button ${editor.isActive('bold') ? 'active' : ''}`}
        title="粗体 (Ctrl+B)"
      >
        <strong>B</strong>
      </button>

      <div className="tiptap-toolbar-divider" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`tiptap-toolbar-button ${editor.isActive('bulletList') ? 'active' : ''}`}
        title="无序列表"
      >
        • 列表
      </button>

      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`tiptap-toolbar-button ${editor.isActive('orderedList') ? 'active' : ''}`}
        title="有序列表"
      >
        1. 列表
      </button>

      <div className="tiptap-toolbar-divider" />

      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="tiptap-toolbar-button"
        title="撤销 (Ctrl+Z)"
      >
        ↶ 撤销
      </button>

      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="tiptap-toolbar-button"
        title="重做 (Ctrl+Y)"
      >
        ↷ 重做
      </button>

      <div className="tiptap-toolbar-divider" />

      <button
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        className="tiptap-toolbar-button"
        title="清除格式"
      >
        清除
      </button>
    </div>
  )
}

export default TiptapToolbar
