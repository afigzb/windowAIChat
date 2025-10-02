import { useState } from 'react'
import type { AIConfig } from '../chat'
import { DEFAULT_SUMMARIZE_PROMPT } from '../chat/core/defaults'

interface SettingsPanelProps {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
  onRequestReset: () => void
}

export function SettingsPanel({ config, onConfigChange, onRequestReset }: SettingsPanelProps) {
  const [isSummarizeFocused, setIsSummarizeFocused] = useState(false)

  return (
    <div className="h-full bg-white border-l border-slate-300 flex flex-col">
      <div className="h-16 px-4 border-b border-slate-200 flex items-center">
        <h2 className="font-semibold text-slate-900">设置</h2>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              历史消息保留数量 ({config.historyLimit}条消息)
            </label>
            <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="range"
                min={4}
                max={80}
                step={2}
                value={config.historyLimit}
                onChange={(e) => onConfigChange({ ...config, historyLimit: parseInt(e.target.value, 10) })}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>4条</span>
                <span>40条 推荐</span>
                <span>80条</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">为节约 tokens，只保留最近的消息发送给 AI</div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={config.enableCompression ?? false}
                onChange={(e) => onConfigChange({ ...config, enableCompression: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  启用文本压缩
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  自动压缩发送内容中的多余空白和换行，减少 tokens 消耗
                </p>
              </div>
            </label>
          </div>

          <div className={`space-y-3 p-4 rounded-xl transition-all duration-200 ${
            isSummarizeFocused 
              ? 'bg-indigo-50/50 border-2 border-indigo-300 shadow-sm' 
              : 'border-2 border-transparent'
          }`}>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                概括功能提示词
              </label>
              <button
                onClick={() => onConfigChange({ ...config, summarizePrompt: DEFAULT_SUMMARIZE_PROMPT })}
                className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                恢复默认
              </button>
            </div>
            <textarea
              value={config.summarizePrompt || DEFAULT_SUMMARIZE_PROMPT}
              onChange={(e) => onConfigChange({ ...config, summarizePrompt: e.target.value })}
              onFocus={() => setIsSummarizeFocused(true)}
              onBlur={() => setIsSummarizeFocused(false)}
              className="w-full h-40 px-3 py-2 bg-white border border-slate-300 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="输入自定义的概括提示词..."
            />
            <div className="text-xs text-gray-500">自定义概括按钮使用的提示词，用于总结对话历史和文件内容</div>
          </div>

          <div>
            <button
              onClick={onRequestReset}
              className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-slate-50 transition-colors text-slate-700"
            >
              重置API为默认设置
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

