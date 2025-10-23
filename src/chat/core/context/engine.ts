import type { AIConfig, ConversationTree, FlatMessage } from '../../types'
import { systemPrompt } from './system-prompt'
import type { 
  ContextMetadata, 
  RequestMessage, 
  TempContextPlacement,
  PrioritizedInsertion 
} from './types'
import { MessageEditor } from './message-editor'
import { 
  injectSystemPrompt,
  addTemporaryContext,
  limitHistory,
  removeEmptyMessages,
  compressMessages,
  type MessageOperator 
} from './message-operators'
import { promptCardManager } from '../../../prompt/prompt-manager'
import { isInOverrideMode } from './system-prompt'

/**
 * ContextEngine 统一管理消息上下文：
 * - 历史选择与截断
 * - system 提示词汇总
 * - 临时上下文的插入策略
 * - UI 可视化所需的上下文标记与统计
 * 
 * 设计原则：
 * 1. 单一职责：专注于上下文处理，不涉及网络请求或 UI 逻辑
 * 2. 可测试性：所有方法都是纯函数或无副作用
 * 3. 可扩展性：基于MessageEditor提供灵活的消息编辑能力
 * 
 * 新架构：
 * 原始数据 -> MessageEditor -> 应用操作符 -> 最终消息
 * 
 * @example
 * ```ts
 * // 获取 UI 展示所需的上下文元数据
 * const meta = contextEngine.getContextMetadataFromTree(tree, config)
 * 
 * // 构建最终请求消息（新方式）
 * const messages = contextEngine.buildRequestMessages(
 *   conversationHistory, config, tempContent, 'after_system'
 * )
 * 
 * // 自定义消息处理流程
 * const customMessages = contextEngine.buildWithCustomPipeline(
 *   conversationHistory,
 *   (editor) => editor
 *     .insert({ role: 'system', content: 'Custom prompt' }, 0)
 *     .insert({ role: 'user', content: 'Context' }, 1)
 *     .limit(10)
 * )
 * ```
 */
export class ContextEngine {
  private customOperators: MessageOperator[] = []

  /**
   * 注册自定义消息操作符
   * @param operator 消息操作符
   * @returns 取消注册的函数
   */
  registerOperator(operator: MessageOperator): () => void {
    this.customOperators.push(operator)
    return () => {
      const index = this.customOperators.indexOf(operator)
      if (index >= 0) {
        this.customOperators.splice(index, 1)
      }
    }
  }
  /**
   * 根据对话树与配置，计算上下文统计与每条消息是否计入上下文
   */
  getContextMetadataFromTree(tree: ConversationTree, config: AIConfig): ContextMetadata {
    const pathIds = tree.activePath
    const flat = tree.flatMessages

    const history = pathIds
      .map(id => flat.get(id))
      .filter((m): m is NonNullable<typeof m> => !!m)
      .filter(m => m.role === 'user' || m.role === 'assistant')

    const total = history.length
    const limit = Math.max(0, config.historyLimit || 0)
    const includedSlice = limit > 0 ? history.slice(-limit) : history
    const includedIds = new Set(includedSlice.map(m => m.id))

    const inclusionMap = new Map<string, boolean>()
    for (const m of history) {
      inclusionMap.set(m.id, includedIds.has(m.id))
    }

    return {
      totalMessages: total,
      includedMessages: includedSlice.length,
      excludedMessages: Math.max(0, total - includedSlice.length),
      inclusionMap
    }
  }


  /**
   * 构建标准化的请求消息
   * 这是完整的消息处理流程，包括所有转换步骤
   * 
   * 处理流程：
   * 1. 注入 system 提示词
   * 2. 限制历史消息数量
   * 3. 收集带优先级的插入项（文件内容、提示词卡片）
   * 4. 按优先级排序并插入到 after_system 位置
   * 5. 处理 append 模式的临时内容
   * 6. 移除空消息
   * 7. 压缩所有消息内容
   * 
   * @param history 对话历史
   * @param config AI配置
   * @param tempContent 临时内容（可选，向后兼容）
   * @param tempPlacement 临时内容放置位置
   * @param tempContentList 临时内容列表（用于独立插入模式）
   * @returns 最终的请求消息列表
   */
  buildRequestMessages(
    history: FlatMessage[],
    config: AIConfig,
    tempContent?: string,
    tempPlacement: TempContextPlacement = 'append',
    tempContentList?: string[]
  ): RequestMessage[] {
    const finalSystemPrompt = systemPrompt.getPrompt(config)

    // 使用 MessageEditor 构建消息
    let editor = MessageEditor.from(history)

    // 1. 注入 system 提示词
    editor = injectSystemPrompt(finalSystemPrompt)(editor)

    // 2. 限制历史消息数量
    editor = limitHistory(config.historyLimit)(editor)

    // 3. 移除空消息（提前执行，清理历史）
    editor = removeEmptyMessages()(editor)

    // 4. 如果是 after_system 模式，收集所有需要优先级排序的插入项
    if (tempPlacement === 'after_system') {
      // 使用 Map 按优先级分组，每个优先级包含文件和卡片两个数组
      const priorityGroups = new Map<number, { files: string[], cards: string[] }>()
      
      // 收集文件内容插入项
      const fileMode = config.fileContentMode || 'merged'
      const filePriority = config.fileContentPriority ?? 10
      
      if (fileMode === 'separate' && tempContentList && tempContentList.length > 0) {
        // 独立模式：每个文件单独插入，共用优先级，按数组顺序
        if (!priorityGroups.has(filePriority)) {
          priorityGroups.set(filePriority, { files: [], cards: [] })
        }
        priorityGroups.get(filePriority)!.files = tempContentList.filter(c => c.trim())
      } else if (tempContent && tempContent.trim()) {
        // 合并模式：所有文件合并为一条消息
        if (!priorityGroups.has(filePriority)) {
          priorityGroups.set(filePriority, { files: [], cards: [] })
        }
        priorityGroups.get(filePriority)!.files = [tempContent]
      }
      
      // 收集提示词卡片插入项（仅 after_system 位置的）
      if (!isInOverrideMode()) {
        const enabledCards = promptCardManager.getEnabledCards()
        for (const card of enabledCards) {
          if (card.placement === 'after_system') {
            if (!priorityGroups.has(card.priority)) {
              priorityGroups.set(card.priority, { files: [], cards: [] })
            }
            priorityGroups.get(card.priority)!.cards.push(card.content)
          }
        }
      }
      
      // 按优先级降序排序
      const sortedPriorities = Array.from(priorityGroups.keys()).sort((a, b) => b - a)
      
      // 统一插入到 after_system 位置
      const afterSystemIndex = editor.findIndex(m => m.role !== 'system')
      let insertPosition = afterSystemIndex >= 0 ? afterSystemIndex : editor.count()
      
      // 按优先级顺序处理每组
      for (const priority of sortedPriorities) {
        const group = priorityGroups.get(priority)!
        
        // 先插入该优先级的所有文件（保持独立）
        for (const fileContent of group.files) {
          editor = editor.insert({ role: 'user', content: fileContent }, insertPosition)
          insertPosition++
        }
        
        // 再插入该优先级的所有卡片（合并为一条消息）
        if (group.cards.length > 0) {
          const mergedCardContent = group.cards.join('\n\n')
          editor = editor.insert({ role: 'user', content: mergedCardContent }, insertPosition)
          insertPosition++
        }
      }
    } else {
      // append 模式：直接追加到最后一条用户消息
      editor = addTemporaryContext(tempContent, tempPlacement)(editor)
    }
    
    // 5. 处理其他位置的提示词卡片（system 和 user_end）
    if (!isInOverrideMode()) {
      const enabledCards = promptCardManager.getEnabledCards()
      
      // 处理 system 位置的卡片
      const systemCards = enabledCards.filter((card) => card.placement === 'system')
      if (systemCards.length > 0) {
        const combinedContent = systemCards.map((c) => c.content).join('\n\n')
        const systemIndex = editor.findIndex(m => m.role === 'system')
        if (systemIndex >= 0) {
          editor = editor.modifyAt(systemIndex, m => ({
            ...m,
            content: m.content + '\n\n' + combinedContent
          }))
        } else {
          editor = editor.insert({ role: 'system', content: combinedContent }, 0)
        }
      }
      
      // 处理 user_end 位置的卡片
      const userEndCards = enabledCards.filter((card) => card.placement === 'user_end')
      if (userEndCards.length > 0) {
        const combinedContent = '\n\n' + userEndCards.map((c) => c.content).join('\n\n')
        const lastUserIndex = editor.findLastIndex(m => m.role === 'user')
        if (lastUserIndex >= 0) {
          editor = editor.modifyAt(lastUserIndex, m => ({
            ...m,
            content: m.content + combinedContent
          }))
        }
      }
    }

    // 6. 应用其他自定义操作符（提示词卡片已直接处理）
    // 注意：提示词卡片操作符已被移除，现在由 engine 直接处理
    for (const operator of this.customOperators) {
      editor = operator(editor)
    }

    // 7. 最后执行压缩（确保所有内容包括提示词卡片都被压缩）
    if (config.enableCompression) {
      editor = compressMessages(config.compressionOptions)(editor)
    }

    return editor.build()
  }

  /**
   * 使用自定义处理流程构建消息
   * 这是最灵活的方式，允许完全自定义消息处理逻辑
   * 
   * @param history 对话历史
   * @param pipeline 自定义处理流程
   * @returns 最终的请求消息列表
   * 
   * @example
   * ```ts
   * const messages = contextEngine.buildWithCustomPipeline(history, (editor) =>
   *   editor
   *     .insert({ role: 'system', content: 'You are a translator' }, 0)
   *     .removeWhere(msg => msg.content.length > 1000)
   *     .limit(5)
   * )
   * ```
   */
  buildWithCustomPipeline(
    history: FlatMessage[],
    pipeline: (editor: MessageEditor) => MessageEditor
  ): RequestMessage[] {
    const editor = MessageEditor.from(history)
    return pipeline(editor).build()
  }

  /**
   * 创建消息编辑器
   * 这是低级API，提供对MessageEditor的直接访问
   * 
   * @param history 对话历史
   * @returns MessageEditor实例
   */
  createEditor(history: FlatMessage[]): MessageEditor {
    return MessageEditor.from(history)
  }
}

export const contextEngine = new ContextEngine()

