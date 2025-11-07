/**
 * Message Builder - 消息构建器
 */

import type {
  Message,
  MessageBuilderInput,
  MessageBuilderOutput,
  MessageType
} from '../types'
import { systemPrompt } from '../../core/context/system-prompt'

// 重新导出类型
export type { MessageBuilderInput, MessageBuilderOutput }

/**
 * 消息来源类型
 */
type MessageSource = 
  | 'system_prompt'      // 系统提示词
  | 'context'            // 对话历史上下文
  | 'prompt_card'        // 提示词卡片
  | 'file'               // 附加文件
  | 'user_input'         // 用户当前输入

/**
 * 追踪消息来源的辅助结构
 */
interface MessageSourceInfo {
  start: number          // 在最终消息数组中的起始索引
  end: number            // 在最终消息数组中的结束索引（不包含）
  source: MessageSource  // 来源类型
  metadata?: unknown     // 额外的元数据
}

/**
 * 构建带标记的 messages 数组
 */
export function buildMessages(input: MessageBuilderInput): MessageBuilderOutput {
  const messages: Message[] = []
  const sourceMap: MessageSourceInfo[] = []
  let currentIndex = 0
  
  const promptCards = input.promptCards || []
  
  // ==================== 阶段1：构建系统提示词 ====================
  const finalSystemPrompt = systemPrompt.getPrompt(input.aiConfig)
  if (finalSystemPrompt && finalSystemPrompt.trim()) {
    messages.push({
      role: 'system',
      content: finalSystemPrompt.trim(),
      _meta: {
        type: 'system_prompt',
        needsProcessing: false,
        originalIndex: currentIndex
      }
    })
    sourceMap.push({
      start: currentIndex,
      end: currentIndex + 1,
      source: 'system_prompt'
    })
    currentIndex++
  }
  
  // 阶段2：插入提示词卡片和文件（after_system 位置）
  const placement = input.aiConfig.fileContentPlacement || 'append'
  
  if (placement === 'after_system') {
    // 收集需要插入的内容及其优先级
    type InsertItem = {
      priority: number
      source: MessageSource
      content: string
      metadata?: any
    }
    
    const itemsToInsert: InsertItem[] = []
    
    // 收集提示词卡片（仅 after_system 位置）
    promptCards
      .filter(card => card.placement === 'after_system')
      .forEach(card => {
        itemsToInsert.push({
          priority: (card as any).priority || 50, // 默认优先级50
          source: 'prompt_card',
          content: card.content,
          metadata: { title: card.title, cardId: card.id }
        })
      })
    
    // 收集文件内容
    const filePriority = input.aiConfig.fileContentPriority ?? 10
    const fileMode = input.aiConfig.fileContentMode || 'merged'
    
    if (fileMode === 'separate' && input.attachedContents.length > 0) {
      // 独立模式：每个文件单独插入
      input.attachedContents.forEach((fileContent, fileIndex) => {
        if (fileContent.trim()) {
          itemsToInsert.push({
            priority: filePriority,
            source: 'file',
            content: fileContent,
            metadata: { fileIndex }
          })
        }
      })
    } else if (input.attachedContents.length > 0) {
      // 合并模式：所有文件合并为一条
      const mergedContent = input.attachedContents.join('\n\n---\n\n')
      itemsToInsert.push({
        priority: filePriority,
        source: 'file',
        content: mergedContent,
        metadata: { fileCount: input.attachedContents.length }
      })
    }
    
    // 按优先级降序排序
    itemsToInsert.sort((a, b) => b.priority - a.priority)
    
    // 插入消息
    itemsToInsert.forEach(item => {
      messages.push({
        role: 'user',
        content: item.content,
        _meta: {
          type: item.source,
          needsProcessing: item.source === 'file',
          originalIndex: currentIndex,
          ...item.metadata
        }
      })
      sourceMap.push({
        start: currentIndex,
        end: currentIndex + 1,
        source: item.source,
        metadata: item.metadata
      })
      currentIndex++
    })
  }
  
  // 阶段3：处理对话历史
  const historyLimit = input.aiConfig.historyLimit || 0
  const historyToInclude = historyLimit > 0 
    ? input.conversationHistory.slice(-historyLimit)
    : input.conversationHistory
  
  const historyStartIndex = currentIndex
  historyToInclude.forEach(msg => {
    messages.push({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
      _meta: {
        type: 'context',
        needsProcessing: true,
        canMerge: true,
        originalIndex: currentIndex
      }
    })
    currentIndex++
  })
  
  if (historyToInclude.length > 0) {
    sourceMap.push({
      start: historyStartIndex,
      end: currentIndex,
      source: 'context'
    })
  }
  
  // 阶段4：处理其他位置的提示词卡片
  // system 位置的卡片 - 追加到系统提示词
  const systemCards = promptCards.filter(card => card.placement === 'system')
  if (systemCards.length > 0) {
    const systemContent = systemCards.map(c => c.content).join('\n\n')
    
    // 如果已有系统提示词，追加；否则创建新的系统消息
    if (messages[0]?.role === 'system') {
      messages[0].content += '\n\n' + systemContent
    } else {
      // 在开头插入系统提示词
      messages.unshift({
        role: 'system',
        content: systemContent,
        _meta: {
          type: 'system_prompt',
          needsProcessing: false,
          originalIndex: 0
        }
      })
      // 更新后续消息的索引
      currentIndex++
    }
  }
  
  // 阶段5：添加用户输入
  let userInputContent = input.userInput.trim()
  
  if (placement === 'append' && input.attachedContents.length > 0) {
    const fileContent = input.attachedContents.join('\n\n---\n\n')
    userInputContent = userInputContent + '\n\n' + fileContent
    
    // 记录文件来源（虽然合并到了用户输入中）
    sourceMap.push({
      start: currentIndex,
      end: currentIndex + 1,
      source: 'file',
      metadata: { mergedWithUserInput: true }
    })
  }
  
  // 添加 user_end 位置的提示词卡片
  const userEndCards = promptCards.filter(card => card.placement === 'user_end')
  if (userEndCards.length > 0) {
    userInputContent += '\n\n' + userEndCards.map(c => c.content).join('\n\n')
  }
  
  messages.push({
    role: 'user',
    content: userInputContent,
    _meta: {
      type: 'user_input',
      needsProcessing: false,
      originalIndex: currentIndex
    }
  })
  sourceMap.push({
    start: currentIndex,
    end: currentIndex + 1,
    source: 'user_input'
  })
  currentIndex++
  
  return {
    messages,
    rawUserInput: input.userInput
  }
}

