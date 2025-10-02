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

/**
 * 添加临时上下文
 * @param tempContent 临时内容
 * @param placement 放置位置
 */
export function addTemporaryContext(
  tempContent: string | undefined,
  placement: 'append' | 'after_system' | 'prepend' = 'append'
): MessageOperator {
  return (editor) => {
    const trimmed = tempContent?.trim()
    if (!trimmed) return editor

    switch (placement) {
      case 'after_system':
        // 在system消息之后插入独立的上下文消息
        return editor.insertAfterSystem({
          role: 'user',
          content: `【上下文】\n${trimmed}`
        })

      case 'append':
        // 追加到最后一条用户消息
        return editor.appendToLastUserMessage('\n\n' + trimmed)

      case 'prepend':
        // 插入到所有消息之前（system之后）
        return editor.insertAfterSystem({
          role: 'user',
          content: trimmed
        })

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

    if (placement === 'after_system') {
      return editor.insertAfterSystem({
        role: 'user',
        content: contextMessage
      })
    } else {
      return editor.appendToLastUserMessage('\n\n' + contextMessage)
    }
  }
}

/**
 * 添加对话历史摘要
 * @param summaryContent 摘要内容
 */
export function addSummaryContext(summaryContent: string | undefined): MessageOperator {
  return (editor) => {
    const trimmed = summaryContent?.trim()
    if (!trimmed) return editor

    return editor.insertAfterSystem({
      role: 'user',
      content: `【对话历史摘要】\n${trimmed}`
    })
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
 * 应用配置中的所有规则
 * 这是一个便捷函数，应用标准的消息处理流程
 * 
 * 处理顺序：
 * 1. 注入 system 提示词
 * 2. 添加临时上下文
 * 3. 限制历史消息数量
 * 4. 移除空消息
 * 5. 压缩所有消息内容（如果启用）- **包括 system、user、assistant 全部角色**
 */
export function applyStandardPipeline(
  config: AIConfig,
  systemPrompt: string,
  tempContent?: string,
  tempPlacement: 'append' | 'after_system' = 'append'
): MessageOperator {
  return (editor) => {
    let result = editor
    // 1. 注入 system 提示词
    result = injectSystemPrompt(systemPrompt)(result)
    // 2. 添加临时上下文
    result = addTemporaryContext(tempContent, tempPlacement)(result)
    // 3. 限制历史消息数量
    result = limitHistory(config.historyLimit)(result)
    // 4. 移除空消息
    result = removeEmptyMessages()(result)
    // 5. 压缩所有消息（system/user/assistant 全部压缩，移除多余空格和换行）
    if (config.enableCompression) {
      result = compressMessages()(result)
    }
    return result
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

/**
 * 压缩特定角色的消息
 * @param role 要压缩的消息角色
 * @param options 压缩选项
 */
export function compressMessagesByRole(
  role: 'user' | 'assistant' | 'system',
  options?: TextCompressionOptions
): MessageOperator {
  return (editor) => {
    return editor.transform((messages) => {
      return messages.map(msg => {
        if (msg.role === role) {
          return {
            ...msg,
            content: compressText(msg.content, options)
          }
        }
        return msg
      })
    })
  }
}

