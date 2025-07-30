import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import 'katex/dist/katex.min.css'

interface MarkdownRendererProps {
  content: string
  className?: string
  theme?: 'light' | 'dark'
}

export function MarkdownRenderer({ 
  content, 
  className = '', 
  theme = 'light' 
}: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // 代码块高亮
          code({ inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '')
          const language = match ? match[1] : ''
          
          if (!inline && language) {
            return (
              <div className="relative group">
                <div className="flex items-center justify-between bg-gray-800 text-gray-200 px-4 py-2 text-sm font-mono rounded-t-lg">
                  <span>{language}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-white"
                    title="复制代码"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <SyntaxHighlighter
                  style={theme === 'dark' ? oneDark : oneLight} as any
                  language={language}
                  PreTag="div"
                  className="!mt-0 !rounded-t-none"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            )
          }
          
          // 内联代码
          return (
            <code 
              className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono" 
              {...props}
            >
              {children}
            </code>
          )
        },
        
        // 标题样式
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold text-gray-900 mb-3 mt-6">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-base font-semibold text-gray-900 mb-2 mt-3">
            {children}
          </h4>
        ),
        
        // 段落
        p: ({ children }) => (
          <p className="mb-4 leading-relaxed text-gray-800">
            {children}
          </p>
        ),
        
        // 列表
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-4 space-y-1 text-gray-800">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-800">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        
        // 引用
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-4 bg-blue-50 text-gray-700 italic">
            {children}
          </blockquote>
        ),
        
        // 表格
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gray-50">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-gray-200">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-gray-50">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200">
            {children}
          </td>
        ),
        
        // 链接
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            {children}
          </a>
        ),
        
        // 强调
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-gray-700">{children}</em>
        ),
        
        // 删除线
        del: ({ children }) => (
          <del className="line-through text-gray-500">{children}</del>
        ),
        
        // 水平线
        hr: () => (
          <hr className="my-6 border-t border-gray-300" />
        ),
        
        // 图片
        img: ({ src, alt }) => (
          <img
            src={src}
            alt={alt}
            className="max-w-full h-auto rounded-lg shadow-sm mb-4"
          />
        )
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer 

