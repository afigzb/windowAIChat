/**
 * AgentEngine - AI写作专用引擎
 */

import { updateStage } from './agent-context'
import type {
  AgentContext,
  AgentEngineConfig,
  AgentEngineInput,
  AgentEngineResult
} from '../types'
import { preprocess } from '../preprocessor'
import { createAIService } from '../services/ai-service'
import { selectForSending } from './message-ops'

// 重新导出类型
export type { AgentEngineConfig, AgentEngineInput, AgentEngineResult }

/**
 * 运行AI写作引擎
 */
export async function runAgentEngine(input: AgentEngineInput): Promise<AgentEngineResult> {
  const { context, config, abortSignal } = input
  const verbose = config?.verbose ?? true
  
  try {
    // 阶段1：Preprocessing
    updateStage(context, 'preprocessing')
    
    if (config?.onProgress) {
      config.onProgress('正在预处理输入...', 'preprocessing')
    }
    
    const preprocessingResult = await preprocess(
      context,
      config?.preprocessing,
      abortSignal
    )
    
    if (preprocessingResult.success) {
      context.output.tokensUsed += preprocessingResult.tokensUsed
    }
    
    // 阶段2：直接生成回答
    updateStage(context, 'generating')
    
    if (config?.onProgress) {
      config.onProgress('正在生成回答...', 'generating')
    }
    
    // 构建请求消息
    const messages = context.processing.messages
    
    // 转换为发送格式
    const requestMessages = selectForSending(messages)
    
    // 发送AI请求
    const aiService = createAIService(context.input.aiConfig)
    const finalAnswer = await aiService.call(
      requestMessages,
      { 
        abortSignal,
        temperature: config?.temperature
      }
    )
    
    if (!finalAnswer || finalAnswer.trim().length === 0) {
      throw new Error('AI返回空结果')
    }
    
    // 设置最终答案
    context.output.finalAnswer = finalAnswer.trim()
    
    // 完成
    updateStage(context, 'completed')
    
    return {
      success: true,
      finalAnswer: context.output.finalAnswer,
      context,
      tokensUsed: context.output.tokensUsed
    }
    
  } catch (error: any) {
    updateStage(context, 'failed')
    
    return {
      success: false,
      context,
      tokensUsed: context.output.tokensUsed,
      error: error.message || '未知错误'
    }
  }
}
