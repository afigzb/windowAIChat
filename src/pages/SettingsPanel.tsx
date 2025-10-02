import type { AIConfig } from '../chat'

interface SettingsPanelProps {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
  onRequestReset: () => void
}

export function SettingsPanel({ config, onConfigChange, onRequestReset }: SettingsPanelProps) {
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

