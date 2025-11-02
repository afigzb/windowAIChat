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
  console.log('[AgentMode] 开始执行 Agent Engine（重构版）')
  
  try {
    console.log('[AgentMode] 使用的数据:', {
      userInputLength: data.userInput.length,
      attachedContentsCount: data.attachedContents.length,
      promptCardsCount: data.userMessageNode.components?.promptCards?.length || 0,
      historyLength: data.conversationHistory.length,
      agentConfig: data.aiConfig.agentConfig
    })
    
    // 1. 构建带标记的 messages 数组
    const { messages, rawUserInput } = buildMessages({
      userInput: data.userInput,
      conversationHistory: data.conversationHistory,
      attachedContents: data.attachedContents,
      promptCards: data.userMessageNode.components?.promptCards,
      aiConfig: data.aiConfig
    })
    
    console.log('[AgentMode] 构建的 messages 数量:', messages.length)
    
    // 消息类型统计
    const typeCount: Record<string, number> = {}
    messages.forEach(m => {
      typeCount[m._meta.type] = (typeCount[m._meta.type] || 0) + 1
    })
    console.log('[AgentMode] 消息类型分布:', typeCount)
    
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
    
    console.log('[AgentMode] Agent Engine 执行成功:', {
      success: result.success,
      tokensUsed: result.tokensUsed
    })
    
    // 3. 返回结果
    return {
      content: result.finalAnswer
    }
    
  } catch (error: any) {
    console.error('[AgentMode] Agent Engine 执行失败:', error)
    
    // Agent 模式失败时，返回错误信息
    return {
      content: `Agent 执行失败: ${error.message || '未知错误'}`
    }
  }
}
