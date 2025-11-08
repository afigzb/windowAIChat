import { useState, useEffect } from 'react'
import type { AIConfig } from '../chat'
import { Tooltip } from '../components'
import { DEFAULT_FILE_SUMMARY_PROMPT } from '../chat/agents/preprocessor/file-processor'
import { DEFAULT_CONTEXT_SUMMARY_PROMPT } from '../chat/agents/preprocessor/context-processor'

interface AgentsPageProps {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
}

interface ProcessorConfigSectionProps {
  title: string
  tooltip: string
  enabled: boolean
  providerId: string
  prompt: string
  defaultPrompt: string
  providers: AIConfig['providers']
  currentProviderId: string
  onToggle: (enabled: boolean) => void
  onProviderChange: (providerId: string) => void
  onPromptChange: (prompt: string) => void
  onPromptReset: () => void
  onSave: () => void
}

/**
 * 处理器配置区块组件（文件/上下文共用）
 */
function ProcessorConfigSection({
  title,
  tooltip,
  enabled,
  providerId,
  prompt,
  defaultPrompt,
  providers,
  currentProviderId,
  onToggle,
  onProviderChange,
  onPromptChange,
  onPromptReset,
  onSave
}: ProcessorConfigSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-medium text-gray-900">{title}</h2>
          <Tooltip content={tooltip} />
        </div>
        <ToggleSwitch checked={enabled} onChange={onToggle} />
      </div>

      {enabled && (
        <>
          {/* 模型选择 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">使用模型</label>
            <select
              value={providerId}
              onChange={(e) => onProviderChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} ({provider.model})
                </option>
              ))}
            </select>
            {providerId === currentProviderId && (
              <p className="text-xs text-gray-500">使用主对话模型</p>
            )}
          </div>

          {/* 系统提示词 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">系统提示词</label>
              {prompt && (
                <button
                  onClick={onPromptReset}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  恢复默认
                </button>
              )}
            </div>
            <textarea
              value={prompt || defaultPrompt}
              onChange={(e) => onPromptChange(e.target.value)}
              onBlur={onSave}
              placeholder="自定义系统提示词"
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono resize-none bg-white"
            />
            <p className="text-xs text-gray-500">
              {prompt 
                ? '使用自定义提示词。点击"恢复默认"可清空并使用默认提示词。' 
                : '当前显示默认提示词。可直接编辑修改，点击"恢复默认"可清空自定义内容。'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * 开关组件
 */
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  )
}

/**
 * Agent 系统配置页面
 */
export function AgentsPage({ config, onConfigChange }: AgentsPageProps) {
  const [agentEnabled, setAgentEnabled] = useState(config.agentConfig?.enabled ?? false)
  
  // 文件概括配置
  const [fileProcessorEnabled, setFileProcessorEnabled] = useState(
    config.agentConfig?.preprocessor?.fileProcessor?.enabled ?? false
  )
  const [fileProviderId, setFileProviderId] = useState(
    config.agentConfig?.preprocessor?.fileProcessor?.providerId || config.currentProviderId
  )
  const [filePrompt, setFilePrompt] = useState(
    config.agentConfig?.preprocessor?.fileProcessor?.systemPrompt || ''
  )

  // 上下文概括配置
  const [contextProcessorEnabled, setContextProcessorEnabled] = useState(
    config.agentConfig?.preprocessor?.contextProcessor?.enabled ?? true
  )
  const [contextProviderId, setContextProviderId] = useState(
    config.agentConfig?.preprocessor?.contextProcessor?.providerId || config.currentProviderId
  )
  const [contextPrompt, setContextPrompt] = useState(
    config.agentConfig?.preprocessor?.contextProcessor?.systemPrompt || ''
  )

  // 同步配置变化
  useEffect(() => {
    setAgentEnabled(config.agentConfig?.enabled ?? false)
    setFileProcessorEnabled(config.agentConfig?.preprocessor?.fileProcessor?.enabled ?? false)
    setContextProcessorEnabled(config.agentConfig?.preprocessor?.contextProcessor?.enabled ?? true)
    setFileProviderId(config.agentConfig?.preprocessor?.fileProcessor?.providerId || config.currentProviderId)
    setFilePrompt(config.agentConfig?.preprocessor?.fileProcessor?.systemPrompt || '')
    setContextProviderId(config.agentConfig?.preprocessor?.contextProcessor?.providerId || config.currentProviderId)
    setContextPrompt(config.agentConfig?.preprocessor?.contextProcessor?.systemPrompt || '')
  }, [
    config.agentConfig?.enabled,
    config.agentConfig?.preprocessor?.fileProcessor?.enabled,
    config.agentConfig?.preprocessor?.fileProcessor?.providerId,
    config.agentConfig?.preprocessor?.fileProcessor?.systemPrompt,
    config.agentConfig?.preprocessor?.contextProcessor?.enabled,
    config.agentConfig?.preprocessor?.contextProcessor?.providerId,
    config.agentConfig?.preprocessor?.contextProcessor?.systemPrompt,
    config.currentProviderId
  ])

  // 更新配置的通用函数
  const updateConfig = (updates: {
    agentEnabled?: boolean
    fileProcessor?: { enabled?: boolean; providerId?: string; systemPrompt?: string }
    contextProcessor?: { enabled?: boolean; providerId?: string; systemPrompt?: string }
  }) => {
    onConfigChange({
      ...config,
      agentConfig: {
        ...config.agentConfig,
        enabled: updates.agentEnabled ?? agentEnabled,
        preprocessor: {
          ...config.agentConfig?.preprocessor,
          fileProcessor: {
            enabled: updates.fileProcessor?.enabled ?? fileProcessorEnabled,
            providerId: updates.fileProcessor?.providerId ?? fileProviderId,
            systemPrompt: (updates.fileProcessor?.systemPrompt ?? filePrompt).trim() || undefined
          },
          contextProcessor: {
            enabled: updates.contextProcessor?.enabled ?? contextProcessorEnabled,
            providerId: updates.contextProcessor?.providerId ?? contextProviderId,
            systemPrompt: (updates.contextProcessor?.systemPrompt ?? contextPrompt).trim() || undefined
          }
        }
      }
    })
  }

  // 处理器配置变更处理函数
  const createProcessorHandlers = (type: 'file' | 'context') => {
    const isFile = type === 'file'
    const enabled = isFile ? fileProcessorEnabled : contextProcessorEnabled
    const providerId = isFile ? fileProviderId : contextProviderId
    const prompt = isFile ? filePrompt : contextPrompt

    return {
      onToggle: (newEnabled: boolean) => {
        if (isFile) {
          setFileProcessorEnabled(newEnabled)
        } else {
          setContextProcessorEnabled(newEnabled)
        }
        updateConfig({
          [isFile ? 'fileProcessor' : 'contextProcessor']: {
            enabled: newEnabled,
            providerId,
            systemPrompt: prompt
          }
        })
      },
      onProviderChange: (newProviderId: string) => {
        if (isFile) {
          setFileProviderId(newProviderId)
        } else {
          setContextProviderId(newProviderId)
        }
        updateConfig({
          [isFile ? 'fileProcessor' : 'contextProcessor']: {
            enabled,
            providerId: newProviderId,
            systemPrompt: prompt
          }
        })
      },
      onPromptChange: (newPrompt: string) => {
        if (isFile) {
          setFilePrompt(newPrompt)
        } else {
          setContextPrompt(newPrompt)
        }
      },
      onPromptReset: () => {
        if (isFile) {
          setFilePrompt('')
        } else {
          setContextPrompt('')
        }
        setTimeout(() => {
          updateConfig({
            [isFile ? 'fileProcessor' : 'contextProcessor']: {
              enabled,
              providerId,
              systemPrompt: ''
            }
          })
        }, 0)
      },
      onSave: () => {
        updateConfig({
          [isFile ? 'fileProcessor' : 'contextProcessor']: {
            enabled,
            providerId,
            systemPrompt: prompt
          }
        })
      }
    }
  }

  const fileHandlers = createProcessorHandlers('file')
  const contextHandlers = createProcessorHandlers('context')

  const currentMainProvider = config.providers.find(p => p.id === config.currentProviderId)

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            预处理配置
          </h1>
          <p className="text-sm text-gray-600">
            在发送给 AI 前自动优化输入内容，减少 token 消耗并提升响应质量
          </p>
        </div>

        {/* 预处理总开关 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-medium text-gray-900">启用预处理</h2>
              <Tooltip content="开启后，在发送请求前自动优化文件和对话历史，减少不必要的 token 消耗" />
            </div>
            <ToggleSwitch 
              checked={agentEnabled} 
              onChange={(enabled) => updateConfig({ agentEnabled: enabled })} 
            />
          </div>
        </div>

        {/* 预处理配置 */}
        {agentEnabled && (
          <>
            <ProcessorConfigSection
              title="文件内容优化"
              tooltip="对长文件（>1000字符）进行压缩，概括后会生成gaikuo文件夹，在概括文件夹中会用对应的（名字+后缀+.gaikuo）文件来存储概括内容，需要手动清理或修改。"
              enabled={fileProcessorEnabled}
              providerId={fileProviderId}
              prompt={filePrompt}
              defaultPrompt={DEFAULT_FILE_SUMMARY_PROMPT}
              providers={config.providers}
              currentProviderId={config.currentProviderId}
              {...fileHandlers}
            />

            <ProcessorConfigSection
              title="对话历史优化"
              tooltip="采用滑动窗口策略：保留最近8条消息 → 超过8条时保留最新4条 → 将较早消息压缩为1条概括 → 首次概括需等待完成，后续概括在后台执行，当被概括区域被用户修改后，会重新生成新的概括"
              enabled={contextProcessorEnabled}
              providerId={contextProviderId}
              prompt={contextPrompt}
              defaultPrompt={DEFAULT_CONTEXT_SUMMARY_PROMPT}
              providers={config.providers}
              currentProviderId={config.currentProviderId}
              {...contextHandlers}
            />

            {/* 最终生成说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">主模型生成</p>
                  <p className="text-sm text-blue-700">
                    预处理可使用不同模型进行优化，但最终回答始终由主对话模型生成：<strong>{currentMainProvider?.name}</strong> ({currentMainProvider?.model})
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
