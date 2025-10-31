/**
 * 转换工具
 * 
 * 使用 LLM 对输入进行转换（优化、总结、翻译等）
 */

import type {
  Tool,
  ToolContext,
  ToolResult,
  TransformToolConfig
} from '../types'

/**
 * 转换工具实现
 */
export class TransformTool implements Tool<string, string> {
  readonly type = 'transform'
  readonly name: string
  
  private config: TransformToolConfig
  
  constructor(config: TransformToolConfig) {
    this.config = config
    this.name = config.name
  }
  
  async execute(
    input: string,
    context: ToolContext
  ): Promise<ToolResult<string>> {
    const startTime = Date.now()
    
    try {
      // 发送进度消息
      if (context.onProgress && this.config.progressMessage) {
        context.onProgress(this.config.progressMessage)
      }
      
      console.log(`[${this.name}] 开始执行转换`)
      
      // 调用 AI API
      const response = await this.callAI(input, context)
      
      // 解析输出
      const output = this.parseOutput(response)
      
      const duration = Date.now() - startTime
      
      console.log(`[${this.name}] 转换完成`, {
        inputLength: input.length,
        outputLength: output.length,
        duration: `${duration}ms`
      })
      
      return {
        success: true,
        output,
        metadata: { duration }
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime
      
      console.error(`[${this.name}] 转换失败:`, error)
      
      return {
        success: false,
        error: error.message || '转换失败',
        metadata: { duration }
      }
    }
  }
  
  /**
   * 调用 AI API
   */
  private async callAI(input: string, context: ToolContext): Promise<string> {
    const { callSimpleAPI } = await import('../simple-api')
    
    const messages = [
      { role: 'system' as const, content: this.config.systemPrompt },
      { role: 'user' as const, content: input }
    ]
    
    // 获取 API Provider
    const apiProvider = this.getApiProvider(context)
    
    // 支持流式输出
    let accumulatedContent = ''
    
    const response = await callSimpleAPI(
      messages,
      apiProvider,
      context.aiConfig,
      context.abortSignal,
      (content) => {
        accumulatedContent = content
        // 可以通过 onProgress 发送流式更新
        if (context.onProgress) {
          context.onProgress(content)
        }
      }
    )
    
    return response
  }
  
  /**
   * 解析输出
   */
  private parseOutput(response: string): string {
    const parser = this.config.outputParser
    
    if (!parser) {
      return response.trim()
    }
    
    switch (parser.type) {
      case 'trim':
        return response.trim()
      
      case 'extract-tag': {
        const tagName = parser.tagName
        const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i')
        const match = response.match(regex)
        return match ? match[1].trim() : response.trim()
      }
      
      case 'json': {
        try {
          return JSON.parse(response)
        } catch {
          console.warn(`[${this.name}] JSON 解析失败，返回原始文本`)
          return response.trim()
        }
      }
      
      case 'custom': {
        return parser.parse(response)
      }
      
      default:
        return response.trim()
    }
  }
  
  /**
   * 获取 API Provider
   */
  private getApiProvider(context: ToolContext): import('../../types').ApiProviderConfig {
    const providers = context.aiConfig.providers || []
    
    // 优先使用当前选中的 provider
    const currentProvider = providers.find(p => p.id === context.aiConfig.currentProviderId)
    if (currentProvider) {
      return currentProvider
    }
    
    // 否则使用第一个可用的
    if (providers.length > 0) {
      return providers[0]
    }
    
    throw new Error('没有可用的 API Provider')
  }
}

/**
 * 创建转换工具
 */
export function createTransformTool(config: TransformToolConfig): TransformTool {
  return new TransformTool(config)
}

