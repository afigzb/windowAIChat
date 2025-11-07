/**
 * 消息操作工具 - 统一的消息选择、读取、写入接口
 */

import type { Message, MessageType } from './workspace-data'

// 消息选择器
/**
 * 选择器配置
 */
export interface MessageSelector {
  /** 按类型选择 */
  types?: MessageType[]
  
  /** 排除特定类型 */
  excludeTypes?: MessageType[]
  
  /** 按角色选择 */
  roles?: ('system' | 'user' | 'assistant')[]
  
  /** 自定义过滤器 */
  filter?: (msg: Message) => boolean
  
  /** 限制数量 */
  limit?: number
  
  /** 是否只选择未处理的 */
  onlyUnprocessed?: boolean
}

/**
 * 从消息数组中选择符合条件的消息
 * 
 * @param messages 消息数组
 * @param selector 选择器配置
 * @returns 选中的消息数组
 */
export function selectMessages(messages: Message[], selector: MessageSelector): Message[] {
  let result = messages
  
  // 1. 按类型筛选
  if (selector.types && selector.types.length > 0) {
    result = result.filter(m => selector.types!.includes(m._meta.type))
  }
  
  // 2. 排除类型
  if (selector.excludeTypes && selector.excludeTypes.length > 0) {
    result = result.filter(m => !selector.excludeTypes!.includes(m._meta.type))
  }
  
  // 3. 按角色筛选
  if (selector.roles && selector.roles.length > 0) {
    result = result.filter(m => selector.roles!.includes(m.role))
  }
  
  // 4. 只选择未处理的
  if (selector.onlyUnprocessed) {
    result = result.filter(m => m._meta.needsProcessing && !m._meta.processed)
  }
  
  // 5. 自定义过滤器
  if (selector.filter) {
    result = result.filter(selector.filter)
  }
  
  // 6. 限制数量
  if (selector.limit && selector.limit > 0) {
    result = result.slice(0, selector.limit)
  }
  
  return result
}

/**
 * 选择所有文件消息
 */
export function selectFileMessages(messages: Message[], onlyUnprocessed = false): Message[] {
  return selectMessages(messages, {
    types: ['file'],
    onlyUnprocessed
  })
}

/**
 * 选择所有上下文消息
 */
export function selectContextMessages(messages: Message[], onlyUnprocessed = false): Message[] {
  return selectMessages(messages, {
    types: ['context'],
    onlyUnprocessed
  })
}

/**
 * 选择所有非提示词消息（用于规划和生成）
 */
export function selectNonPromptMessages(messages: Message[]): Message[] {
  return selectMessages(messages, {
    excludeTypes: ['prompt_card']
  })
}

/**
 * 选择用于发送的消息（去除元数据标记）
 */
export function selectForSending(messages: Message[]): Array<{ role: string; content: string }> {
  return messages.map(m => ({
    role: m.role,
    content: m.content
  }))
}

// 消息写入器
/**
 * 替换消息内容（原地修改）
 * 
 * @param message 要修改的消息
 * @param newContent 新内容
 * @param markAsProcessed 是否标记为已处理
 */
export function replaceContent(
  message: Message,
  newContent: string,
  markAsProcessed = true
): void {
  message.content = newContent
  if (markAsProcessed) {
    message._meta.processed = true
  }
}

/**
 * 替换消息内容并更改类型
 */
export function replaceWithType(
  message: Message,
  newContent: string,
  newType: MessageType
): void {
  message.content = newContent
  message._meta.type = newType
  message._meta.processed = true
  message._meta.needsProcessing = false
}

/**
 * 在消息数组中替换一段连续消息
 */
export function replaceRange(
  messages: Message[],
  startIndex: number,
  count: number,
  replacement: Message
): boolean {
  if (startIndex < 0 || startIndex >= messages.length) {
    return false
  }
  
  if (count < 1) {
    return false
  }
  
  // 删除原有消息，插入新消息
  messages.splice(startIndex, count, replacement)
  return true
}

/**
 * 在消息数组末尾追加消息
 */
export function appendMessage(messages: Message[], message: Message): void {
  messages.push(message)
}

/**
 * 在指定位置插入消息
 */
export function insertMessage(messages: Message[], index: number, message: Message): void {
  messages.splice(index, 0, message)
}

/**
 * 创建新消息
 */
export function createMessage(
  role: 'system' | 'user' | 'assistant',
  content: string,
  type: MessageType,
  needsProcessing = false
): Message {
  return {
    role,
    content,
    _meta: {
      type,
      needsProcessing,
      processed: !needsProcessing
    }
  }
}

// 消息查找工具
/**
 * 查找消息在数组中的索引
 */
export function findMessageIndex(messages: Message[], message: Message): number {
  return messages.indexOf(message)
}

/**
 * 查找连续的同类型消息的范围
 */
export function findMessageRange(
  messages: Message[],
  type: MessageType
): { start: number; count: number } | null {
  const firstIndex = messages.findIndex(m => m._meta.type === type)
  
  if (firstIndex === -1) {
    return null
  }
  
  let count = 1
  for (let i = firstIndex + 1; i < messages.length; i++) {
    if (messages[i]._meta.type === type) {
      count++
    } else {
      break
    }
  }
  
  return { start: firstIndex, count }
}

/**
 * 统计消息类型
 */
export function countMessageTypes(messages: Message[]): Record<string, number> {
  const counts: Record<string, number> = {}
  
  for (const msg of messages) {
    const type = msg._meta.type
    counts[type] = (counts[type] || 0) + 1
  }
  
  return counts
}

