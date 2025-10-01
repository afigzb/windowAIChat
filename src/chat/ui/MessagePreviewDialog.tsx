import { useEffect, useRef, useState } from 'react'
import storage from '../../storage'

interface MessagePreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  previewData: {
    requestBody: Record<string, any>
    headers: Record<string, string>
    url: string
  } | null
}

const STORAGE_KEY_VIEW_MODE = 'message_preview_view_mode'

export function MessagePreviewDialog({ isOpen, onClose, previewData }: MessagePreviewDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'friendly' | 'technical'>(() => {
    // 从缓存中读取上次的视图模式
    return storage.loadGenericData<'friendly' | 'technical'>(STORAGE_KEY_VIEW_MODE, 'friendly')
  })
  const [showContext, setShowContext] = useState(false)

  // 当视图模式改变时，保存到缓存
  const handleViewModeChange = (mode: 'friendly' | 'technical') => {
    setViewMode(mode)
    storage.saveGenericData(STORAGE_KEY_VIEW_MODE, mode)
  }

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose])

  // ESC键关闭
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      return () => {
        document.removeEventListener('keydown', handleEsc)
      }
    }
  }, [isOpen, onClose])

  // 重置折叠状态（保留视图模式缓存）
  useEffect(() => {
    if (isOpen) {
      setShowContext(false)
    }
  }, [isOpen])

  if (!isOpen || !previewData) return null

  // 解析消息
  const messages = previewData.requestBody.messages || []
  const systemMessage = messages.find((msg: any) => msg.role === 'system')
  const lastUserMessage = [...messages].reverse().find((msg: any) => msg.role === 'user')
  const contextMessages = messages.filter((msg: any) => 
    msg !== systemMessage && msg !== lastUserMessage
  )

  // 复制到剪贴板
  const handleCopy = async () => {
    try {
      const fullRequest = {
        url: previewData.url,
        headers: previewData.headers,
        body: previewData.requestBody
      }
      await navigator.clipboard.writeText(JSON.stringify(fullRequest, null, 2))
      
      // 简单的复制成功提示
      const button = document.querySelector('.copy-button')
      if (button) {
        const originalText = button.textContent
        button.textContent = '已复制!'
        setTimeout(() => {
          button.textContent = originalText
        }, 2000)
      }
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 脱敏处理 API Key
  const sanitizeHeaders = (headers: Record<string, string>) => {
    const sanitized = { ...headers }
    if (sanitized.Authorization) {
      const parts = sanitized.Authorization.split(' ')
      if (parts.length === 2) {
        const token = parts[1]
        sanitized.Authorization = `${parts[0]} ${token.substring(0, 4)}...${token.substring(token.length - 4)}`
      }
    }
    return sanitized
  }

  // 脱敏处理 URL 中的 API Key
  const sanitizeUrl = (url: string) => {
    try {
      const urlObj = new URL(url)
      const key = urlObj.searchParams.get('key')
      if (key) {
        urlObj.searchParams.set('key', `${key.substring(0, 4)}...${key.substring(key.length - 4)}`)
      }
      return urlObj.toString()
    } catch {
      return url
    }
  }

  // 渲染消息内容
  const renderMessageContent = (content: any) => {
    if (typeof content === 'string') {
      return content
    }
    if (Array.isArray(content)) {
      return content.map((part: any, idx: number) => {
        if (typeof part === 'string') return part
        if (part.type === 'text') return part.text
        if (part.type === 'image_url') return `[图片: ${part.image_url?.url?.substring(0, 50)}...]`
        return JSON.stringify(part)
      }).join('\n')
    }
    return JSON.stringify(content, null, 2)
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-xl max-w-4xl w/full max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800">消息预览</h2>
            </div>
            
            {/* 视图切换按钮 - 卡片切换风格 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleViewModeChange('friendly')}
                className={`group relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  viewMode === 'friendly'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow'
                    : 'bg-white text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 hover:shadow'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  用户视图
                </span>
              </button>
              <button
                onClick={() => handleViewModeChange('technical')}
                className={`group relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  viewMode === 'technical'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow'
                    : 'bg-white text-slate-600 hover:text-emerald-600 border border-slate-200 hover:border-emerald-300 hover:shadow'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  技术细节
                </span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="copy-button px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-150 shadow-sm hover:shadow"
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                复制JSON
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-all duration-150"
              title="关闭"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {viewMode === 'friendly' ? (
            <>
              {/* 用户友好型视图 */}
              {/* System 提示词 */}
              {systemMessage && (
                <div className="group">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-sm">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">System 提示词</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-purple-200 to-transparent"></div>
                  </div>
                  <div className="relative bg-white rounded-xl p-5 border border-purple-300">
                    <div className="relative text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {renderMessageContent(systemMessage.content)}
                    </div>
                  </div>
                </div>
              )}

              {/* 当前发送的消息 */}
              {lastUserMessage && (
                <div className="group">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-sm">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">当前发送的消息</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent"></div>
                  </div>
                  <div className="relative bg-white rounded-xl p-5 border border-blue-200 shadow-sm transition-all duration-200">
                    <div className="absolute -top-2 -right-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                      即将发送
                    </div>
                    <div className="relative text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                      {renderMessageContent(lastUserMessage.content)}
                    </div>
                  </div>
                </div>
              )}

              {/* 上下文历史 - 可折叠 */}
              {contextMessages.length > 0 && (
                <div className="group">
                  <button
                    onClick={() => setShowContext(!showContext)}
                    className="w-full flex items-center justify-between p-4 text-sm font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl transition-all duration-200 border border-slate-200 hover:border-slate-300 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="uppercase tracking-wide">历史上下文</span>
                      <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold rounded-full shadow-sm">
                        {contextMessages.length}
                      </span>
                    </div>
                    <svg 
                      className={`w-5 h-5 text-slate-600 transition-transform duration-200 ${showContext ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showContext && (
                    <div className="mt-3 space-y-3 max-h-96 overflow-y-auto pr-1">
                      {contextMessages.map((msg: any, idx: number) => (
                        <div 
                          key={idx}
                          className={`relative p-4 rounded-xl border shadow-sm transition-all duration-200 ${
                            msg.role === 'user'
                              ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300'
                              : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
                          }`}
                        >
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-2 ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-sm'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                          }`}>
                            {msg.role === 'user' ? (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                用户
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                AI
                              </>
                            )}
                          </div>
                          <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {renderMessageContent(msg.content)}
                          </div>
                          <div className="absolute top-2 right-2 text-xs font-semibold text-slate-400">
                            #{idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* 技术细节视图 */}
              {/* URL */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  请求URL
                </h3>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <code className="text-xs text-slate-700 break-all">{sanitizeUrl(previewData.url)}</code>
                </div>
              </div>

              {/* Headers */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  请求头
                </h3>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <pre className="text-xs text-slate-700 overflow-x-auto font-mono">
                    {JSON.stringify(sanitizeHeaders(previewData.headers), null, 2)}
                  </pre>
                </div>
              </div>

              {/* Request Body */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  请求体
                </h3>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <pre className="text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap break-words font-mono">
                    {JSON.stringify(previewData.requestBody, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-6 py-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center justify-center gap-2 text-center">
            <p className="text-xs font-semibold text-slate-700">
              💡 提示
            </p>
            <p className="text-xs text-slate-600">
              {viewMode === 'friendly' 
                ? '查看 System 提示词和当前消息内容。切换到"技术细节"可查看完整请求信息。' 
                : 'API Key 已脱敏显示，实际发送时会使用完整密钥。'}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded shadow-sm">ESC</kbd>
              或点击外部区域可关闭
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

