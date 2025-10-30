/**
 * Agents 配置页面（占位符）
 * 暂时不需要，待后续完善
 */

import type { AIConfig } from '../chat'

interface AgentsPageProps {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
}

export function AgentsPage({ config, onConfigChange }: AgentsPageProps) {
  return (
    <div className="flex flex-col h-full items-center justify-center text-gray-500">
      <div className="text-center">
        <div className="text-6xl mb-4">🤖</div>
        <h2 className="text-xl font-semibold mb-2">Agents 配置</h2>
        <p className="text-sm">该功能正在开发中...</p>
      </div>
    </div>
  )
}

