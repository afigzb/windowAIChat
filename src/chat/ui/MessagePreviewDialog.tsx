/**
 * 消息预览对话框组件
 * 
 * 功能：
 * - 在发送前预览将要发送的消息内容和请求详情
 * - 支持两种视图模式：用户友好视图 / 技术细节视图
 * - 显示 System 提示词、当前消息、历史上下文（可折叠）
 * - 显示完整的 API 请求信息（URL、Headers、Body）
 * - 自动脱敏 API Key
 * - 支持复制完整请求 JSON
 */

import { useEffect, useRef, useState } from 'react'
import storage from '../../storage'
import { Icon } from '../../components'

interface MessagePreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  previewData: {
    requestBody: Record<string, any>
    headers: Record<string, string>
    url: string
  } | null
  // 新增：当提示词更新时重新生成预览数据的回调
  onRefreshPreview?: () => void
}

const STORAGE_KEY_VIEW_MODE = 'message_preview_view_mode'

export function MessagePreviewDialog({ isOpen, onClose, previewData, onRefreshPreview }: MessagePreviewDialogProps) {
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

  // 监听数据更新（提示词卡片变化等）
  useEffect(() => {
    if (!isOpen || !onRefreshPreview) return

    const handleDataChanged = () => {
      console.log('[MessagePreviewDialog] 检测到数据更新，刷新预览')
      onRefreshPreview()
    }

    // 监听提示词卡片更新（窗口间同步）
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onPromptCardsChanged) {
      (window as any).electronAPI.onPromptCardsChanged(handleDataChanged)
    }

    // 可以在这里添加更多监听器，例如配置变化等
  }, [isOpen, onRefreshPreview])

  if (!isOpen || !previewData) return null

  // 解析消息 - 支持 OpenAI 和 Gemini 格式
  const isGeminiFormat = !!previewData.requestBody.contents
  
  let messages: any[] = []
  let systemMessage: any = null
  let lastUserMessage: any = null
  let contextMessages: any[] = []
  
  if (isGeminiFormat) {
    // Gemini 格式
    const contents = previewData.requestBody.contents || []
    const systemInstruction = previewData.requestBody.systemInstruction
    
    // 转换 systemInstruction
    if (systemInstruction?.parts) {
      systemMessage = {
        role: 'system',
        content: systemInstruction.parts.map((p: any) => p.text || '').join('\n')
      }
    }
    
    // 转换 contents
    messages = contents.map((item: any) => ({
      role: item.role === 'model' ? 'assistant' : 'user',
      content: item.parts?.map((p: any) => p.text || '').join('\n') || ''
    }))
    
    lastUserMessage = [...messages].reverse().find((msg: any) => msg.role === 'user')
    contextMessages = messages.filter((msg: any) => msg !== lastUserMessage)
  } else {
    // OpenAI 格式
    messages = previewData.requestBody.messages || []
    systemMessage = messages.find((msg: any) => msg.role === 'system')
    lastUserMessage = [...messages].reverse().find((msg: any) => msg.role === 'user')
    contextMessages = messages.filter((msg: any) => 
      msg !== systemMessage && msg !== lastUserMessage
    )
  }

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
    
    // 处理 OpenAI 格式: Authorization: Bearer xxxxx
    if (sanitized.Authorization) {
      const parts = sanitized.Authorization.split(' ')
      if (parts.length === 2) {
        sanitized.Authorization = `${parts[0]} ************`
      }
    }
    
    // 处理 Gemini 格式: x-goog-api-key: xxxxx
    if (sanitized['x-goog-api-key']) {
      sanitized['x-goog-api-key'] = '************'
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
                <Icon name="eye" className="w-4 h-4 text-white" />
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
                  <Icon name="user" className="w-4 h-4" />
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
                  <Icon name="code" className="w-4 h-4" />
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
                <Icon name="copy" className="w-4 h-4" />
                复制JSON
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-all duration-150"
              title="关闭"
            >
              <Icon name="close" className="w-5 h-5" />
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
                      <Icon name="settings" className="w-3.5 h-3.5 text-white" />
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
                      <Icon name="message" className="w-3.5 h-3.5 text-white" />
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
                    <Icon 
                      name="chevronDown" 
                      className={`w-5 h-5 text-slate-600 transition-transform duration-200 ${showContext ? 'rotate-180' : ''}`}
                    />
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
                                <Icon name="user" className="w-3 h-3" />
                                用户
                              </>
                            ) : (
                              <>
                                <Icon name="robot" className="w-3 h-3" />
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
                  <Icon name="link" className="w-4 h-4 text-slate-500" />
                  请求URL
                </h3>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <code className="text-xs text-slate-700 break-all">{sanitizeUrl(previewData.url)}</code>
                </div>
              </div>

              {/* Headers */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Icon name="document" className="w-4 h-4 text-slate-500" />
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
                  <Icon name="file" className="w-4 h-4 text-slate-500" />
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

