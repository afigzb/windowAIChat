import { useState, useEffect } from 'react'
import type { AIConfig } from '../chat'
import { Tooltip } from '../components'

interface AgentsPageProps {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
}

/**
 * Agent 系统配置页面
 */
export function AgentsPage({ config, onConfigChange }: AgentsPageProps) {
  const [agentEnabled, setAgentEnabled] = useState(config.agentConfig?.enabled ?? false)
  
  // 文件概括配置
  const [fileProviderId, setFileProviderId] = useState(
    config.agentConfig?.preprocessor?.fileProcessor?.providerId || config.currentProviderId
  )
  const [filePrompt, setFilePrompt] = useState(
    config.agentConfig?.preprocessor?.fileProcessor?.systemPrompt || ''
  )

  // 上下文概括配置
  const [contextProviderId, setContextProviderId] = useState(
    config.agentConfig?.preprocessor?.contextProcessor?.providerId || config.currentProviderId
  )
  const [contextPrompt, setContextPrompt] = useState(
    config.agentConfig?.preprocessor?.contextProcessor?.systemPrompt || ''
  )

  // 同步配置变化
  useEffect(() => {
    setAgentEnabled(config.agentConfig?.enabled ?? false)
    setFileProviderId(
      config.agentConfig?.preprocessor?.fileProcessor?.providerId || config.currentProviderId
    )
    setFilePrompt(config.agentConfig?.preprocessor?.fileProcessor?.systemPrompt || '')
    setContextProviderId(
      config.agentConfig?.preprocessor?.contextProcessor?.providerId || config.currentProviderId
    )
    setContextPrompt(config.agentConfig?.preprocessor?.contextProcessor?.systemPrompt || '')
  }, [config])

  // 更新配置
  const updateConfig = () => {
    onConfigChange({
      ...config,
      agentConfig: {
        ...config.agentConfig,
        enabled: agentEnabled,
        preprocessor: {
          fileProcessor: {
            providerId: fileProviderId,
            systemPrompt: filePrompt.trim() || undefined
          },
          contextProcessor: {
            providerId: contextProviderId,
            systemPrompt: contextPrompt.trim() || undefined
          }
        }
      }
    })
  }

  // 保存配置（失焦时）
  const handleSave = () => {
    updateConfig()
  }

  // 切换开关
  const handleToggle = (enabled: boolean) => {
    setAgentEnabled(enabled)
    onConfigChange({
      ...config,
      agentConfig: {
        ...config.agentConfig,
        enabled
      }
    })
  }

  // 重置提示词
  const handleResetFilePrompt = () => {
    setFilePrompt('')
    setTimeout(handleSave, 0)
  }

  const handleResetContextPrompt = () => {
    setContextPrompt('')
    setTimeout(handleSave, 0)
  }

  const currentMainProvider = config.providers.find(p => p.id === config.currentProviderId)
  const getProvider = (id: string) => config.providers.find(p => p.id === id)

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Agent 系统配置
          </h1>
          <p className="text-sm text-gray-600">
            配置 AI Agent 的智能预处理功能，包括文件概括和对话历史压缩
          </p>
        </div>

        {/* Agent 系统开关 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-medium text-gray-900">启用 Agent 系统</h2>
              <Tooltip content="开启后，系统会在发送请求前自动对长文件和对话历史进行智能概括" />
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={agentEnabled}
                onChange={(e) => handleToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* 预处理配置 */}
        {agentEnabled && (
          <>
            {/* 文件概括配置 */}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <div className="flex items-center space-x-2 border-b pb-3">
                <h2 className="text-lg font-medium text-gray-900">文件概括</h2>
                <Tooltip content="对超过 1000 字符的文件内容进行智能概括" />
              </div>

              {/* 模型选择 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  使用模型
                </label>
                <select
                  value={fileProviderId}
                  onChange={(e) => {
                    setFileProviderId(e.target.value)
                    setTimeout(handleSave, 0)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                  {config.providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} ({provider.model})
                    </option>
                  ))}
                </select>
                {fileProviderId === config.currentProviderId && (
                  <p className="text-xs text-gray-500">使用主对话模型</p>
                )}
              </div>

              {/* 系统提示词 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    系统提示词（可选）
                  </label>
                  {filePrompt && (
                    <button
                      onClick={handleResetFilePrompt}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      恢复默认
                    </button>
                  )}
                </div>
                <textarea
                  value={filePrompt}
                  onChange={(e) => setFilePrompt(e.target.value)}
                  onBlur={handleSave}
                  placeholder="留空使用默认提示词。自定义提示词中可以使用变量：用户的需求会自动填充到提示词中。"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono resize-none"
                />
                <p className="text-xs text-gray-500">
                  默认提示词会要求 AI 分析文件类型、提炼关键信息、保留重要细节
                </p>
              </div>
            </div>

            {/* 上下文概括配置 */}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <div className="flex items-center space-x-2 border-b pb-3">
                <h2 className="text-lg font-medium text-gray-900">对话历史概括</h2>
                <Tooltip content="对超过 2000 字符的对话历史进行智能概括" />
              </div>

              {/* 模型选择 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  使用模型
                </label>
                <select
                  value={contextProviderId}
                  onChange={(e) => {
                    setContextProviderId(e.target.value)
                    setTimeout(handleSave, 0)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                  {config.providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} ({provider.model})
                    </option>
                  ))}
                </select>
                {contextProviderId === config.currentProviderId && (
                  <p className="text-xs text-gray-500">使用主对话模型</p>
                )}
              </div>

              {/* 系统提示词 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    系统提示词（可选）
                  </label>
                  {contextPrompt && (
                    <button
                      onClick={handleResetContextPrompt}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      恢复默认
                    </button>
                  )}
                </div>
                <textarea
                  value={contextPrompt}
                  onChange={(e) => setContextPrompt(e.target.value)}
                  onBlur={handleSave}
                  placeholder="留空使用默认提示词。自定义提示词中会自动包含对话历史和用户当前需求。"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono resize-none"
                />
                <p className="text-xs text-gray-500">
                  默认提示词会要求 AI 提炼关键信息和结论、保留与当前需求相关的内容
                </p>
              </div>
            </div>

            {/* 最终生成步骤说明 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">最终生成步骤</p>
                  <p className="text-sm text-gray-600">
                    最终生成始终使用主对话模型：<strong>{currentMainProvider?.name}</strong> ({currentMainProvider?.model})
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
