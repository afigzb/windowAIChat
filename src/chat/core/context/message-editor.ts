import type { FlatMessage } from '../../types'
import type { RequestMessage } from './types'

/**
 * ===== 消息编辑器 =====
 * 提供灵活的消息编辑能力，支持对消息列表进行各种操作
 * 
 * 设计理念：
 * 1. 链式调用：所有操作返回新的编辑器实例，支持链式调用
 * 2. 不可变性：所有操作不修改原始数据，返回新的消息列表
 * 3. 精简核心：只保留核心方法，避免冗余的语法糖
 * 
 * 核心操作模式：
 * - insert(message, position): 在指定位置插入
 * - removeAt(position) / removeWhere(predicate): 按位置或条件删除
 * - modifyAt(position, fn) / modifyWhere(predicate, fn): 按位置或条件修改
 * 
 * @example
 * ```ts
 * const editor = MessageEditor.from(conversationHistory)
 *   .insert({ role: 'system', content: 'You are a helpful assistant' }, 0)
 *   .insert({ role: 'user', content: 'Context: ...' }, 1)
 *   .modifyAt(-1, msg => ({ ...msg, content: msg.content + '\n额外内容' }))
 *   .removeWhere(m => m.role === 'system' && m.content === '')
 *   .limit(10)
 * 
 * const finalMessages = editor.build()
 * ```
 */
export class MessageEditor {
  private messages: RequestMessage[]

  private constructor(messages: RequestMessage[]) {
    this.messages = [...messages]
  }

  /**
   * 从FlatMessage列表创建编辑器
   */
  static from(flatMessages: FlatMessage[]): MessageEditor {
    const requestMessages: RequestMessage[] = flatMessages
      .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }))
    return new MessageEditor(requestMessages)
  }

  /**
   * 从RequestMessage列表创建编辑器
   */
  static fromRequestMessages(messages: RequestMessage[]): MessageEditor {
    return new MessageEditor(messages)
  }

  /**
   * 创建空编辑器
   */
  static empty(): MessageEditor {
    return new MessageEditor([])
  }

  // ===== 插入操作 =====

  /**
   * 在指定位置插入消息
   * @param message 要插入的消息
   * @param position 插入位置（0表示开头，负数表示从末尾倒数）
   */
  insert(message: RequestMessage, position: number): MessageEditor {
    const newMessages = [...this.messages]
    const actualPosition = position < 0 
      ? Math.max(0, newMessages.length + position + 1)
      : Math.min(position, newMessages.length)
    newMessages.splice(actualPosition, 0, message)
    return new MessageEditor(newMessages)
  }

  /**
   * 在末尾追加消息
   */
  append(message: RequestMessage): MessageEditor {
    return new MessageEditor([...this.messages, message])
  }

  // ===== 删除操作 =====

  /**
   * 删除指定位置的消息
   * @param position 位置索引（支持负数，-1表示最后一条）
   */
  removeAt(position: number): MessageEditor {
    const newMessages = [...this.messages]
    const actualPosition = position < 0 ? newMessages.length + position : position
    if (actualPosition >= 0 && actualPosition < newMessages.length) {
      newMessages.splice(actualPosition, 1)
    }
    return new MessageEditor(newMessages)
  }

  /**
   * 根据条件删除消息
   */
  removeWhere(predicate: (message: RequestMessage, index: number) => boolean): MessageEditor {
    const newMessages = this.messages.filter((m, i) => !predicate(m, i))
    return new MessageEditor(newMessages)
  }

  // ===== 修改操作 =====

  /**
   * 修改指定位置的消息
   * @param position 位置索引（支持负数，-1表示最后一条）
   */
  modifyAt(position: number, modifier: (message: RequestMessage) => RequestMessage): MessageEditor {
    const newMessages = [...this.messages]
    const actualPosition = position < 0 ? newMessages.length + position : position
    if (actualPosition >= 0 && actualPosition < newMessages.length) {
      newMessages[actualPosition] = modifier(newMessages[actualPosition])
    }
    return new MessageEditor(newMessages)
  }

  /**
   * 根据条件修改消息
   */
  modifyWhere(
    predicate: (message: RequestMessage, index: number) => boolean,
    modifier: (message: RequestMessage) => RequestMessage
  ): MessageEditor {
    const newMessages = this.messages.map((m, i) => 
      predicate(m, i) ? modifier(m) : m
    )
    return new MessageEditor(newMessages)
  }

  // ===== 查询操作 =====

  /**
   * 查找第一个满足条件的消息索引
   */
  findIndex(predicate: (message: RequestMessage, index: number) => boolean): number {
    return this.messages.findIndex(predicate)
  }

  /**
   * 查找最后一个满足条件的消息索引
   */
  findLastIndex(predicate: (message: RequestMessage, index: number) => boolean): number {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (predicate(this.messages[i], i)) {
        return i
      }
    }
    return -1
  }

  // ===== 截断与限制 =====

  /**
   * 保留最后N条非system消息（system消息始终保留）
   */
  limit(count: number): MessageEditor {
    if (count <= 0) return this

    const systemMessages = this.messages.filter(m => m.role === 'system')
    const nonSystemMessages = this.messages.filter(m => m.role !== 'system')
    const limitedNonSystem = nonSystemMessages.slice(-count)

    return new MessageEditor([...systemMessages, ...limitedNonSystem])
  }

  /**
   * 保留最前面N条消息
   */
  takeFirst(count: number): MessageEditor {
    return new MessageEditor(this.messages.slice(0, count))
  }

  /**
   * 保留最后N条消息
   */
  takeLast(count: number): MessageEditor {
    return new MessageEditor(this.messages.slice(-count))
  }

  /**
   * 跳过前N条消息
   */
  skip(count: number): MessageEditor {
    return new MessageEditor(this.messages.slice(count))
  }

  // ===== 高级操作 =====

  /**
   * 应用自定义转换函数
   */
  transform(transformer: (messages: RequestMessage[]) => RequestMessage[]): MessageEditor {
    return new MessageEditor(transformer(this.messages))
  }

  /**
   * 合并另一个编辑器的消息
   */
  merge(other: MessageEditor): MessageEditor {
    return new MessageEditor([...this.messages, ...other.messages])
  }

  /**
   * 如果条件为真，则应用操作
   */
  when(condition: boolean, operation: (editor: MessageEditor) => MessageEditor): MessageEditor {
    return condition ? operation(this) : this
  }

  // ===== 输出 =====

  /**
   * 构建最终的消息列表
   */
  build(): RequestMessage[] {
    return [...this.messages]
  }

  /**
   * 获取消息数量
   */
  count(): number {
    return this.messages.length
  }

  /**
   * 克隆当前编辑器
   */
  clone(): MessageEditor {
    return new MessageEditor(this.messages)
  }
}

