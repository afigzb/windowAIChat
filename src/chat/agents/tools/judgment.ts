/**
 * 判断工具
 * 
 * 用于 AI 做是/否判断
 */

import type {
  Tool,
  ToolContext,
  ToolResult,
  JudgmentToolConfig,
  JudgmentResult
} from '../types'

/**
 * 判断工具实现
 */
export class JudgmentTool implements Tool<string, JudgmentResult> {
  readonly type = 'judgment'
  readonly name: string
  
  private config: JudgmentToolConfig
  
  constructor(config: JudgmentToolConfig) {
    this.config = config
    this.name = config.name
  }
  
  async execute(
    input: string,
    context: ToolContext
  ): Promise<ToolResult<JudgmentResult>> {
    const startTime = Date.now()
    
    try {
      // 发送进度消息
      if (context.onProgress && this.config.progressMessage) {
        context.onProgress(this.config.progressMessage)
      }
      
      console.log(`[${this.name}] 开始执行判断`)
      
      // 调用 AI API
      const response = await this.callAI(input, context)
      
      // 解析判断结果
      const result = this.parseJudgment(response)
      
      const duration = Date.now() - startTime
      
      console.log(`[${this.name}] 判断完成: ${result.result}`, {
        duration: `${duration}ms`
      })
      
      return {
        success: true,
        output: result,
        metadata: { duration }
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime
      
      console.error(`[${this.name}] 判断失败:`, error)
      
      return {
        success: false,
        error: error.message || '判断失败',
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
    
    return callSimpleAPI(
      messages,
      apiProvider,
      context.aiConfig,
      context.abortSignal
    )
  }
  
  /**
   * 解析判断结果
   */
  private parseJudgment(response: string): JudgmentResult {
    const parser = this.config.parser
    
    let result = false
    
    switch (parser.type) {
      case 'tag': {
        const yesTag = parser.yesTag || '<是/>'
        const noTag = parser.noTag || '<否/>'
        
        if (response.includes(yesTag)) {
          result = true
        } else if (response.includes(noTag)) {
          result = false
        }
        break
      }
      
      case 'keywords': {
        const keywords = parser.yesKeywords || ['是', 'yes', 'true', '需要']
        const lowerResponse = response.toLowerCase()
        result = keywords.some(kw => lowerResponse.includes(kw.toLowerCase()))
        break
      }
      
      case 'custom': {
        result = parser.parse(response)
        break
      }
    }
    
    // 提取原因（简单实现）
    const reason = this.extractReason(response)
    
    return {
      result,
      reason,
      rawResponse: response
    }
  }
  
  /**
   * 提取判断原因
   */
  private extractReason(response: string): string {
    // 尝试找到"原因"、"理由"等关键词后的内容
    const reasonMatch = response.match(/(?:原因|理由|because|reason)[：:]\s*(.+?)(?:\n|$)/i)
    if (reasonMatch && reasonMatch[1]) {
      return reasonMatch[1].trim()
    }
    
    // 返回前 100 个字符
    return response.substring(0, 100) + (response.length > 100 ? '...' : '')
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
 * 创建判断工具
 */
export function createJudgmentTool(config: JudgmentToolConfig): JudgmentTool {
  return new JudgmentTool(config)
}

