import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import type { AIConfig } from './types'

// API提供方选择器
function ApiProviderToggle({ config, onProviderChange, disabled }: {
  config: AIConfig
  onProviderChange: (providerId: string) => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  const currentProvider = config.providers.find(p => p.id === config.currentProviderId)
  const getProviderColor = (providerId: string) => {
    // 根据提供方ID生成颜色
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-red-600', 'bg-teal-600']
    return colors[providerId.length % colors.length]
  }
  
  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 min-w-[120px] shadow-sm ${
          disabled 
            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
            : 'border-gray-200 hover:border-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 cursor-pointer bg-white hover:bg-gray-50 hover:shadow-md'
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${getProviderColor(config.currentProviderId)}`} />
        <span className="truncate">{currentProvider?.name || '未知配置'}</span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && !disabled && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute -top-4 left-0 -translate-y-full mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden backdrop-blur-sm">
            {config.providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  onProviderChange(provider.id)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-blue-50 ${
                  provider.id === config.currentProviderId ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${getProviderColor(provider.id)}`} />
                <span className="truncate">{provider.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// 图标组件（简化版）
const Icon = ({ name }: { name: 'send' | 'stop' }) => {
  const icons = {
    send: "M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z",
    stop: "M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
  }

  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d={icons[name]} clipRule="evenodd"/>
    </svg>
  )
}

// 聊天输入区域
export const ChatInputArea = forwardRef<
  { focus: () => void },
  {
    value: string
    onChange: (value: string) => void
    onSend: () => void
    isLoading: boolean
    onAbort: () => void
    config: AIConfig
    onProviderChange: (providerId: string) => void
  }
>(({ 
  value, 
  onChange, 
  onSend, 
  isLoading, 
  onAbort, 
  config,
  onProviderChange 
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 暴露focus方法给父组件
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus()
    }
  }), [])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isLoading) {
        onAbort()
      } else if (value.trim()) {
        onSend()
      }
    }
  }

  const adjustHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto'
    element.style.height = Math.min(element.scrollHeight, 150) + 'px'
  }

  useEffect(() => {
    if (!value.trim() && textareaRef.current) {
      textareaRef.current.style.height = '60px'
    }
  }, [value])

  const canSend = !isLoading && value.trim()

  return (
    <div className="sticky bottom-0">
      <div className="max-w-4xl mx-auto p-6 pt-0">
        <div className="border border-gray-200 rounded-2xl bg-white focus-within:border-blue-400 transition-colors shadow-sm hover:shadow-md">
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                onChange(e.target.value)
                adjustHeight(e.target)
              }}
              onKeyPress={handleKeyPress}
              placeholder={isLoading ? "AI正在回复中，可以预输入下一条消息..." : "发送消息给 AI Assistant..."}
              className="w-full bg-transparent border-none focus:outline-none resize-none placeholder-gray-500 text-gray-900 leading-relaxed min-h-[60px] max-h-[150px]"
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <div className="flex items-center gap-4">
              <ApiProviderToggle config={config} onProviderChange={onProviderChange} disabled={isLoading} />
              
              {isLoading && (
                <div className="flex items-center gap-2">
                  {/* Loading indicator if needed */}
                </div>
              )}
            </div>

            <button
              onClick={isLoading ? onAbort : onSend}
              disabled={!isLoading && !canSend}
              className={`px-5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md ${
                isLoading 
                  ? 'bg-gray-600 text-white hover:bg-gray-700'
                  : canSend
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Icon name={isLoading ? 'stop' : 'send'} />
              <span>{isLoading ? '停止' : '发送'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

ChatInputArea.displayName = 'ChatInputArea'
