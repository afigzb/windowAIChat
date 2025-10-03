import type { MessageEditor } from './message-editor'
import type { AIConfig } from '../../types'
import { compressText, type TextCompressionOptions } from './text-compressor'

/**
 * ===== 消息操作符 =====
 * 定义常见的消息转换操作，可组合使用
 * 
 * 操作符是函数，接收MessageEditor并返回新的MessageEditor
 * 这样可以轻松组合和复用各种消息处理逻辑
 * 
 * @example
 * ```ts
 * const editor = MessageEditor.from(history)
 *   .transform(injectSystemPrompt(config))
 *   .transform(addTemporaryContext(tempContent, 'after_system'))
 *   .transform(limitHistory(config.historyLimit))
 * ```
 */

export type MessageOperator = (editor: MessageEditor) => MessageEditor

/**
 * 注入system提示词
 * @param systemPrompt system提示词内容
 * @param position 插入位置，默认0（开头）
 */
export function injectSystemPrompt(systemPrompt: string, position: number = 0): MessageOperator {
  return (editor) => {
    if (!systemPrompt.trim()) return editor
    
    // 移除已有的system消息，然后插入新的
    return editor
      .removeByRole('system')
      .insertSystemMessage(systemPrompt, position)
  }
}

/**
 * 追加system提示词（不移除已有的）
 */
export function appendSystemPrompt(systemPrompt: string): MessageOperator {
  return (editor) => {
    if (!systemPrompt.trim()) return editor
    return editor.appendToSystemMessage(systemPrompt)
  }
}

// ===== 基础插入操作符（位置相关，内容无关） =====

/**
 * 追加内容到最后一条用户消息
 * @param content 要追加的内容
 * @param separator 分隔符，默认 '\n\n'
 */
export function appendToLastUser(content: string, separator: string = '\n\n'): MessageOperator {
  return (editor) => {
    if (!content.trim()) return editor
    return editor.appendToLastUserMessage(separator + content)
  }
}

/**
 * 在 system 消息后插入用户消息
 * @param content 消息内容
 */
export function insertUserAfterSystem(content: string): MessageOperator {
  return (editor) => {
    if (!content.trim()) return editor
    return editor.insertAfterSystem({
      role: 'user',
      content
    })
  }
}

/**
 * 在 system 消息后插入助手消息
 * @param content 消息内容
 */
export function insertAssistantAfterSystem(content: string): MessageOperator {
  return (editor) => {
    if (!content.trim()) return editor
    return editor.insertAfterSystem({
      role: 'assistant',
      content
    })
  }
}

/**
 * 在 system 消息后插入任意角色的消息
 * @param message 完整的消息对象
 */
export function insertMessageAfterSystem(message: { role: 'user' | 'assistant'; content: string }): MessageOperator {
  return (editor) => {
    if (!message.content.trim()) return editor
    return editor.insertAfterSystem(message)
  }
}

// ===== 临时上下文操作符（业务层，使用基础操作符） =====

/**
 * 临时内容格式化器
 */
export type TempContentFormatter = (content: string) => string

/**
 * 默认的临时内容格式化器（添加【上下文】标记）
 */
export const defaultTempFormatter: TempContentFormatter = (content: string) => {
  return `【上下文】\n${content}`
}

/**
 * 无格式化（直接使用原内容）
 */
export const noFormatter: TempContentFormatter = (content: string) => content

/**
 * 添加临时上下文（解耦版）
 * 
 * 设计理念：
 * - 分离关注点：位置策略 vs 内容格式化
 * - 使用基础插入操作符组合实现
 * - 支持自定义格式化器
 * 
 * @param tempContent 临时内容
 * @param placement 放置位置
 * @param formatter 内容格式化器，默认添加【上下文】标记
 */
export function addTemporaryContext(
  tempContent: string | undefined,
  placement: 'append' | 'after_system' | 'prepend' = 'append',
  formatter: TempContentFormatter = defaultTempFormatter
): MessageOperator {
  return (editor) => {
    const trimmed = tempContent?.trim()
    if (!trimmed) return editor

    // 根据 placement 选择合适的基础插入操作符
    switch (placement) {
      case 'after_system':
        // 使用格式化器处理内容，然后插入
        const formattedContent = formatter(trimmed)
        return insertUserAfterSystem(formattedContent)(editor)

      case 'append':
        // 直接追加，不使用格式化器（保持原有行为）
        return appendToLastUser(trimmed)(editor)

      case 'prepend':
        // 前置插入，不使用格式化器
        return insertUserAfterSystem(trimmed)(editor)

      default:
        return editor
    }
  }
}

/**
 * 限制历史消息数量（保留最后N条非system消息）
 */
export function limitHistory(limit: number): MessageOperator {
  return (editor) => {
    if (limit <= 0) return editor
    return editor.limit(limit)
  }
}

/**
 * 添加文件上下文
 * 使用基础插入操作符重构，清晰分离位置和格式化逻辑
 * 
 * @param filesContent 文件内容
 * @param placement 放置位置
 */
export function addFileContext(
  filesContent: string | undefined,
  placement: 'after_system' | 'append' = 'after_system'
): MessageOperator {
  return (editor) => {
    const trimmed = filesContent?.trim()
    if (!trimmed) return editor

    const contextMessage = `【文件内容】\n${trimmed}`

    // 使用基础插入操作符
    if (placement === 'after_system') {
      return insertUserAfterSystem(contextMessage)(editor)
    } else {
      return appendToLastUser(contextMessage)(editor)
    }
  }
}

/**
 * 添加对话历史摘要
 * 使用基础插入操作符重构
 * 
 * @param summaryContent 摘要内容
 */
export function addSummaryContext(summaryContent: string | undefined): MessageOperator {
  return (editor) => {
    const trimmed = summaryContent?.trim()
    if (!trimmed) return editor

    const formattedContent = `【对话历史摘要】\n${trimmed}`
    return insertUserAfterSystem(formattedContent)(editor)
  }
}

/**
 * 确保system消息存在（如果不存在则添加默认的）
 */
export function ensureSystemMessage(defaultPrompt: string = '你是一个有帮助的AI助手。'): MessageOperator {
  return (editor) => {
    if (editor.hasRole('system')) {
      return editor
    }
    return editor.insertSystemMessage(defaultPrompt, 0)
  }
}

/**
 * 过滤空消息
 */
export function removeEmptyMessages(): MessageOperator {
  return (editor) => {
    return editor.removeWhere((msg) => !msg.content || !msg.content.trim())
  }
}

/**
 * 合并连续的相同角色消息
 */
export function mergeConsecutiveSameRole(): MessageOperator {
  return (editor) => {
    return editor.transform((messages) => {
      if (messages.length === 0) return messages

      const result = [messages[0]]
      for (let i = 1; i < messages.length; i++) {
        const prev = result[result.length - 1]
        const curr = messages[i]

        if (prev.role === curr.role) {
          // 合并到前一条消息
          prev.content += '\n\n' + curr.content
        } else {
          result.push({ ...curr })
        }
      }

      return result
    })
  }
}

/**
 * 组合多个操作符
 */
export function compose(...operators: MessageOperator[]): MessageOperator {
  return (editor) => {
    return operators.reduce((acc, op) => op(acc), editor)
  }
}

/**
 * 条件应用操作符
 */
export function when(condition: boolean, operator: MessageOperator): MessageOperator {
  return (editor) => {
    return condition ? operator(editor) : editor
  }
}

/**
 * 压缩消息内容
 * 使用文本压缩工具减少消息内容的大小
 * @param options 压缩选项
 */
export function compressMessages(options?: TextCompressionOptions): MessageOperator {
  return (editor) => {
    return editor.transform((messages) => {
      return messages.map(msg => ({
        ...msg,
        content: compressText(msg.content, options)
      }))
    })
  }
}

