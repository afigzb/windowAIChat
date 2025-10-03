import type { MessageOperator, ContextEngine } from '../chat/core/context'
import { isInOverrideMode } from '../chat/core/context'
import { promptCardManager } from './prompt-manager'
import type { PromptCardPlacement } from './types'

/**
 * 创建提示词卡片操作符
 * 将启用的提示词卡片按照其配置的位置插入到消息流中
 * 
 * 注意：如果系统提示词处于覆盖模式（如概括功能），则不会应用卡片
 * 
 * @returns MessageOperator
 * 
 * @example
 * ```ts
 * // 在ContextEngine中注册
 * contextEngine.registerOperator(createPromptCardOperator())
 * ```
 */
export function createPromptCardOperator(): MessageOperator {
  return (editor) => {
    // 如果处于覆盖模式（如概括功能），跳过卡片应用
    if (isInOverrideMode()) {
      return editor
    }

    // 获取所有启用的卡片（已按order排序）
    const enabledCards = promptCardManager.getEnabledCards()
    
    if (enabledCards.length === 0) {
      return editor
    }

    // 按插入位置分组
    const cardsByPlacement: Record<PromptCardPlacement, string[]> = {
      system: [],
      after_system: [],
      user_end: []
    }

    for (const card of enabledCards) {
      cardsByPlacement[card.placement].push(card.content)
    }

    // 1. 处理 system 位置的卡片（追加到system消息）
    let result = editor
    if (cardsByPlacement.system.length > 0) {
      const combinedContent = cardsByPlacement.system.join('\n\n')
      const systemIndex = result.findIndexWhere(m => m.role === 'system')
      if (systemIndex >= 0) {
        result = result.modifyAt(systemIndex, m => ({
          ...m,
          content: m.content + '\n\n' + combinedContent
        }))
      } else {
        // 如果没有system消息，则在开头插入一条
        result = result.prepend({ role: 'system', content: combinedContent })
      }
    }

    // 2. 处理 after_system 位置的卡片（在system后独立插入）
    if (cardsByPlacement.after_system.length > 0) {
      for (const content of cardsByPlacement.after_system) {
        result = result.insertAfterSystem({ role: 'user', content })
      }
    }

    // 3. 处理 user_end 位置的卡片（追加到最后一条user消息）
    if (cardsByPlacement.user_end.length > 0) {
      const combinedContent = '\n\n' + cardsByPlacement.user_end.join('\n\n')
      const lastUserIndex = result.findLastIndexWhere(m => m.role === 'user')
      if (lastUserIndex >= 0) {
        result = result.modifyAt(lastUserIndex, m => ({
          ...m,
          content: m.content + combinedContent
        }))
      }
    }

    return result
  }
}

/**
 * 初始化提示词功能
 * 自动将提示词操作符注册到ContextEngine
 * 
 * @param contextEngine ContextEngine实例
 * @returns 取消注册的函数
 */
export function initializePromptCards(contextEngine: ContextEngine): () => void {
  // 注册操作符
  return contextEngine.registerOperator(createPromptCardOperator())
}

