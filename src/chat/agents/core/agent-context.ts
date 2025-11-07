/**
 * Agent Context - 上下文管理（替代 workspace-data.ts）
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

/**
 * 格式化 Context 用于调试
 */
export function formatContextForDebug(context: AgentContext): string {
  const sections: string[] = []
  
  sections.push('=== Agent Context ===')
  sections.push(`ID: ${context.meta.id}`)
  sections.push(`Stage: ${context.meta.stage}`)
  sections.push('')
  
  sections.push('--- Input (只读) ---')
  sections.push(`User Input: ${context.input.userInput.substring(0, 100)}${context.input.userInput.length > 100 ? '...' : ''}`)
  sections.push(`Attached Contents: ${context.input.attachedContents.length} files`)
  sections.push(`Conversation History: ${context.input.conversationHistory.length} messages`)
  sections.push(`Prompt Cards: ${context.input.promptCards?.length || 0}`)
  sections.push('')
  
  sections.push('--- Processing (可修改) ---')
  sections.push(`Messages: ${context.processing.messages.length}`)
  sections.push(`Preprocessed: ${context.processing.preprocessed}`)
  
  // 消息类型统计
  const typeCount: Record<string, number> = {}
  context.processing.messages.forEach(m => {
    typeCount[m._meta.type] = (typeCount[m._meta.type] || 0) + 1
  })
  sections.push(`Message Types:`)
  Object.entries(typeCount).forEach(([type, count]) => {
    sections.push(`  - ${type}: ${count}`)
  })
  sections.push('')
  
  sections.push('--- Output (可修改) ---')
  sections.push(`Final Answer: ${context.output.finalAnswer ? 'Yes' : 'No'}`)
  if (context.output.finalAnswer) {
    sections.push(`Answer Length: ${context.output.finalAnswer.length} chars`)
  }
  sections.push(`Tokens Used: ${context.output.tokensUsed}`)
  
  return sections.join('\n')
}

