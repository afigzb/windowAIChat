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

  return (
    <div className="tiptap-toolbar">
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
