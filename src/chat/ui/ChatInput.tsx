/**
 * 聊天输入区域组件
 * 
 * 功能：
 * - 支持多行文本输入，自动高度调整
 * - 集成 API 提供方切换器
 * - 支持 Enter 发送、Shift+Enter 换行
 * - 发送/停止按钮切换
 */

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import type { AIConfig } from '../types'
import { Icon, ApiProviderToggle } from './components'

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
      <div className="max-w-4xl mx-auto px-8 pb-6 min-w-[20rem]">
        <div className="border-2 border-gray-200 rounded-2xl bg-white focus-within:border-blue-400 focus-within:shadow-xl transition-all duration-300 shadow-md hover:shadow-lg min-w-[20rem]">
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
            <div className="flex items-center gap-4 flex-shrink">
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
              className={`px-6 py-3 rounded-xl transition-all duration-300 text-sm font-semibold flex items-center gap-2.5 shadow-md hover:shadow-xl transform whitespace-nowrap ${
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
