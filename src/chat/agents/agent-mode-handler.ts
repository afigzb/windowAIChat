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
 */
export async function executeAgentMode(
  data: InitialRequestData,
  callbacks: StreamCallbacks
): Promise<RequestResult> {
  try {
    // 输出原始数据（排除不可序列化的对象）
    console.log('=== Agents 原始数据 ===')
    const rawDataForLog = {
      userInput: data.userInput,
      attachedContents: data.attachedContents,
      conversationHistory: data.conversationHistory,
      systemPrompt: data.systemPrompt,
      aiConfig: data.aiConfig,
      userMessageNode: data.userMessageNode
    }
    console.log(JSON.stringify(rawDataForLog, null, 2))
    
    // 1. 构建带标记的 messages 数组
    const { messages, rawUserInput } = buildMessages({
      userInput: data.userInput,
      conversationHistory: data.conversationHistory,
      attachedContents: data.attachedContents,
      promptCards: data.userMessageNode.components?.promptCards,
      aiConfig: data.aiConfig
    })
    
    // 输出处理好后的数据
    console.log('=== Agents 处理好后的数据 ===')
    console.log(JSON.stringify({ messages, rawUserInput }, null, 2))
    
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
