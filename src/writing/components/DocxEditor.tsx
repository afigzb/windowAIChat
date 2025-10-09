// DOCX格式的富文本编辑器组件
// 使用 Tiptap 实现的高级富文本编辑器

import { TiptapDocxEditor } from '../../md-html-dock/renderers/TiptapDocxEditor'
import type { WordCountResult } from '../../md-html-dock/types'

interface DocxEditorProps {
  content: string // HTML内容
  onChange: (content: string) => void
  onWordCountChange?: (wordCount: WordCountResult) => void
  placeholder?: string
  readOnly?: boolean
}

/**
 * DOCX 编辑器组件
 * 基于 Tiptap 的强大富文本编辑器
 * 支持：标题、列表、粗体、斜体、下划线、删除线、链接、图片、表格、代码块等
 */
export function DocxEditor({ 
  content, 
  onChange, 
  onWordCountChange,
  placeholder = "在这里开始编辑DOCX文档...",
  readOnly = false 
}: DocxEditorProps) {
  return (
    <TiptapDocxEditor
      content={content}
      onChange={onChange}
      onWordCountChange={onWordCountChange}
      placeholder={placeholder}
      readOnly={readOnly}
    />
  )
}
