import { useState } from 'react'
import type { AIConfig } from '../chat/types'
import type { AgentTaskConfig } from '../chat/agents/types'
import { 
  AGENT_TASK_METADATA,
  DEFAULT_TASK_CONFIGS
} from '../chat/agents/defaults'
import { useConfirm, ConfirmDialog } from '../components'
import { CustomSelect, type SelectOption } from '../chat/ui/components'

interface AgentsPageProps {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
}

export function AgentsPage({ config, onConfigChange }: AgentsPageProps) {
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null)
  const [editingPrompt, setEditingPrompt] = useState<string>('')
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState<string>('')
  const { confirm, confirmProps } = useConfirm()

  // 兼容旧配置和新配置
  const agentConfig = config.agentConfig || { enabled: false, workflowName: 'default-optimize', options: {} }
  
  // 从 options 中获取任务配置
  const taskConfigs = (agentConfig.options?.taskConfigs as AgentTaskConfig[]) || []

  const handleToggleAgent = (enabled: boolean) => {
    let taskConfigs = (agentConfig.options?.taskConfigs as AgentTaskConfig[]) || []
    
    if (taskConfigs.length === 0) {
      // 初次启用，使用默认任务配置
      taskConfigs = DEFAULT_TASK_CONFIGS.map(config => ({ ...config }))
    }
    
    onConfigChange({
      ...config,
      agentConfig: {
        ...agentConfig,
        enabled,
        workflowName: 'default-optimize',
        options: {
          ...agentConfig.options,
          taskConfigs
        }
      }
    })
  }

  const handleToggleTask = async (index: number, enabled: boolean) => {
    const newTaskConfigs = [...taskConfigs]
    const task = newTaskConfigs[index]
    
    if (!enabled) {
      // 如果要禁用某个任务，检查是否有其他任务依赖它
      const taskType = task.type
      const dependentTasks: string[] = []
      
      newTaskConfigs.forEach((t, i) => {
        const metadata = AGENT_TASK_METADATA[t.type as keyof typeof AGENT_TASK_METADATA]
        if (t.enabled !== false && metadata?.dependencies?.includes(taskType)) {
          dependentTasks.push(t.name)
        }
      })
      
      // 如果有依赖的任务，提示用户
      if (dependentTasks.length > 0) {
        const message = `禁用 "${task.name}" 后，以下依赖它的任务可能无法正常工作：\n\n${dependentTasks.join('、')}\n\n是否继续？`
        const result = await confirm({
          title: '确认禁用',
          message,
          confirmText: '继续禁用',
          cancelText: '取消',
          type: 'warning'
        })
        if (!result) {
          return
        }
      }
    }
    
    // 更新任务的启用状态
    newTaskConfigs[index] = { ...newTaskConfigs[index], enabled }
    
    onConfigChange({
      ...config,
      agentConfig: {
        ...agentConfig,
        options: {
          ...agentConfig.options,
          taskConfigs: newTaskConfigs
        }
      }
    })
  }

  const handleChangeApiProvider = (index: number, apiProviderId: string) => {
    const newTaskConfigs = [...taskConfigs]
    newTaskConfigs[index] = { 
      ...newTaskConfigs[index], 
      apiProviderId: apiProviderId || undefined 
    }
    onConfigChange({
      ...config,
      agentConfig: {
        ...agentConfig,
        options: {
          ...agentConfig.options,
          taskConfigs: newTaskConfigs
        }
      }
    })
  }

  const handleStartEditPrompt = (index: number) => {
    const task = taskConfigs[index]
    setEditingStepIndex(index)
    // 优先使用任务自定义的提示词，否则尝试从元数据获取默认值，最后是空字符串
    const metadata = AGENT_TASK_METADATA[task.type as keyof typeof AGENT_TASK_METADATA]
    setEditingPrompt(task.systemPrompt || metadata?.defaultPrompt || '')
  }

  const handleSavePrompt = () => {
    if (editingStepIndex === null) return
    
    const newTaskConfigs = [...taskConfigs]
    newTaskConfigs[editingStepIndex] = {
      ...newTaskConfigs[editingStepIndex],
      systemPrompt: editingPrompt
    }
    onConfigChange({
      ...config,
      agentConfig: {
        ...agentConfig,
        options: {
          ...agentConfig.options,
          taskConfigs: newTaskConfigs
        }
      }
    })
    setEditingStepIndex(null)
    setEditingPrompt('')
  }

  const handleResetPrompt = () => {
    if (editingStepIndex === null) return
    
    const task = taskConfigs[editingStepIndex]
    const metadata = AGENT_TASK_METADATA[task.type as keyof typeof AGENT_TASK_METADATA]
    setEditingPrompt(metadata?.defaultPrompt || '')
  }

  const handleCancelEdit = () => {
    setEditingStepIndex(null)
    setEditingPrompt('')
  }

  const handleStartEditName = (index: number) => {
    const task = taskConfigs[index]
    setEditingNameIndex(index)
    setEditingName(task.name || task.type)
  }

  const handleSaveName = () => {
    if (editingNameIndex === null) return
    
    const newTaskConfigs = [...taskConfigs]
    newTaskConfigs[editingNameIndex] = {
      ...newTaskConfigs[editingNameIndex],
      name: editingName.trim() || newTaskConfigs[editingNameIndex].type
    }
    onConfigChange({
      ...config,
      agentConfig: {
        ...agentConfig,
        options: {
          ...agentConfig.options,
          taskConfigs: newTaskConfigs
        }
      }
    })
    setEditingNameIndex(null)
    setEditingName('')
  }

  const handleCancelEditName = () => {
    setEditingNameIndex(null)
    setEditingName('')
  }

  const handleResetToDefault = async () => {
    const result = await confirm({
      title: '恢复默认配置',
      message: `此操作将：\n\n1. 重置所有任务配置为默认值\n2. 清除所有自定义的提示词\n3. 重置任务启用状态\n\n当前的 ${taskConfigs.length} 个任务配置将被 ${DEFAULT_TASK_CONFIGS.length} 个默认任务替换。\n\n是否继续？`,
      confirmText: '恢复默认',
      cancelText: '取消',
      type: 'warning'
    })
    
    if (!result) {
      return
    }
    
    // 重置为默认配置
    onConfigChange({
      ...config,
      agentConfig: {
        ...agentConfig,
        options: {
          ...agentConfig.options,
          taskConfigs: DEFAULT_TASK_CONFIGS.map(config => ({ ...config }))
        }
      }
    })
  }


  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Agents 管理</h1>
            <p className="text-sm text-slate-500 mt-1">
              配置 AI Agent 步骤，在发送给主模型前对输入进行预处理
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {taskConfigs.length > 0 && (
              <button
                onClick={handleResetToDefault}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors flex items-center space-x-2"
                title="恢复到默认任务配置"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>恢复默认</span>
              </button>
            )}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agentConfig.enabled}
                onChange={(e) => handleToggleAgent(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">启用 Agent 系统</span>
            </label>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {taskConfigs.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-slate-700">暂无 Agent 配置</h3>
                <p className="mt-2 text-sm text-slate-500">启用 Agent 系统以创建智能预处理任务</p>
              </div>
            </div>
          ) : (
            /* Agent Tasks List */
            <div className="space-y-4">
              {taskConfigs.map((task, index) => {
                const isEditing = editingStepIndex === index
                const isEditingName = editingNameIndex === index
                // 显示名称：优先使用 task.name，否则使用 type
                const displayName = task.name || task.type
                
                return (
                  <div 
                    key={index} 
                    className="bg-white rounded-lg border border-slate-200 shadow-sm"
                  >
                    {/* Task Header */}
                    <div className="p-5 border-b bg-white border-slate-100">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <input
                            type="checkbox"
                            checked={task.enabled !== false}
                            onChange={(e) => handleToggleTask(index, e.target.checked)}
                            className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            {isEditingName ? (
                              /* 编辑名称模式 */
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveName()
                                    if (e.key === 'Escape') handleCancelEditName()
                                  }}
                                  className="flex-1 px-3 py-1.5 text-base font-semibold border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="输入任务名称"
                                  autoFocus
                                />
                                <button
                                  onClick={handleSaveName}
                                  className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={handleCancelEditName}
                                  className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              /* 显示名称模式 */
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-slate-800">
                                  {displayName}
                                </h3>
                                <button
                                  onClick={() => handleStartEditName(index)}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="编辑名称"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                {task.enabled === false && (
                                  <span className="px-2 py-0.5 text-xs font-medium text-slate-500 bg-slate-100 rounded">
                                    已禁用
                                  </span>
                                )}
                              </div>
                            )}
                            {!isEditingName && task.description && (
                              <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Task Configuration */}
                    <div className="p-5 space-y-4 bg-slate-50">
                      {/* API Provider Selection */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          使用的 API
                        </label>
                        <CustomSelect
                          value={task.apiProviderId || ''}
                          onChange={(value) => handleChangeApiProvider(index, value)}
                          options={[
                            { value: '', label: '使用当前主 API' },
                            ...config.providers.map(provider => ({
                              value: provider.id,
                              label: `${provider.name} (${provider.model})`
                            }))
                          ]}
                          className="w-full px-4 py-3 border-2 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-blue-200 bg-white"
                          placeholder="请选择 API"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                          💡 此任务将使用指定的 API，如果未指定则使用当前主 API
                        </p>
                      </div>

                      {/* System Prompt */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-slate-700">
                            系统提示词
                          </label>
                          {!isEditing && (
                            <button
                              onClick={() => handleStartEditPrompt(index)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              编辑
                            </button>
                          )}
                        </div>
                        
                        {isEditing ? (
                          <div className="space-y-3">
                            <textarea
                              value={editingPrompt}
                              onChange={(e) => setEditingPrompt(e.target.value)}
                              className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono resize-none"
                              rows={12}
                              placeholder="输入系统提示词..."
                            />
                            <div className="flex items-center justify-between">
                              <button
                                onClick={handleResetPrompt}
                                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                恢复默认
                              </button>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                  取消
                                </button>
                                <button
                                  onClick={handleSavePrompt}
                                  className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                >
                                  保存
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <pre className="w-full px-4 py-3 text-xs bg-white border border-slate-200 rounded-lg font-mono text-slate-700 overflow-auto max-h-40">
{task.systemPrompt || AGENT_TASK_METADATA[task.type as keyof typeof AGENT_TASK_METADATA]?.defaultPrompt || '未设置提示词'}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* 确认对话框 */}
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}

