/**
 * 工具配置系统
 * 
 * 通过配置定义工具，而不是通过代码类
 * 这样可以：
 * 1. 让 AI 更容易理解和使用工具
 * 2. 动态配置工具，无需修改代码
 * 3. 为 LLM 规划器提供标准化接口
 */

import type { AgentContext, AgentTaskType } from './types'

// ============================================================
// 系统提示词常量（单一数据源）
// ============================================================

export const SHOULD_OPTIMIZE_SYSTEM_PROMPT = `你是一个专业的文本质量评估助手。你的任务是判断用户输入是否需要优化。

判断标准：
1. 存在明显的语法错误、错别字 → 需要优化
2. 表达不清晰、逻辑混乱 → 需要优化
3. 句子过于简短 → 需要优化
4. 输入已经清晰、准确、完整 → 无需优化
5. 用户输入内容过长，存在文章风格 → 无需优化

请严格按照以下格式返回你的判断结果：
- 如果需要优化，返回：<是/>
- 如果不需要优化，返回：<否/>

只返回这个标签，不要添加任何其他内容。`

export const OPTIMIZE_INPUT_SYSTEM_PROMPT = `你是一个专业的文本优化助手。你的任务是优化用户输入，使其更清晰、准确、易于理解。

优化原则：
1. 保持原意不变
2. 修正明显的语法错误或错别字
3. 使表达更简洁明了
4. 补充必要的上下文信息

请直接输出优化后的文本，不要添加任何解释或说明。`

export const GENERATE_STRUCTURE_SYSTEM_PROMPT = `你是一个专业的文章结构设计助手。你的任务是根据用户输入、附加文件内容和上下文，生成一个清晰的文章结构大纲。

设计原则：
1. 根据内容的长度和复杂度，合理划分章节、小节
2. 结构应该清晰、有逻辑性，符合文章写作规范
3. 可以是单章结构，也可以是多卷、多章结构
4. 每个章节应该有明确的主题和内容要点

输出格式要求：
- 使用 <内容/> 标签包裹整个结构
- 采用层级结构，如：第一章、第一节、第二节等
- 每个节点包含标题和内容要点

请根据提供的信息生成合适的文章结构。`

// ============================================================
// 工具模板和配置类型
// ============================================================

/**
 * 工具模板类型
 */
export type ToolTemplate = 
  | 'judgment'      // 判断任务（返回 true/false）
  | 'simple-llm'    // 单次 LLM 调用
  | 'main-generation'  // 主模型生成

/**
 * 判断工具配置
 */
export interface JudgmentToolConfig {
  /** 工具 ID */
  id: string
  
  /** 显示名称 */
  name: string
  
  /** 模板类型 */
  template: 'judgment'
  
  /** 工具描述（供 LLM 理解）*/
  description: string
  
  /** 系统提示词 */
  systemPrompt: string
  
  /** 最小输入长度 */
  minInputLength?: number
  
  /** 输入过短时的默认判断 */
  shortInputDefault?: boolean
  
  /**
   * 解析 AI 响应，提取判断结果
   * 
   * @param response AI 的完整响应
   * @returns true/false 判断结果
   */
  parseJudgment: (response: string) => boolean
  
  /**
   * 提取判断原因（可选）
   */
  extractReason?: (response: string, result: boolean) => string
  
  /**
   * 结果处理器：根据判断结果更新上下文
   * 
   * @param result 判断结果
   * @param context 执行上下文
   */
  onResult?: (result: boolean, reason: string, context: AgentContext) => void
  
  /**
   * 执行条件（可选）
   * 返回 false 则跳过此工具
   */
  condition?: (context: AgentContext) => boolean
}

/**
 * 单次通信工具配置
 */
export interface SimpleLLMToolConfig {
  /** 工具 ID */
  id: string
  
  /** 显示名称 */
  name: string
  
  /** 模板类型 */
  template: 'simple-llm'
  
  /** 工具描述（供 LLM 理解）*/
  description: string
  
  /** 系统提示词 */
  systemPrompt: string
  
  /** 最小输入长度 */
  minInputLength?: number
  
  /** 输入过短时的回退值 */
  shortInputFallback?: string
  
  /**
   * 构建用户消息（可选）
   * 默认：使用 input 直接作为用户消息
   */
  buildUserMessage?: (input: any, context: AgentContext) => string
  
  /**
   * 解析 AI 输出（可选）
   * 默认：trim 后返回字符串
   */
  parseOutput?: (response: string, input: any, context: AgentContext) => any
  
  /**
   * 结果处理器：处理工具输出，更新上下文
   */
  onResult?: (output: any, context: AgentContext) => void
  
  /**
   * 执行条件（可选）
   */
  condition?: (context: AgentContext) => boolean
  
  /**
   * 进度消息（可选）
   */
  progressMessage?: string
}

/**
 * 主模型生成工具配置
 */
export interface MainGenerationToolConfig {
  /** 工具 ID */
  id: string
  
  /** 显示名称 */
  name: string
  
  /** 模板类型 */
  template: 'main-generation'
  
  /** 工具描述 */
  description: string
  
  /**
   * 执行条件（可选）
   */
  condition?: (context: AgentContext) => boolean
}

/**
 * 统一工具配置类型
 */
export type ToolConfig = 
  | JudgmentToolConfig 
  | SimpleLLMToolConfig 
  | MainGenerationToolConfig

/**
 * 工作流配置
 * 定义工具的执行顺序和逻辑
 */
export interface WorkflowConfig {
  /** 工作流名称 */
  name: string
  
  /** 工作流描述 */
  description: string
  
  /** 工具列表（按执行顺序）*/
  tools: ToolConfig[]
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 创建任务启用检查器
 */
function createTaskEnabledChecker(taskType: string) {
  return (context: AgentContext) => {
    const taskConfigs = context.aiConfig.agentConfig?.options?.taskConfigs as any[]
    const config = taskConfigs?.find((c: any) => c.type === taskType)
    return config?.enabled !== false
  }
}

// ============================================================
// 默认工作流配置
// ============================================================

/**
 * 默认的文章生成工作流配置
 */
export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  name: 'default-optimize',
  description: '默认的优化生成工作流',
  
  tools: [
    // 1. 判断是否需要优化
    {
      id: 'should-optimize',
      name: '判断是否优化',
      template: 'judgment',
      description: '判断用户输入是否需要优化',
      systemPrompt: SHOULD_OPTIMIZE_SYSTEM_PROMPT,
      
      minInputLength: 5,
      shortInputDefault: false,
      
      parseJudgment: (response) => response.includes('<是/>'),
      
      onResult: (result, reason, context) => {
        context.data.set('shouldOptimize', result)
        console.log('[Workflow] 判断结果:', result ? '需要优化' : '无需优化')
      },
      
      condition: createTaskEnabledChecker('should-optimize')
    },
    
    // 2. 优化输入
    {
      id: 'optimize-input',
      name: '输入优化',
      template: 'simple-llm',
      description: '优化用户输入，使其更清晰准确',
      systemPrompt: OPTIMIZE_INPUT_SYSTEM_PROMPT,
      
      minInputLength: 5,
      progressMessage: '正在优化输入...',
      
      parseOutput: (response) => response.trim(),
      
      onResult: (output, context) => {
        // 更新目标为优化后的输入
        context.goal = output
        console.log('[Workflow] 已更新 goal 为优化后的输入')
      },
      
      // 只有判断需要优化时才执行
      condition: (context) => {
        const taskConfigs = context.aiConfig.agentConfig?.options?.taskConfigs as any[]
        const config = taskConfigs?.find((c: any) => c.type === 'optimize-input')
        if (config?.enabled === false) return false
        
        const shouldOptimize = context.data.get('shouldOptimize')
        return shouldOptimize === true
      }
    },
    
    // 3. 生成文章结构
    {
      id: 'generate-structure',
      name: '文章结构',
      template: 'simple-llm',
      description: '生成文章结构大纲',
      systemPrompt: GENERATE_STRUCTURE_SYSTEM_PROMPT,
      
      progressMessage: '正在生成文章结构...',
      
      buildUserMessage: (input, context) => {
        const parts: string[] = []
        
        // 使用优化后的 goal
        const userInput = context.goal || input
        if (userInput && String(userInput).trim()) {
          parts.push('# 用户需求\n' + userInput)
        }
        
        // 附加文件
        if (context.attachedFiles && context.attachedFiles.length > 0) {
          parts.push('\n# 附加文件\n' + context.attachedFiles.join('\n\n'))
        }
        
        // 对话历史
        if (context.conversationHistory && context.conversationHistory.length > 0) {
          const historyText = context.conversationHistory
            .slice(-5)
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n\n')
          parts.push('\n# 对话上下文\n' + historyText)
        }
        
        return parts.join('\n\n')
      },
      
      parseOutput: (response) => response.trim(),
      
      onResult: (output, context) => {
        // 将生成的结构添加到附加文件
        const structure = `# 生成的文章结构\n\n${output}`
        context.attachedFiles = [structure, ...(context.attachedFiles || [])]
        console.log('[Workflow] 已添加文章结构到 attachedFiles')
      },
      
      condition: createTaskEnabledChecker('generate-structure')
    },
    
    // 4. 主模型生成
    {
      id: 'main-generation',
      name: '主模型生成',
      template: 'main-generation',
      description: '调用主 AI 模型生成最终内容',
      
      condition: createTaskEnabledChecker('main-generation')
    }
  ]
}

