import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import type { AIConfig } from '../types'

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
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500', 'bg-rose-500', 'bg-cyan-500']
    return colors[providerId.length % colors.length]
  }
  
  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-300 min-w-[9rem] max-w-[12rem] shadow-sm ${
          disabled 
            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
            : 'border-gray-200 hover:border-blue-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-1 text-gray-700 cursor-pointer bg-white hover:bg-blue-50 hover:shadow-lg transform hover:scale-105'
        }`}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${getProviderColor(config.currentProviderId)} shadow-sm`} />
        <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis flex-1">{currentProvider?.name || '未知配置'}</span>
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
          <div className="absolute -top-4 left-0 -translate-y-full mt-1 w-full min-w-[14rem] max-w-[16rem] bg-white border-2 border-gray-200 rounded-2xl shadow-2xl z-20 overflow-hidden backdrop-blur-sm">
            {config.providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  onProviderChange(provider.id)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-blue-50 min-w-0 ${
                  provider.id === config.currentProviderId ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-bold ' : 'text-gray-700 hover:pl-5'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${getProviderColor(provider.id)} shadow-sm`} />
                <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis flex-1">{provider.name}</span>
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
        <div className="max-w-4xl mx-auto px-8 py-6 min-w-[20rem]">
        <div className="border-2 border-gray-200 rounded-2xl bg-white focus-within:border-blue-400 focus-within:shadow-xl transition-all duration-300 shadow-md hover:shadow-lg min-w-[18rem]">
          <div className="p-5">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                onChange(e.target.value)
                adjustHeight(e.target)
              }}
              onKeyPress={handleKeyPress}
              placeholder={isLoading ? "AI正在回复中，可以预输入下一条消息..." : "发送消息给 AI Assistant..."}
              className="w-full bg-transparent border-none focus:outline-none resize-none placeholder-gray-400 text-gray-900 text-base leading-relaxed min-h-[60px] max-h-[150px] min-w-0"
            />
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-t-2 border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50 rounded-b-2xl min-w-[20rem]">
            <div className="flex items-center gap-4 min-w-0 flex-shrink">
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
              className={`px-6 py-3 rounded-xl transition-all duration-300 text-sm font-semibold flex items-center gap-2.5 shadow-md hover:shadow-xl transform min-w-[5rem] whitespace-nowrap ${
                isLoading 
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 hover:scale-105'
                  : canSend
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:scale-105'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Icon name={isLoading ? 'stop' : 'send'} />
              <span className="whitespace-nowrap">{isLoading ? '停止' : '发送'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

ChatInputArea.displayName = 'ChatInputArea'
