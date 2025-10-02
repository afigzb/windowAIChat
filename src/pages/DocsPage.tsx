import React from 'react'
import { MarkdownRenderer } from '../md-html-dock/renderers'
// 使用 Vite 的 ?raw 导入，直接将 Markdown 文件内容作为字符串导入
import docsContent from './docs.md?raw'

export function DocsPage() {
  return (
    <div className="absolute inset-0 overflow-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <MarkdownRenderer content={docsContent} theme="light" />
        </div>
      </div>
    </div>
  )
}
