/**
 * Agent Pipeline 默认配置
 * 
 * 仅包含配置常量，不包含业务逻辑
 */

import type { 
  AgentPipelineConfig, 
  AgentTaskConfig
} from './types'

// 默认系统提示词
export const DEFAULT_SHOULD_OPTIMIZE_SYSTEM_PROMPT = `你是一个专业的文本质量评估助手。你的任务是判断用户输入是否需要优化。

判断标准：
1. 存在明显的语法错误、错别字 → 需要优化
2. 表达不清晰、逻辑混乱 → 需要优化
3. 句子过于简短 → 需要优化
4. 输入已经清晰、准确、完整 → 无需优化
5. 用户输入内容过长，存在文章风格 → 无需优化
6. 用户输入内容过于凌乱，无法明白用户语义和意图 → 无需优化

请严格按照以下格式返回你的判断结果：
- 如果需要优化，返回：<是/>
- 如果不需要优化，返回：<否/>

只返回这个标签，不要添加任何其他内容。`

export const DEFAULT_OPTIMIZE_SYSTEM_PROMPT = `你是一个专业的文本优化助手。你的任务是优化用户输入，使其更清晰、准确、易于理解。

优化原则：
1. 保持原意不变
2. 修正明显的语法错误或错别字
3. 使表达更简洁明了
4. 补充必要的上下文信息

请直接输出优化后的文本，不要添加任何解释或说明。`

/**
 * 默认任务配置
 */
export const DEFAULT_SHOULD_OPTIMIZE_CONFIG: AgentTaskConfig = {
  type: 'should-optimize',
  name: '判断是否优化',
  enabled: true,
  description: '使用 AI 判断用户输入是否需要优化',
  systemPrompt: DEFAULT_SHOULD_OPTIMIZE_SYSTEM_PROMPT
}

export const DEFAULT_OPTIMIZE_INPUT_CONFIG: AgentTaskConfig = {
  type: 'optimize-input',
  name: '输入优化',
  enabled: true,
  description: '使用 AI 优化用户输入，修正语法错误并使表达更清晰',
  systemPrompt: DEFAULT_OPTIMIZE_SYSTEM_PROMPT
}

/**
 * 默认 Pipeline 配置
 */
export const DEFAULT_AGENT_CONFIG: AgentPipelineConfig = {
  enabled: false,
  workflowName: 'default-optimize'
}

