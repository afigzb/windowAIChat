/**
 * Agent Pipeline 默认配置
 */

import type { AgentPipelineConfig } from './types'

export const DEFAULT_AGENT_CONFIG: AgentPipelineConfig = {
  enabled: false,
  steps: [
    {
      type: 'should-optimize',
      enabled: true,
      name: '判断是否优化',
      description: '使用 AI 判断用户输入是否需要优化',
    },
    {
      type: 'optimize-input',
      enabled: true,
      name: '输入优化',
      description: '使用 AI 优化用户输入，修正语法错误并使表达更清晰',
    }
  ],
  options: {
    continueOnError: true,
    timeout: 30000
  }
}

