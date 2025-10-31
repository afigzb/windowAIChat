/**
 * 主生成工具
 * 
 * 使用主模型生成最终内容
 */

import type {
  Tool,
  ToolContext,
  ToolResult,
  GenerationToolConfig,
  GenerationResult
} from '../types'

/**
 * 主生成工具实现
 */
export class GenerationTool implements Tool<string, GenerationResult> {
  readonly type = 'generation'
  readonly name: string
  
  private config: GenerationToolConfig
  
  constructor(config: GenerationToolConfig) {
    this.config = config
    this.name = config.name
  }
  
  async execute(
    input: string,
    context: ToolContext
  ): Promise<ToolResult<GenerationResult>> {
    const startTime = Date.now()
    
    try {
      console.log(`[${this.name}] 开始主模型生成`)
      
      if (context.onProgress) {
        context.onProgress('正在使用主模型生成内容...')
      }
      
      // 调用主模型 API
      const result = await this.callMainModel(input, context)
      
      const duration = Date.now() - startTime
      
      console.log(`[${this.name}] 主模型生成完成`, {
        contentLength: result.content.length,
        hasReasoning: !!result.reasoning,
        duration: `${duration}ms`
      })
      
      return {
        success: true,
        output: result,
        metadata: { duration }
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime
      
      console.error(`[${this.name}] 主模型生成失败:`, error)
      
      return {
        success: false,
        error: error.message || '主模型生成失败',
        metadata: { duration }
      }
    }
  }
  
  /**
   * 调用主模型 API
   */
  private async callMainModel(
    input: string,
    context: ToolContext
  ): Promise<GenerationResult> {
    const { callAIAPI } = await import('../../core/api')
    
    // 构建消息列表
    const messages: import('../../types').FlatMessage[] = []
    
    // 1. 添加对话历史（如果有）
    if (context.rawData.conversationHistory.length > 0) {
      messages.push(...context.rawData.conversationHistory)
    }
    
    // 2. 添加用户消息（使用处理后的 goal）
    const userMessage: import('../../types').FlatMessage = {
      id: 'main-generation-user',
      role: 'user',
      content: input,
      timestamp: new Date(),
      parentId: null
    }
    
    // 如果有附加文件，添加到组件中
    if (context.rawData.attachedFiles.length > 0) {
      userMessage.components = {
        userInput: input,
        attachedFiles: context.rawData.attachedFiles
      }
    }
    
    messages.push(userMessage)
    
    console.log(`[${this.name}] 消息列表构建完成`, {
      messageCount: messages.length,
      attachedFilesCount: context.rawData.attachedFiles.length
    })
    
    // 准备附加内容参数
    const tempContentList = context.rawData.attachedFiles.length > 0
      ? context.rawData.attachedFiles
      : undefined
    
    const tempPlacement = context.aiConfig.fileContentPlacement || 'append'
    
    // 追踪生成内容
    let currentContent = ''
    let currentReasoning = ''
    
    // 确保有 abortSignal
    const signal = context.abortSignal || new AbortController().signal
    
    // 调用 AI API
    const result = await callAIAPI(
      messages,
      context.aiConfig,
      signal,
      (thinking) => {
        currentReasoning = thinking
        // 可以通过 onProgress 发送思考过程更新
      },
      (answer) => {
        currentContent = answer
        // 可以通过 onProgress 发送回答更新
        if (context.onProgress) {
          context.onProgress(answer)
        }
      },
      undefined,
      tempPlacement,
      tempContentList
    )
    
    return {
      content: result.content,
      reasoning: result.reasoning_content
    }
  }
}

/**
 * 创建主生成工具
 */
export function createGenerationTool(config: GenerationToolConfig): GenerationTool {
  return new GenerationTool(config)
}

