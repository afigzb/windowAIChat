/**
 * API提供方管理组件
 * 
 * 功能：
 * - 展示所有配置的 API 提供方列表
 * - 切换当前使用的提供方
 * - 添加/编辑/删除提供方配置
 * - 内联编辑支持
 */

import { useState } from 'react'
import type { AIConfig, ApiProviderConfig } from '../types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useConfirm } from '../../writing/hooks/useConfirm'
import { Icon } from './components'
import { ApiProviderForm } from './ApiProviderForm'

export function ApiProviderManager({ config, onConfigChange }: {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
}) {
  const [editingProvider, setEditingProvider] = useState<ApiProviderConfig | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const { confirm, confirmProps } = useConfirm()
  
  const handleSaveProvider = (provider: ApiProviderConfig) => {
    const newProviders = editingProvider
      ? config.providers.map(p => p.id === provider.id ? provider : p)
      : [...config.providers, provider]
    
    onConfigChange({
      ...config,
      providers: newProviders,
      // 如果是新添加的配置，自动切换到它
      currentProviderId: editingProvider ? config.currentProviderId : provider.id
    })
    
    setEditingProvider(null)
    setShowAddForm(false)
  }
  
  const handleDeleteProvider = async (providerId: string) => {
    if (config.providers.length <= 1) {
      return
    }
    
    const providerToDelete = config.providers.find(p => p.id === providerId)
    if (!providerToDelete) return
    
    const shouldDelete = await confirm({
      title: '确认删除',
      message: `确定要删除配置 "${providerToDelete.name}" 吗？`,
      confirmText: '删除',
      cancelText: '取消',
      type: 'danger'
    })
    
    if (!shouldDelete) return
    
    const newProviders = config.providers.filter(p => p.id !== providerId)
    const newCurrentId = config.currentProviderId === providerId 
      ? newProviders[0].id 
      : config.currentProviderId
    
    onConfigChange({
      ...config,
      providers: newProviders,
      currentProviderId: newCurrentId
    })
  }

  const handleSwitchProvider = (providerId: string) => {
    onConfigChange({
      ...config,
      currentProviderId: providerId
    })
  }

  
  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">API 配置管理</h3>
          <p className="text-base text-gray-600 mt-2">管理你的AI服务提供商配置</p>
        </div>
        <button
          onClick={() => {
            setEditingProvider(null) // 自动取消编辑配置
            setShowAddForm(true)
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-105"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加配置
        </button>
      </div>

      {/* 添加表单 - 移到顶部 */}
      {showAddForm && !editingProvider && (
        <ApiProviderForm
          provider={null}
          onSave={handleSaveProvider}
          onCancel={() => setShowAddForm(false)}
          inline={true}
        />
      )}
      
      {/* 配置列表 */}
      <div className="grid gap-4">
        {config.providers.map((provider) => {
          const isActive = provider.id === config.currentProviderId
          const isEditing = editingProvider?.id === provider.id
          
          return (
            <div
              key={provider.id}
              className={`relative p-6 border-2 rounded-2xl transition-all duration-300 hover:shadow-lg ${
                isActive 
                  ? 'border-blue-400 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* 状态指示器 */}
              <div className={`absolute top-6 right-6 w-3 h-3 rounded-full ${
                isActive ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-gray-300'
              }`} />
              
              <div className="flex items-start justify-between pr-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-lg text-gray-900">{provider.name}</h4>
                        <span className="text-xs font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                          {provider.type === 'openai' || !provider.type ? 'OpenAI 兼容' : 'Google Gemini'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 w-14">模型:</span>
                      <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-lg text-gray-800">{provider.model}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 w-14">URL:</span>
                      <span className="font-mono text-sm truncate max-w-xs text-gray-700">{provider.baseUrl}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 w-14">密钥:</span>
                      <span className="text-sm font-medium">
                        {provider.apiKey ? 
                          <span className="text-green-600 bg-green-50 px-2 py-1 rounded">已设置</span> : 
                          <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded">未设置</span>
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* 操作按钮 */}
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => handleSwitchProvider(provider.id)}
                    className={`p-2.5 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'text-green-600 bg-green-100 cursor-default shadow-sm' 
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50 hover:shadow-sm'
                    }`}
                    title={isActive ? '当前使用的配置' : '切换到此配置'}
                    disabled={isActive}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => {
                      // 如果当前有编辑的，先关闭，然后编辑新的
                      if (editingProvider && editingProvider.id !== provider.id) {
                        setEditingProvider(null)
                        setTimeout(() => setEditingProvider(provider), 100)
                      } else {
                        setEditingProvider(isEditing ? null : provider)
                      }
                    }}
                    className={`p-2.5 transition-all duration-200 rounded-xl ${
                      isEditing 
                        ? 'text-blue-600 bg-blue-100 shadow-sm' 
                        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm'
                    }`}
                    title={isEditing ? "取消编辑" : "编辑配置"}
                  >
                    <Icon name={isEditing ? "close" : "edit"} className="w-4 h-4" />
                  </button>
                  
                  {config.providers.length > 1 && (
                    <button
                      onClick={() => handleDeleteProvider(provider.id)}
                      className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover:shadow-sm"
                      title="删除配置"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* 内联编辑表单 */}
              {isEditing && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <ApiProviderForm
                    provider={provider}
                    onSave={(updatedProvider) => {
                      handleSaveProvider(updatedProvider)
                      setEditingProvider(null)
                    }}
                    onCancel={() => setEditingProvider(null)}
                    inline={true}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {config.providers.length === 0 && (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
          <h3 className="text-xl font-bold text-gray-900 mb-3">还没有API配置</h3>
          <p className="text-base text-gray-600 mb-6">添加你的第一个AI服务提供商配置开始使用</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加配置
          </button>
        </div>
      )}
      

      {/* 统一的确认对话框 */}
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
