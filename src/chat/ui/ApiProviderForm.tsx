/**
 * API提供方配置表单组件
 * 
 * 功能：
 * - 添加/编辑 API 提供方配置
 * - 支持 OpenAI 兼容和 Google Gemini 两种格式
 * - 支持代码配置模式（自定义 JSON）
 * - 表单验证
 */

import { useState } from 'react'
import type { ApiProviderConfig, ProviderType } from '../types'
import { Tooltip, NumberInput } from '../../components'
import { CustomSelect, type SelectOption } from '../../components'

export function ApiProviderForm({ provider, onSave, onCancel, inline = false }: {
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
    const baseClass = "w-full px-4 py-3 border-2 rounded-xl text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1"
    if (errors[fieldName]) {
      return `${baseClass} border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50`
    }
    return `${baseClass} border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-blue-200 bg-white`
  }

  const containerClass = inline 
    ? "bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-5" 
    : "bg-white border border-gray-200 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
    
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
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              配置名称 <span className="text-red-500 text-xs">*</span>
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
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              提供商类型 <span className="text-red-500 text-xs">*</span>
            </label>
            <CustomSelect
              value={formData.type}
              onChange={(newType) => {
                setFormData({ 
                  ...formData, 
                  type: newType as ProviderType,
                  model: '' // 清空模型选择
                })
              }}
              options={[
                { value: 'openai', label: 'OpenAI 兼容 (ChatGPT, Claude, DeepSeek 等)' },
                { value: 'gemini', label: 'Google Gemini' }
              ]}
              className={getFieldClass('type')}
              placeholder="请选择提供商类型"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
            API URL <span className="text-red-500 text-xs">*</span>
            <Tooltip content="注意这是openai兼容格式，以deepseek为例，URL是：https://api.deepseek.com/v1/chat/completions（就是多了个尾缀）" />
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
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-3">
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
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              模型名称 <span className="text-red-500 text-xs">*</span>
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
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              最大输出Tokens
            </label>
            <NumberInput
              min={1}
              max={10000000}
              value={formData.maxTokens}
              onChange={(value) => setFormData({ 
                ...formData, 
                maxTokens: value
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
            <span className="text-sm font-semibold text-gray-800">启用代码配置模式</span>
          </label>
          <p className="text-sm text-gray-600 mt-2">使用你自己的JSON作为请求体。我们会自动拼接对话历史。</p>
        </div>

        {/* 代码配置JSON编辑器 */}
        {formData.enableCodeConfig && (
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
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
        
        <div className={`flex gap-3 ${inline ? 'pt-3 justify-end' : 'pt-4 border-t border-gray-200'}`}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${inline ? '' : 'flex-1'} inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
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
        </div>
      </form>
    </div>
  )
}

