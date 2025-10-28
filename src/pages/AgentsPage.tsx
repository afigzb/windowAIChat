import { useState } from 'react'
import type { AIConfig } from '../chat/types'
import type { AgentStepConfig, AgentStepType } from '../chat/agents/types'
import { 
  DEFAULT_OPTIMIZE_SYSTEM_PROMPT,
  DEFAULT_SHOULD_OPTIMIZE_SYSTEM_PROMPT 
} from '../chat/agents/defaults'
import { useConfirm, ConfirmDialog } from '../components'
import { CustomSelect, type SelectOption } from '../chat/ui/components'

interface AgentsPageProps {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
}

// Agent 步骤元数据
const AGENT_STEP_METADATA: Record<string, {
  name: string
  description: string
  defaultPrompt: string
  dependencies: AgentStepType[]
}> = {
  'should-optimize': {
    name: '判断是否优化',
    description: '使用 AI 判断用户输入是否需要优化',
    defaultPrompt: DEFAULT_SHOULD_OPTIMIZE_SYSTEM_PROMPT,
    dependencies: ['optimize-input'] // 依赖优化agent
  },
  'optimize-input': {
    name: '输入优化',
    description: '使用 AI 优化用户输入，修正语法错误并使表达更清晰',
    defaultPrompt: DEFAULT_OPTIMIZE_SYSTEM_PROMPT,
    dependencies: []
  }
}

export function AgentsPage({ config, onConfigChange }: AgentsPageProps) {
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null)
  const [editingPrompt, setEditingPrompt] = useState<string>('')
  const { confirm, confirmProps } = useConfirm()

  const agentConfig = config.agentConfig || { enabled: false, steps: [] }

  const handleToggleAgent = (enabled: boolean) => {
    let steps = agentConfig.steps
    
    if (agentConfig.steps.length === 0) {
      // 初次启用，创建默认步骤（默认都禁用，让用户自己选择）
      steps = [
        {
          type: 'should-optimize',
          enabled: false,
          name: AGENT_STEP_METADATA['should-optimize'].name,
          description: AGENT_STEP_METADATA['should-optimize'].description,
          systemPrompt: AGENT_STEP_METADATA['should-optimize'].defaultPrompt
        },
        {
          type: 'optimize-input',
          enabled: false,
          name: AGENT_STEP_METADATA['optimize-input'].name,
          description: AGENT_STEP_METADATA['optimize-input'].description,
          systemPrompt: AGENT_STEP_METADATA['optimize-input'].defaultPrompt
        }
      ]
    }
    
    onConfigChange({
      ...config,
      agentConfig: {
        ...agentConfig,
        enabled,
        steps
      }
    })
  }

  const handleToggleStep = async (index: number, enabled: boolean) => {
    const newSteps = [...agentConfig.steps]
    const step = newSteps[index]
    
    if (!enabled) {
      // 如果要禁用某个agent，自动禁用所有依赖它的agent
      const stepType = step.type
      const dependentSteps: string[] = []
      
      newSteps.forEach((s, i) => {
        const metadata = AGENT_STEP_METADATA[s.type as keyof typeof AGENT_STEP_METADATA]
        if (s.enabled && metadata?.dependencies?.includes(stepType)) {
          newSteps[i] = { ...newSteps[i], enabled: false }
          dependentSteps.push(s.name)
        }
      })
      
      // 如果有依赖的agent被自动禁用，提示用户
      if (dependentSteps.length > 0) {
        const message = `禁用 "${step.name}" 后，以下依赖它的 Agent 也将被自动禁用：\n\n${dependentSteps.join('、')}`
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
    } else {
      // 如果要启用某个agent，检查并自动启用它的依赖
      const metadata = AGENT_STEP_METADATA[step.type as keyof typeof AGENT_STEP_METADATA]
      const dependencies = metadata?.dependencies || []
      const missingDeps: string[] = []
      
      dependencies.forEach(depType => {
        const depStepIndex = newSteps.findIndex(s => s.type === depType)
        if (depStepIndex !== -1 && !newSteps[depStepIndex].enabled) {
          newSteps[depStepIndex] = { ...newSteps[depStepIndex], enabled: true }
          missingDeps.push(newSteps[depStepIndex].name)
        }
      })
      
      // 如果有依赖被自动启用，提示用户
      if (missingDeps.length > 0) {
        const message = `启用 "${step.name}" 需要以下依赖 Agent，它们将被自动启用：\n\n${missingDeps.join('、')}`
        await confirm({
          title: '自动启用依赖',
          message,
          confirmText: '知道了',
          cancelText: '',
          type: 'info'
        })
      }
    }
    
    newSteps[index] = { ...newSteps[index], enabled }
    
    // 检查是否所有agent都被禁用了
    const anyEnabled = newSteps.some(s => s.enabled)
    
    onConfigChange({
      ...config,
      agentConfig: {
        ...agentConfig,
        enabled: anyEnabled, // 如果没有启用的agent，自动禁用系统
        steps: newSteps
      }
    })
  }

  const handleChangeApiProvider = (index: number, apiProviderId: string) => {
    const newSteps = [...agentConfig.steps]
    newSteps[index] = { 
      ...newSteps[index], 
      apiProviderId: apiProviderId || undefined 
    }
    onConfigChange({
      ...config,
      agentConfig: {
        ...agentConfig,
        steps: newSteps
      }
    })
  }

  const handleStartEditPrompt = (index: number) => {
    const step = agentConfig.steps[index]
    const metadata = AGENT_STEP_METADATA[step.type as keyof typeof AGENT_STEP_METADATA]
    setEditingStepIndex(index)
    setEditingPrompt(step.systemPrompt || metadata?.defaultPrompt || '')
  }

  const handleSavePrompt = () => {
    if (editingStepIndex === null) return
    
    const newSteps = [...agentConfig.steps]
    newSteps[editingStepIndex] = {
      ...newSteps[editingStepIndex],
      systemPrompt: editingPrompt
    }
    onConfigChange({
      ...config,
      agentConfig: {
        ...agentConfig,
        steps: newSteps
      }
    })
    setEditingStepIndex(null)
    setEditingPrompt('')
  }

  const handleResetPrompt = () => {
    if (editingStepIndex === null) return
    
    const step = agentConfig.steps[editingStepIndex]
    const metadata = AGENT_STEP_METADATA[step.type as keyof typeof AGENT_STEP_METADATA]
    setEditingPrompt(metadata?.defaultPrompt || '')
  }

  const handleCancelEdit = () => {
    setEditingStepIndex(null)
    setEditingPrompt('')
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
          {agentConfig.steps.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-slate-700">暂无 Agent 配置</h3>
                <p className="mt-2 text-sm text-slate-500">启用 Agent 系统以创建智能预处理步骤</p>
              </div>
            </div>
          ) : (
            /* Agent Steps List - 包含式结构 */
            <div className="space-y-4">
              {agentConfig.steps.map((step, index) => {
                const metadata = AGENT_STEP_METADATA[step.type as keyof typeof AGENT_STEP_METADATA]
                const isEditing = editingStepIndex === index
                
                // 检查是否有其他agent依赖当前agent
                const dependentSteps = agentConfig.steps.filter((s, i) => {
                  const sMeta = AGENT_STEP_METADATA[s.type as keyof typeof AGENT_STEP_METADATA]
                  return sMeta?.dependencies?.includes(step.type)
                })
                
                // 检查依赖关系
                const dependencies = metadata?.dependencies || []
                const missingDependencies = dependencies.filter(depType => {
                  const depStep = agentConfig.steps.find(s => s.type === depType)
                  return !depStep || !depStep.enabled
                })
                
                // 如果这个agent被其他agent依赖，说明它是父级，不需要单独渲染
                const isParent = dependentSteps.length > 0
                // 如果这个agent依赖其他agent，它会在父级内部渲染
                const hasParent = dependencies.length > 0

                // 只渲染父级agent，子agent会在父级内部渲染
                if (hasParent) return null

                const renderAgentCard = (agentStep: AgentStepConfig, agentIndex: number, isChild = false) => {
                  const agentMetadata = AGENT_STEP_METADATA[agentStep.type as keyof typeof AGENT_STEP_METADATA]
                  const isAgentEditing = editingStepIndex === agentIndex
                  
                  return (
                    <div 
                      key={agentIndex} 
                      className={`bg-white rounded-lg border shadow-sm ${
                        isChild ? 'border-slate-300' : 'border-slate-200'
                      }`}
                    >
                      {/* Step Header */}
                      <div className={`p-5 border-b ${isChild ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <input
                              type="checkbox"
                              checked={agentStep.enabled}
                              onChange={(e) => handleToggleStep(agentIndex, e.target.checked)}
                              className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {isChild && (
                                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                )}
                                <h3 className={`font-semibold text-slate-800 ${isChild ? 'text-base' : 'text-lg'}`}>
                                  {agentStep.name}
                                </h3>
                                {!agentStep.enabled && (
                                  <span className="px-2 py-0.5 text-xs font-medium text-slate-500 bg-slate-100 rounded">
                                    已禁用
                                  </span>
                                )}
                              </div>
                              {agentStep.description && (
                                <p className="text-sm text-slate-500 mt-1">{agentStep.description}</p>
                              )}
                              {isChild && (
                                <p className="text-xs text-blue-600 mt-1.5">
                                  📋 依赖功能 - 依赖于父级 Agent
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step Configuration */}
                      <div className="p-5 space-y-4 bg-slate-50">
                        {/* API Provider Selection */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            使用的 API
                          </label>
                          <CustomSelect
                            value={agentStep.apiProviderId || ''}
                            onChange={(value) => handleChangeApiProvider(agentIndex, value)}
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
                        </div>

                        {/* System Prompt */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-700">
                              系统提示词
                            </label>
                            {!isAgentEditing && (
                              <button
                                onClick={() => handleStartEditPrompt(agentIndex)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                编辑
                              </button>
                            )}
                          </div>
                          
                          {isAgentEditing ? (
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
{agentStep.systemPrompt || agentMetadata?.defaultPrompt || '未设置提示词'}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={index}>
                    {/* 渲染父级 Agent */}
                    {renderAgentCard(step, index, false)}
                    
                    {/* 渲染依赖此 Agent 的子 Agent */}
                    {isParent && dependentSteps.length > 0 && (
                      <div className="ml-8 mt-3 space-y-3 pl-6 border-l-2 border-blue-200">
                        {dependentSteps.map(childStep => {
                          const childIndex = agentConfig.steps.findIndex(s => s.type === childStep.type)
                          return renderAgentCard(childStep, childIndex, true)
                        })}
                      </div>
                    )}
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

