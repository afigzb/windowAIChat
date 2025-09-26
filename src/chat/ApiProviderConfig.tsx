import { useState } from 'react'
import type { AIConfig, ApiProviderConfig, ProviderType } from './types'

// 图标组件（局部版本）
const Icon = ({ name, className = "w-4 h-4" }: { name: 'close' | 'edit'; className?: string }) => {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {name === 'close' && (
        <path className='scale-125' strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
      )}
      {name === 'edit' && (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      )}
    </svg>
  )
}

// API配置表单组件
function ApiProviderForm({ provider, onSave, onCancel, inline = false }: {
  provider: ApiProviderConfig | null
  onSave: (provider: ApiProviderConfig) => void
  onCancel: () => void
  inline?: boolean
}) {
  const [formData, setFormData] = useState<ApiProviderConfig>(() => 
    provider || {
      id: `provider-${Date.now()}`,
      name: '',
      type: 'openai',
      baseUrl: '',
      apiKey: '',
      model: '',
      maxTokens: undefined,
      enableCodeConfig: false,
      codeConfigJson: ''
    }
  )
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = '请输入配置名称'
    }
    
    if (!formData.baseUrl.trim()) {
      newErrors.baseUrl = '请输入API URL'
    } else {
      try {
        new URL(formData.baseUrl)
      } catch {
        newErrors.baseUrl = '请输入有效的URL格式'
      }
    }
    
    if (!formData.enableCodeConfig) {
      if (!formData.model.trim()) {
        newErrors.model = '请输入模型名称'
      }
    }

    if (formData.enableCodeConfig && formData.codeConfigJson) {
      try {
        JSON.parse(formData.codeConfigJson)
      } catch (e) {
        newErrors.codeConfigJson = '代码配置JSON格式不正确'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 500))
      onSave(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFieldClass = (fieldName: string) => {
    const baseClass = "w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2"
    if (errors[fieldName]) {
      return `${baseClass} border-red-300 focus:border-red-500 focus:ring-red-200`
    }
    return `${baseClass} border-gray-300 focus:border-blue-500 focus:ring-blue-200`
  }

  const containerClass = inline 
    ? "bg-gray-50 border border-gray-200 rounded-lg p-4" 
    : "bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
    
  return (
    <div className={containerClass}>
      {!inline && (
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {provider ? '编辑配置' : '添加新配置'}
            </h3>
            <p className="text-sm text-gray-500">
              {provider ? '修改现有的API配置信息' : '添加一个新的AI服务提供商配置'}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={inline ? "space-y-3" : "space-y-5"}>
        <div className={inline ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              配置名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="如: GPT-4o, Claude, Kimi Chat"
              className={getFieldClass('name')}
              required
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              提供商类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value as ProviderType
                setFormData({ 
                  ...formData, 
                  type: newType,
                  model: '' // 清空模型选择
                })
              }}
              className={getFieldClass('type')}
              required
            >
              <option value="openai">OpenAI 兼容 (Kimi, Claude, DeepSeek 等)</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={formData.baseUrl}
            onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
            placeholder="https://api.example.com/v1/chat/completions"
            className={getFieldClass('baseUrl')}
            required
          />
          {errors.baseUrl && <p className="text-red-500 text-xs mt-1">{errors.baseUrl}</p>}
          {!inline && (
            <p className="text-xs text-gray-500 mt-1">
              完整的聊天补全接口URL地址
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <input
            type="password"
            value={formData.apiKey}
            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            placeholder="输入API密钥（可选）"
            className={getFieldClass('apiKey')}
          />
          {!inline && (
            <p className="text-xs text-gray-500 mt-1">
              部分服务可能不需要API密钥，留空即可
            </p>
          )}
        </div>
        
        {!formData.enableCodeConfig && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              模型名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="如: gpt-4o, claude-3, kimi-chat"
              className={getFieldClass('model')}
              required={!formData.enableCodeConfig}
            />
            {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model}</p>}
            {!inline && (
              <p className="text-xs text-gray-500 mt-1">
                具体的模型标识符
              </p>
            )}
          </div>
        )}
        
        {!formData.enableCodeConfig && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              最大输出Tokens
            </label>
            <input
              type="number"
              min="1"
              max="10000000"
              value={formData.maxTokens || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                maxTokens: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              placeholder="如果没查看api文档，请留空，错误的值会导致api报错"
              className={getFieldClass('maxTokens')}
            />
            {!inline && (
              <p className="text-xs text-gray-500 mt-1">
                限制AI回复的最大令牌数，留空使用模型默认值
              </p>
            )}
          </div>
        )}

        {/* 代码配置模式开关 */}
        <div className="pt-2">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!formData.enableCodeConfig}
              onChange={(e) => setFormData({ ...formData, enableCodeConfig: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">启用代码配置模式</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">使用你自己的JSON作为请求体。我们会自动拼接对话历史。</p>
        </div>

        {/* 代码配置JSON编辑器 */}
        {formData.enableCodeConfig && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              代码配置 JSON
            </label>
            <textarea
              value={formData.codeConfigJson || ''}
              onChange={(e) => setFormData({ ...formData, codeConfigJson: e.target.value })}
              className={`${getFieldClass('codeConfigJson')} font-mono h-48`}
              placeholder={formData.type === 'openai' 
                ? '{\n  "model": "gpt-4o",\n  "stream": true,\n  "temperature": 0.7,\n  "max_tokens": 1024\n}'
                : '{\n  "generationConfig": {\n    "maxOutputTokens": 2048,\n    "temperature": 0.9\n  }\n}'
              }
            />
            {errors.codeConfigJson && <p className="text-red-500 text-xs mt-1">{errors.codeConfigJson}</p>}
            <p className="text-xs text-gray-500 mt-1">
              提示：消息始终使用系统维护的对话历史，JSON 中的 <code className="font-mono">messages/contents</code> 会被忽略。
            </p>
          </div>
        )}
        
        <div className={`flex gap-3 ${inline ? 'pt-3' : 'pt-4 border-t border-gray-200'}`}>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${inline ? '' : 'flex-1'} inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                处理中...
              </>
            ) : (
              provider ? '保存修改' : '添加配置'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  )
}

// API配置管理组件
export function ApiProviderManager({ config, onConfigChange }: {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
}) {
  const [editingProvider, setEditingProvider] = useState<ApiProviderConfig | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deletingProvider, setDeletingProvider] = useState<string | null>(null)
  
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
  
  const handleDeleteProvider = (providerId: string) => {
    if (config.providers.length <= 1) {
      return
    }
    
    const newProviders = config.providers.filter(p => p.id !== providerId)
    const newCurrentId = config.currentProviderId === providerId 
      ? newProviders[0].id 
      : config.currentProviderId
    
    onConfigChange({
      ...config,
      providers: newProviders,
      currentProviderId: newCurrentId
    })
    
    setDeletingProvider(null)
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
          <h3 className="text-lg font-semibold text-gray-900">API 配置管理</h3>
          <p className="text-sm text-gray-500 mt-1">管理你的AI服务提供商配置</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm hover:shadow-md"
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
          inline={false}
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
              className={`relative p-4 border rounded-xl transition-all duration-200 hover:shadow-md ${
                isActive 
                  ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${isEditing ? 'ring-2 ring-blue-200' : ''}`}
            >
              {/* 状态指示器 */}
              <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
                isActive ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              
              <div className="flex items-start justify-between pr-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {provider.type === 'openai' || !provider.type ? 'OpenAI 兼容' : 'Google Gemini'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-12 text-gray-500">模型:</span>
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{provider.model}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-12 text-gray-500">URL:</span>
                      <span className="font-mono text-xs truncate max-w-xs">{provider.baseUrl}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-12 text-gray-500">密钥:</span>
                      <span className="text-xs">
                        {provider.apiKey ? 
                          <span className="text-green-600">已设置</span> : 
                          <span className="text-amber-600">未设置</span>
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* 操作按钮 */}
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => handleSwitchProvider(provider.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'text-green-600 bg-green-50 cursor-default' 
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
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
                    className={`p-2 transition-colors rounded-lg ${
                      isEditing 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    title={isEditing ? "取消编辑" : "编辑配置"}
                  >
                    <Icon name={isEditing ? "close" : "edit"} className="w-4 h-4" />
                  </button>
                  
                  {config.providers.length > 1 && (
                    <button
                      onClick={() => setDeletingProvider(provider.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <h3 className="text-lg font-medium text-gray-900 mb-2">还没有API配置</h3>
          <p className="text-gray-500 mb-4">添加你的第一个AI服务提供商配置开始使用</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加配置
          </button>
        </div>
      )}
      

      {/* 删除确认对话框 */}
      {deletingProvider && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
                <p className="text-sm text-gray-500">此操作无法撤销</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              确定要删除配置 "{config.providers.find(p => p.id === deletingProvider)?.name}" 吗？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteProvider(deletingProvider)}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                删除
              </button>
              <button
                onClick={() => setDeletingProvider(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
