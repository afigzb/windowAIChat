/**
 * 工具注册表
 * 
 * 为AI Agent提供可调用的工具库
 * 每个工具都有清晰的描述、参数和使用场景
 */

import type { AIConfig } from '../types'
import { callSimpleAPI } from './simple-api'

// ============================================================
// 工具定义类型
// ============================================================

/**
 * 工具参数定义
 */
export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required: boolean
  default?: any
}

/**
 * 工具定义
 */
export interface ToolDefinition {
  /** 工具唯一标识 */
  id: string
  
  /** 工具名称 */
  name: string
  
  /** 工具描述（供AI理解） */
  description: string
  
  /** 使用场景说明 */
  usageScenarios: string[]
  
  /** 参数定义 */
  parameters: ToolParameter[]
  
  /** 执行函数 */
  execute: (params: any, context: ToolExecutionContext) => Promise<ToolExecutionResult>
}

/**
 * 工具执行上下文
 */
export interface ToolExecutionContext {
  aiConfig: AIConfig
  rawData: {
    userInput: string
    goal: string
    attachedFiles: string[]
    customData: Map<string, any>
  }
  abortSignal?: AbortSignal
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  success: boolean
  output: any
  error?: string
  metadata?: Record<string, any>
}

// ============================================================
// 内置工具定义
// ============================================================

/**
 * 判断工具：让AI做是非判断
 */
const JUDGMENT_TOOL: ToolDefinition = {
  id: 'judgment',
  name: '判断工具',
  description: '使用AI进行是非判断、分类、评估等任务',
  usageScenarios: [
    '判断输入质量是否需要优化',
    '判断是否需要查询额外信息',
    '分类用户意图',
    '评估内容是否符合要求'
  ],
  parameters: [
    {
      name: 'input',
      type: 'string',
      description: '需要判断的内容',
      required: true
    },
    {
      name: 'prompt',
      type: 'string',
      description: '判断的具体要求和标准',
      required: true
    }
  ],
  execute: async (params, context) => {
    const systemPrompt = `你是一个专业的判断助手。${params.prompt}

请仔细分析输入内容，给出明确的判断。

返回格式：
<判断>是</判断> 或 <判断>否</判断>
<理由>简要说明原因</理由>`

    try {
      // 获取当前provider配置
      const currentProvider = context.aiConfig.providers.find(
        p => p.id === context.aiConfig.currentProviderId
      )
      
      if (!currentProvider) {
        throw new Error('未找到当前API配置')
      }
      
      const response = await callSimpleAPI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: params.input }
        ],
        currentProvider,
        context.aiConfig,
        context.abortSignal
      )
      
      // 解析判断结果
      const judgmentMatch = response.match(/<判断>(是|否)<\/判断>/)
      const reasonMatch = response.match(/<理由>(.*?)<\/理由>/s)
      
      const result = judgmentMatch?.[1] === '是'
      const reason = reasonMatch?.[1]?.trim() || ''
      
      return {
        success: true,
        output: {
          result,
          reason,
          rawResponse: response
        }
      }
    } catch (error: any) {
      return {
        success: false,
        output: null,
        error: error.message
      }
    }
  }
}

/**
 * 转换工具：让AI处理和转换文本
 */
const TRANSFORM_TOOL: ToolDefinition = {
  id: 'transform',
  name: '文本转换工具',
  description: '使用AI对文本进行转换、优化、提取、总结等处理',
  usageScenarios: [
    '优化和改写用户输入',
    '提取关键信息',
    '总结和压缩内容',
    '格式转换',
    '翻译'
  ],
  parameters: [
    {
      name: 'input',
      type: 'string',
      description: '需要处理的文本',
      required: true
    },
    {
      name: 'instruction',
      type: 'string',
      description: '具体的处理指令',
      required: true
    }
  ],
  execute: async (params, context) => {
    const systemPrompt = `你是一个专业的文本处理助手。${params.instruction}

请直接输出处理后的结果，不要添加任何解释或前缀。`

    try {
      // 获取当前provider配置
      const currentProvider = context.aiConfig.providers.find(
        p => p.id === context.aiConfig.currentProviderId
      )
      
      if (!currentProvider) {
        throw new Error('未找到当前API配置')
      }
      
      const response = await callSimpleAPI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: params.input }
        ],
        currentProvider,
        context.aiConfig,
        context.abortSignal
      )
      
      return {
        success: true,
        output: response.trim()
      }
    } catch (error: any) {
      return {
        success: false,
        output: null,
        error: error.message
      }
    }
  }
}

/**
 * 分析工具：深度分析和推理
 */
const ANALYSIS_TOOL: ToolDefinition = {
  id: 'analysis',
  name: '分析工具',
  description: '对复杂问题进行深度分析、推理和规划',
  usageScenarios: [
    '分析用户真实意图',
    '识别任务的关键要素',
    '制定解决方案',
    '发现潜在问题'
  ],
  parameters: [
    {
      name: 'content',
      type: 'string',
      description: '需要分析的内容',
      required: true
    },
    {
      name: 'focus',
      type: 'string',
      description: '分析的重点方向',
      required: true
    }
  ],
  execute: async (params, context) => {
    const systemPrompt = `你是一个深度分析专家。请从以下角度分析内容：${params.focus}

请提供详细的分析结果，包括关键发现和建议。`

    try {
      // 获取当前provider配置
      const currentProvider = context.aiConfig.providers.find(
        p => p.id === context.aiConfig.currentProviderId
      )
      
      if (!currentProvider) {
        throw new Error('未找到当前API配置')
      }
      
      const response = await callSimpleAPI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: params.content }
        ],
        currentProvider,
        context.aiConfig,
        context.abortSignal
      )
      
      return {
        success: true,
        output: response
      }
    } catch (error: any) {
      return {
        success: false,
        output: null,
        error: error.message
      }
    }
  }
}

/**
 * 知识查询工具：从上下文中查询信息
 */
const KNOWLEDGE_QUERY_TOOL: ToolDefinition = {
  id: 'knowledge_query',
  name: '知识查询工具',
  description: '从附加文件或对话历史中查询和提取特定信息',
  usageScenarios: [
    '从文档中查找特定信息',
    '回顾对话历史',
    '提取相关上下文'
  ],
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: '要查询的问题或关键词',
      required: true
    },
    {
      name: 'source',
      type: 'string',
      description: '查询来源：files（附加文件）或 history（对话历史）',
      required: true
    }
  ],
  execute: async (params, context) => {
    const { query, source } = params
    
    let content = ''
    
    if (source === 'files') {
      content = context.rawData.attachedFiles.join('\n\n---\n\n')
      if (!content) {
        return {
          success: false,
          output: null,
          error: '没有可查询的附加文件'
        }
      }
    } else if (source === 'history') {
      // 这里可以访问对话历史
      return {
        success: false,
        output: null,
        error: '对话历史查询功能暂未实现'
      }
    } else {
      return {
        success: false,
        output: null,
        error: '未知的查询来源'
      }
    }
    
    const systemPrompt = `你是一个信息检索专家。请从提供的内容中查找与查询相关的信息。

查询：${query}

如果找到相关信息，请提取并整理。如果没有找到，请说明。`

    try {
      // 获取当前provider配置
      const currentProvider = context.aiConfig.providers.find(
        p => p.id === context.aiConfig.currentProviderId
      )
      
      if (!currentProvider) {
        throw new Error('未找到当前API配置')
      }
      
      const response = await callSimpleAPI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content }
        ],
        currentProvider,
        context.aiConfig,
        context.abortSignal
      )
      
      return {
        success: true,
        output: response
      }
    } catch (error: any) {
      return {
        success: false,
        output: null,
        error: error.message
      }
    }
  }
}

/**
 * 更新目标工具：修改任务目标
 */
const UPDATE_GOAL_TOOL: ToolDefinition = {
  id: 'update_goal',
  name: '更新目标工具',
  description: '更新或优化当前的任务目标',
  usageScenarios: [
    '优化模糊的用户输入',
    '根据分析结果调整目标',
    '细化任务要求'
  ],
  parameters: [
    {
      name: 'new_goal',
      type: 'string',
      description: '新的任务目标',
      required: true
    }
  ],
  execute: async (params, context) => {
    context.rawData.goal = params.new_goal
    
    return {
      success: true,
      output: `目标已更新为：${params.new_goal}`
    }
  }
}

/**
 * 完成工具：生成最终结果
 */
const FINISH_TOOL: ToolDefinition = {
  id: 'finish',
  name: '完成工具',
  description: '当所有准备工作完成后，生成最终答案或内容',
  usageScenarios: [
    '生成最终回复',
    '完成任务并返回结果'
  ],
  parameters: [
    {
      name: 'ready',
      type: 'boolean',
      description: '是否已准备好生成最终结果',
      required: true,
      default: true
    }
  ],
  execute: async (params, context) => {
    // 这个工具只是标记完成，实际生成由主模型完成
    return {
      success: true,
      output: {
        ready: true,
        goal: context.rawData.goal
      }
    }
  }
}

// ============================================================
// 工具注册表
// ============================================================

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map()
  
  constructor() {
    // 注册内置工具
    this.register(JUDGMENT_TOOL)
    this.register(TRANSFORM_TOOL)
    this.register(ANALYSIS_TOOL)
    this.register(KNOWLEDGE_QUERY_TOOL)
    this.register(UPDATE_GOAL_TOOL)
    this.register(FINISH_TOOL)
  }
  
  /**
   * 注册工具
   */
  register(tool: ToolDefinition): void {
    this.tools.set(tool.id, tool)
  }
  
  /**
   * 获取工具
   */
  getTool(id: string): ToolDefinition | undefined {
    return this.tools.get(id)
  }
  
  /**
   * 获取所有工具
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }
  
  /**
   * 获取工具描述（供AI使用）
   */
  getToolsDescription(): string {
    const tools = this.getAllTools()
    
    return tools.map(tool => {
      const params = tool.parameters.map(p => 
        `  - ${p.name} (${p.type}${p.required ? ', 必需' : ', 可选'}): ${p.description}`
      ).join('\n')
      
      const scenarios = tool.usageScenarios.map(s => `  • ${s}`).join('\n')
      
      return `## ${tool.name} (ID: ${tool.id})
${tool.description}

使用场景：
${scenarios}

参数：
${params}
`
    }).join('\n---\n\n')
  }
  
  /**
   * 执行工具
   */
  async executeTool(
    toolId: string,
    params: any,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const tool = this.getTool(toolId)
    
    if (!tool) {
      return {
        success: false,
        output: null,
        error: `工具不存在: ${toolId}`
      }
    }
    
    // 验证必需参数
    for (const param of tool.parameters) {
      if (param.required && !(param.name in params)) {
        return {
          success: false,
          output: null,
          error: `缺少必需参数: ${param.name}`
        }
      }
    }
    
    try {
      return await tool.execute(params, context)
    } catch (error: any) {
      return {
        success: false,
        output: null,
        error: `工具执行异常: ${error.message}`
      }
    }
  }
}

// 导出单例
export const toolRegistry = new ToolRegistry()


