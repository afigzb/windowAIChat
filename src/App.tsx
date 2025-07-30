import { useState } from 'react'
import { ChatPage } from './chat'

type PageType = 'home' | 'chat'

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home')
  const [chatKey, setChatKey] = useState<number>(0) // 添加chatKey状态

  const handleEnterChat = () => {
    setCurrentPage('chat')
    setChatKey(prev => prev + 1) // 每次进入聊天时更新key，强制重新创建组件
  }

  const handleBackToHome = () => {
    setCurrentPage('home')
  }

  if (currentPage === 'chat') {
    return <ChatPage key={chatKey} onBack={handleBackToHome} />
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Logo区域 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500 rounded-2xl mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-slate-800 mb-3">
            AI助手
          </h1>
          <p className="text-slate-600 leading-relaxed">
            基于 DeepSeek 的智能对话助手<br />
            支持思维链推理和多分支对话
          </p>
        </div>
        
        {/* 主卡片 */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200">
          <div className="text-center space-y-6">
            <div>
              <h2 className="text-xl font-medium text-slate-800 mb-2">
                开始对话
              </h2>
              <p className="text-slate-500 text-sm">
                与 AI 进行深度交流，探索无限可能
              </p>
            </div>
            
            <button
              onClick={handleEnterChat}
              className="w-full bg-teal-500 text-white font-medium py-4 px-6 rounded-2xl transition-colors hover:bg-teal-600"
            >
              开始聊天
            </button>
          </div>
        </div>
        
        {/* 底部信息 */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center gap-6 mb-2">
            <a
              href="https://github.com/afigzb/AIChat"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="text-sm">GitHub</span>
            </a>
            
            <a
              href="http://47.107.67.50:5432/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
              </svg>
              <span className="text-sm">组件库</span>
            </a>
            
            <a
              href="http://47.107.67.50/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
              </svg>
              <span className="text-sm">个人网站</span>
            </a>
          </div>
          <p className="text-xs text-slate-400 mt-6">
            基于react + deepseek api打造的纯前端ai聊天页面
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
