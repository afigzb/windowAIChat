/**
 * Agent Mode Handler - Agent Pipeline 模式处理器（重构版）
 * 
 * 职责：协调消息构建和Agent引擎执行
 */

import type { 
  InitialRequestData, 
  RequestResult, 
  StreamCallbacks
} from '../types'
import { runAgentEngine } from './core/agent-engine'
import { buildMessages } from './message-builder/message-builder'

/**
 * Agent模式处理器
 * 
 * @param data 初始请求数据
 * @param callbacks 流式回调
 * @returns 请求结果
 */
export async function executeAgentMode(
  data: InitialRequestData,
  callbacks: StreamCallbacks
): Promise<RequestResult> {
  try {
    // 1. 构建带标记的 messages 数组
    const { messages, rawUserInput } = buildMessages({
      userInput: data.userInput,
      conversationHistory: data.conversationHistory,
      attachedContents: data.attachedContents,
      promptCards: data.userMessageNode.components?.promptCards,
      aiConfig: data.aiConfig
    })
    
    // 2. 调用 Agent Engine
    const result = await runAgentEngine({
      messages,
      rawUserInput,
      aiConfig: data.aiConfig,
      config: {
        verbose: true,
        onProgress: callbacks.onAgentProgress
          ? (message, stage) => {
            const stageIcon = {
              preprocessing: '🔍',
              generating: '✨'
            }[stage]
            
            if (callbacks.onAgentProgress) {
              callbacks.onAgentProgress(`${stageIcon} ${message}`)
            }
          }
          : undefined
      },
      abortSignal: data.abortSignal
    })
    
    if (!result.success || !result.finalAnswer) {
      throw new Error(result.error || 'Agent Engine 执行失败')
    }
    
    // 3. 返回结果
    return {
      content: result.finalAnswer
    }
    
  } catch (error: any) {
    
    // Agent 模式失败时，返回错误信息
    return {
      content: `Agent 执行失败: ${error.message || '未知错误'}`
    }
  }
}
