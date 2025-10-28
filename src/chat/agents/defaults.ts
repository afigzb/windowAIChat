/**
 * Agent Pipeline 默认配置
 * 
 * 仅包含配置常量，不包含业务逻辑
 */

import type { 
  AgentPipelineConfig, 
  AgentTaskConfig,
  AgentTaskType
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

export const DEFAULT_GENERATE_STRUCTURE_SYSTEM_PROMPT = `你是一个专业的文章结构设计助手。你的任务是根据用户输入、附加文件内容和上下文，生成一个清晰的文章结构大纲。

设计原则：
1. 根据内容的长度和复杂度，合理划分章节、小节
2. 结构应该清晰、有逻辑性，符合文章写作规范
3. 可以是单章结构，也可以是多卷、多章结构
4. 每个章节应该有明确的主题和内容要点
5. 结构应该能够指导后续的内容生成

输出格式要求：
- 使用 <内容/> 标签包裹整个结构
- 采用层级结构，如：第一章、第一节、第二节等
- 每个节点包含标题和内容要点

示例输出：
<内容/>
第一章 引言
- 背景介绍
- 研究目的和意义

第二章 理论基础
- 相关概念
- 理论框架

第三章 主要内容
- 第一节：核心观点
- 第二节：详细分析

第四章 结论
- 总结要点
- 未来展望
</内容/>

请根据提供的信息生成合适的文章结构。`

export const DEFAULT_MAIN_GENERATION_SYSTEM_PROMPT = ''  // 主模型使用全局系统提示词，不需要特殊的任务级提示词

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

export const DEFAULT_GENERATE_STRUCTURE_CONFIG: AgentTaskConfig = {
  type: 'generate-structure',
  name: '文章结构',
  enabled: true,
  description: '根据输入、文件和上下文生成文章结构大纲',
  systemPrompt: DEFAULT_GENERATE_STRUCTURE_SYSTEM_PROMPT
}

export const DEFAULT_MAIN_GENERATION_CONFIG: AgentTaskConfig = {
  type: 'main-generation',
  name: '主模型生成',
  enabled: true,
  description: '调用主 AI 模型生成最终回复',
  systemPrompt: DEFAULT_MAIN_GENERATION_SYSTEM_PROMPT
}

/**
 * 任务元数据 - 用于 UI 显示和配置
 */
export const AGENT_TASK_METADATA: Record<string, {
  name: string
  description: string
  defaultPrompt: string
  dependencies: AgentTaskType[]
  defaultConfig: AgentTaskConfig
}> = {
  'should-optimize': {
    name: '判断是否优化',
    description: '使用 AI 判断用户输入是否需要优化',
    defaultPrompt: DEFAULT_SHOULD_OPTIMIZE_SYSTEM_PROMPT,
    dependencies: ['optimize-input'], // 依赖优化任务
    defaultConfig: DEFAULT_SHOULD_OPTIMIZE_CONFIG
  },
  'optimize-input': {
    name: '输入优化',
    description: '使用 AI 优化用户输入，修正语法错误并使表达更清晰',
    defaultPrompt: DEFAULT_OPTIMIZE_SYSTEM_PROMPT,
    dependencies: [],
    defaultConfig: DEFAULT_OPTIMIZE_INPUT_CONFIG
  },
  'generate-structure': {
    name: '文章结构',
    description: '根据输入、文件和上下文生成文章结构大纲',
    defaultPrompt: DEFAULT_GENERATE_STRUCTURE_SYSTEM_PROMPT,
    dependencies: [],
    defaultConfig: DEFAULT_GENERATE_STRUCTURE_CONFIG
  },
  'main-generation': {
    name: '主模型生成',
    description: '调用主 AI 模型生成最终回复，支持流式输出',
    defaultPrompt: DEFAULT_MAIN_GENERATION_SYSTEM_PROMPT,
    dependencies: [], // 不依赖任何任务，可以独立运行
    defaultConfig: DEFAULT_MAIN_GENERATION_CONFIG
  }
}

/**
 * 默认任务配置列表（按执行顺序）
 */
export const DEFAULT_TASK_CONFIGS: AgentTaskConfig[] = [
  DEFAULT_SHOULD_OPTIMIZE_CONFIG,
  DEFAULT_OPTIMIZE_INPUT_CONFIG,
  DEFAULT_GENERATE_STRUCTURE_CONFIG,
  DEFAULT_MAIN_GENERATION_CONFIG
]

/**
 * 默认 Pipeline 配置
 */
export const DEFAULT_AGENT_CONFIG: AgentPipelineConfig = {
  enabled: false,
  workflowName: 'default-optimize'
}

