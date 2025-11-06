/**
 * Chat UI 专用组件
 * 
 * 包含以下组件：
 * - ApiProviderToggle: API提供方切换下拉框
 * 
 * 通用组件已移至 src/components/
 */

import { useState } from 'react'
import type { AIConfig } from '../types'
import { Icon } from '../../components'

// ===== API提供方切换下拉框 =====

export function ApiProviderToggle({ 
  config, 
  onProviderChange, 
  disabled 
}: {
  config: AIConfig
  onProviderChange: (providerId: string) => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  const currentProvider = config.providers.find(p => p.id === config.currentProviderId)
  
  const getProviderColor = (providerId: string) => {
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
        <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis flex-1">
          {currentProvider?.name || '未知配置'}
        </span>
        <Icon 
          name="chevronDown" 
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
        />
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
                  provider.id === config.currentProviderId 
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-bold ' 
                    : 'text-gray-700 hover:pl-5'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${getProviderColor(provider.id)} shadow-sm`} />
                <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis flex-1">
                  {provider.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}


// ===== 导出所有组件 =====

export { MessageBubble } from './MessageBubble'
export { ApiProviderManager } from './ApiProviderConfig'
export { ChatInputArea } from './ChatInput'
