// 重新导出拆分出来的组件
export { MessageBubble } from './MessageBubble'
export { ApiProviderManager } from './ApiProviderConfig'
export { ChatInputArea } from './ChatInput'

import { useState } from 'react'
import type { AIConfig } from '../types'

// ===== 保留的公共组件 =====

// 动画点组件 - 统一的加载动画
export const AnimatedDots = ({ size = 'sm', color = 'slate' }: { size?: 'sm' | 'md'; color?: 'teal' | 'slate' }) => {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
  const colorClasses = {
    teal: 'bg-blue-500',
    slate: 'bg-gray-400'
  }
  
  return (
    <div className="flex items-center justify-center gap-1">
      {[0, 0.1, 0.2].map((delay, i) => (
        <div 
          key={i}
          className={`${dotSize} ${colorClasses[color]} rounded-full animate-bounce`}
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  )
}

// 合并的图标组件
type IconName = 'settings' | 'close' | 'send' | 'stop' | 'chevronDown' | 'chevronLeft' | 'chevronRight' | 'regenerate' | 'edit' | 'copy'

export const Icon = ({ name, className = "w-4 h-4" }: { name: IconName; className?: string }) => {
  const icons: Record<string, string> = {
    settings: "M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z",
    close: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z",
    send: "M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z",
    stop: "M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z",
    chevronDown: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z",
    chevronLeft: "M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z",
    chevronRight: "M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
  }

  const strokeIcons: Record<string, string> = {
    regenerate: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    copy: "M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
  }

  if (strokeIcons[name]) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={strokeIcons[name]} />
      </svg>
    )
  }

  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d={icons[name]} clipRule="evenodd"/>
    </svg>
  )
}

// API提供方选择器 - 保留在这里以避免循环依赖
export function ApiProviderToggle({ config, onProviderChange, disabled }: {
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
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-300 min-w-[140px] shadow-sm ${
          disabled 
            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
            : 'border-gray-200 hover:border-blue-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-1 text-gray-700 cursor-pointer bg-white hover:bg-blue-50 hover:shadow-lg transform hover:scale-105'
        }`}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${getProviderColor(config.currentProviderId)} shadow-sm`} />
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
          <div className="absolute -top-4 left-0 -translate-y-full mt-1 w-full min-w-[220px] bg-white border-2 border-gray-200 rounded-2xl shadow-2xl z-20 overflow-hidden backdrop-blur-sm">
            {config.providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  onProviderChange(provider.id)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-blue-50 ${
                  provider.id === config.currentProviderId ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-bold border-l-4 border-blue-500' : 'text-gray-700 hover:pl-5'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${getProviderColor(provider.id)} shadow-sm`} />
                <span className="truncate">{provider.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// 滑块组件
export function Slider({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 100, 
  step = 1, 
  marks,
  formatValue = (v) => v.toString()
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  marks?: string[]
  formatValue?: (value: number) => string
}) {
  return (
    <div className="space-y-4">
      <label className="block text-base font-semibold text-gray-800">
        {label} <span className="font-normal text-gray-600">({formatValue(value)})</span>
      </label>
      <div className="px-5 py-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-gray-200 shadow-sm">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full accent-blue-500 cursor-pointer"
        />
        {marks && (
          <div className="flex justify-between text-sm text-gray-600 font-medium mt-3">
            {marks.map((mark, i) => <span key={i}>{mark}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}