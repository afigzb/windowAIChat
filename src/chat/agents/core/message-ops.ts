/**
 * 消息操作工具 - 线性流程专用版
 * 
 * 只保留实际使用的函数
 */

import type { Message, MessageType, MessageRole, MessageSelector, ApiMessage } from '../types'

// 重新导出类型
export type { MessageSelector }

/**
 * 从消息数组中选择符合条件的消息
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
 * 选择用于发送的消息（去除元数据标记）
 */
export function selectForSending(messages: Message[]): ApiMessage[] {
  return messages.map(m => ({
    role: m.role,
    content: m.content
  }))
}

/**
 * 替换消息内容（原地修改）
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
 * 创建新消息
 */
export function createMessage(
  role: MessageRole,
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
