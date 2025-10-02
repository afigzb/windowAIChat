import type { AIConfig } from '../types'
import { ApiProviderManager } from './ApiProviderConfig'

interface ApiConfigPanelProps {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
}

export function ApiConfigPanel({ config, onConfigChange }: ApiConfigPanelProps) {
  return (
    <div className="h-full bg-white border-l border-slate-300 flex flex-col">
      <div className="h-16 px-4 border-b border-slate-200 flex items-center">
        <h2 className="font-semibold text-slate-900">API 配置</h2>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <ApiProviderManager config={config} onConfigChange={onConfigChange} />
      </div>
    </div>
  )
}

