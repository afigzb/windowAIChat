/**
 * Agent Context - 上下文管理
 * 
 * 核心原则：
 * - input 区域是原始数据的副本，只读不可变
 * - processing 区域可修改
 * - output 区域可修改
 */

import { generateWorkspaceId } from '../utils/utils'
import type {
  AgentContext,
  CreateContextInput,
  ExecutionStage,
  ApiMessage,
  Message
} from '../types'
import { buildMessages } from '../message-builder/message-builder'

/**
 * 创建 Agent 上下文
 * 
 * 原始数据会被深拷贝到 input 区域（只读）
 */
export function createContext(input: CreateContextInput): AgentContext {
  // 深拷贝原始数据（确保不可变）
  const inputCopy = {
    userInput: input.userInput,
    attachedContents: [...input.attachedContents], // 复制数组
    conversationHistory: input.conversationHistory.map(msg => ({ ...msg })), // 复制每个对象
    promptCards: input.promptCards?.map(card => ({ ...card })),
    aiConfig: input.aiConfig // AIConfig 本身是只读的，不需要深拷贝
  }
  
  // 构建初始 messages
  const { messages } = buildMessages({
    userInput: inputCopy.userInput,
    conversationHistory: inputCopy.conversationHistory as ApiMessage[],
    attachedContents: inputCopy.attachedContents,
    promptCards: inputCopy.promptCards,
    aiConfig: inputCopy.aiConfig
  })
  
  return {
    // 输入区（只读）
    input: inputCopy,
    
    // 处理区（可修改）
    processing: {
      messages, // 构建的消息数组
      preprocessed: false
    },
    
    // 输出区（可修改）
    output: {
      tokensUsed: 0,
      metadata: {}
    },
    
    // 元数据
    meta: {
      id: generateWorkspaceId(),
      createdAt: Date.now(),
      stage: 'preprocessing'
    }
  }
}

/**
 * 更新执行阶段
 */
export function updateStage(context: AgentContext, stage: ExecutionStage): void {
  context.meta.stage = stage
}

/**
 * 过滤掉 _meta 标记，返回标准 API messages
 */
export function stripMetadata(messages: Message[]): ApiMessage[] {
  return messages.map(m => ({
    role: m.role,
    content: m.content
  }))
}
