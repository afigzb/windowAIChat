/**
 * Agents 配置页面
 * 配置Agent执行模式和参数
 */

import { useState } from 'react'
import type { AIConfig } from '../chat'
import type { AgentPipelineConfig } from '../chat/agents'

interface AgentsPageProps {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
}

export function AgentsPage({ config, onConfigChange }: AgentsPageProps) {
  const agentConfig = config.agentConfig || { enabled: false }
  
  const [localConfig, setLocalConfig] = useState<AgentPipelineConfig>({
    enabled: agentConfig.enabled,
    mode: agentConfig.mode || 'static',
    maxSteps: agentConfig.maxSteps || 10,
    workflowName: agentConfig.workflowName || 'default-optimize',
    customSystemPrompt: agentConfig.customSystemPrompt || ''
  })
  
  const handleSave = () => {
    console.log('[AgentsPage] 保存配置:', localConfig)
    onConfigChange({
      ...config,
      agentConfig: localConfig
    })
    alert(`配置已保存！\n当前模式: ${localConfig.mode === 'dynamic' ? '🧠 动态Agent' : '📋 静态工作流'}`)
  }
  
  const handleReset = () => {
    setLocalConfig({
      enabled: false,
      mode: 'static',
      maxSteps: 10,
      workflowName: 'default-optimize',
      customSystemPrompt: ''
    })
  }
  
  return (
    <div className="flex flex-col h-full overflow-auto bg-gray-50">
      <div className="max-w-4xl mx-auto w-full p-6">
        {/* 头部 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">🤖 Agents 系统配置</h1>
          <p className="text-sm text-gray-600">
            配置智能Agent的执行模式和行为参数
          </p>
          {/* 当前状态提示 */}
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style={{ 
              backgroundColor: localConfig.enabled ? (localConfig.mode === 'dynamic' ? '#dbeafe' : '#f3f4f6') : '#fef3c7',
              color: localConfig.enabled ? (localConfig.mode === 'dynamic' ? '#1e40af' : '#374151') : '#92400e'
            }}>
            {localConfig.enabled 
              ? (localConfig.mode === 'dynamic' ? '🧠 动态Agent模式' : '📋 静态工作流模式')
              : '⚠️ Agent已禁用'}
          </div>
        </div>
        
        {/* 配置面板 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          
          {/* 启用开关 */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">启用 Agent 系统</h3>
              <p className="text-sm text-gray-600 mt-1">
                开启后，系统将使用Agent处理用户请求
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={localConfig.enabled}
                onChange={(e) => setLocalConfig({ ...localConfig, enabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          {localConfig.enabled && (
            <>
              {/* 执行模式选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  执行模式
                </label>
                <div className="space-y-3">
                  {/* 静态模式 */}
                  <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ borderColor: localConfig.mode === 'static' ? '#3b82f6' : '#e5e7eb' }}>
                    <input
                      type="radio"
                      name="mode"
                      value="static"
                      checked={localConfig.mode === 'static'}
                      onChange={(e) => setLocalConfig({ ...localConfig, mode: 'static' })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">📋 静态工作流</div>
                      <div className="text-sm text-gray-600 mt-1">
                        使用预定义的任务流程，按顺序执行固定步骤
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        ✓ 执行可预测 ✓ Token消耗低 ✓ 适合固定流程
                      </div>
                    </div>
                  </label>
                  
                  {/* 动态模式 */}
                  <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ borderColor: localConfig.mode === 'dynamic' ? '#3b82f6' : '#e5e7eb' }}>
                    <input
                      type="radio"
                      name="mode"
                      value="dynamic"
                      checked={localConfig.mode === 'dynamic'}
                      onChange={(e) => setLocalConfig({ ...localConfig, mode: 'dynamic' })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">🧠 动态Agent ⭐️</div>
                      <div className="text-sm text-gray-600 mt-1">
                        AI自主思考、调用工具、根据结果动态决策（类似AutoGPT）
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        ✓ 智能化 ✓ 自适应 ✓ 适合复杂任务
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* 动态模式专属配置 */}
              {localConfig.mode === 'dynamic' && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-gray-900 text-sm">动态Agent 参数</h4>
                  
                  {/* 最大步数 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最大执行步数: {localConfig.maxSteps}
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="20"
                      value={localConfig.maxSteps}
                      onChange={(e) => setLocalConfig({ ...localConfig, maxSteps: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>简单任务 (3-5步)</span>
                      <span>中等任务 (6-10步)</span>
                      <span>复杂任务 (11-20步)</span>
                    </div>
                  </div>
                  
                  {/* 自定义系统提示词 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      自定义系统提示词 (可选)
                    </label>
                    <textarea
                      value={localConfig.customSystemPrompt}
                      onChange={(e) => setLocalConfig({ ...localConfig, customSystemPrompt: e.target.value })}
                      placeholder="例如: 你是一个专业的数据分析助手，擅长从复杂数据中提取关键信息..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      留空则使用默认提示词。可以定制Agent的角色和行为特征。
                    </p>
                  </div>
                </div>
              )}
              
              {/* 静态模式专属配置 */}
              {localConfig.mode === 'static' && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    工作流名称
                  </label>
                  <select
                    value={localConfig.workflowName}
                    onChange={(e) => setLocalConfig({ ...localConfig, workflowName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="default-optimize">默认优化流程</option>
                    <option value="simple-generate">简单生成（无预处理）</option>
                  </select>
                </div>
              )}
              
              {/* 可用工具列表 */}
              {localConfig.mode === 'dynamic' && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 text-sm mb-3">
                    可用工具 (Agent可自主调用)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">⚖️</span>
                      <span>判断工具 - 是非判断、分类</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">✨</span>
                      <span>转换工具 - 优化、总结</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">🔍</span>
                      <span>分析工具 - 深度推理</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">📚</span>
                      <span>知识查询 - 提取信息</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">🎯</span>
                      <span>更新目标 - 优化任务</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">✅</span>
                      <span>完成工具 - 生成答案</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* 按钮组 */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            重置为默认
          </button>
          
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            保存配置
          </button>
        </div>
        
        {/* 提示信息 */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <span className="text-yellow-600 mr-2">💡</span>
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">使用建议</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>简单问答</strong>：可关闭Agent或使用静态模式</li>
                <li>• <strong>文档分析</strong>：推荐使用动态Agent，设置8-12步</li>
                <li>• <strong>复杂任务</strong>：使用动态Agent，设置12-20步</li>
                <li>• <strong>首次使用</strong>：建议从静态模式开始，熟悉后再尝试动态模式</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

