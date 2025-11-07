/**
 * Agent Mode Handler - Agent Pipeline 模式处理器
 * 
 * 职责：创建 AgentContext 并协调引擎执行
 */

import type { 
  InitialRequestData, 
  RequestResult, 
  StreamCallbacks
} from '../types'
import { runAgentEngine } from './core/agent-engine'
import { createContext } from './core/agent-context'

/**
 * Agent模式处理器
 */
export async function executeAgentMode(
  data: InitialRequestData,
  callbacks: StreamCallbacks
): Promise<RequestResult> {
  try {
    // 输出原始数据（用于调试）
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
    
    // 1. 创建 Agent 上下文（原始数据会被复制到 input 区）
    const context = createContext({
      userInput: data.userInput,
      attachedContents: data.attachedContents,
      conversationHistory: data.conversationHistory,
      promptCards: data.userMessageNode.components?.promptCards,
      aiConfig: data.aiConfig
    })
    
    // 输出处理好后的数据
    console.log('=== Agents 处理好后的数据 ===')
    console.log(JSON.stringify({ 
      contextId: context.meta.id,
      messagesCount: context.processing.messages.length,
      inputUserInput: context.input.userInput.substring(0, 100)
    }, null, 2))
    
    // 2. 调用 Agent Engine（传递 context）
    const result = await runAgentEngine({
      context,
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
