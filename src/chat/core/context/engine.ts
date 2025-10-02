import type { AIConfig, ConversationTree, FlatMessage } from '../../types'
import { systemPrompt } from './system-prompt'
import type { 
  ContextMetadata, 
  RequestMessage, 
  TempContextPlacement 
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
 *     .insertSystemMessage('Custom prompt')
 *     .insertAfterSystem({ role: 'user', content: 'Context' })
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
   * 2. 添加临时上下文
   * 3. 限制历史消息数量
   * 4. 移除空消息
   * 5. 应用自定义操作符（如提示词卡片）
   * 6. 压缩所有消息内容
   * 
   * @param history 对话历史
   * @param config AI配置
   * @param tempContent 临时内容（可选）
   * @param tempPlacement 临时内容放置位置
   * @returns 最终的请求消息列表
   */
  buildRequestMessages(
    history: FlatMessage[],
    config: AIConfig,
    tempContent?: string,
    tempPlacement: TempContextPlacement = 'append'
  ): RequestMessage[] {
    const finalSystemPrompt = systemPrompt.getPrompt(config)

    // 使用 MessageEditor 构建消息
    let editor = MessageEditor.from(history)

    // 1. 注入 system 提示词
    editor = injectSystemPrompt(finalSystemPrompt)(editor)

    // 2. 添加临时上下文
    editor = addTemporaryContext(tempContent, tempPlacement)(editor)

    // 3. 限制历史消息数量
    editor = limitHistory(config.historyLimit)(editor)

    // 4. 移除空消息
    editor = removeEmptyMessages()(editor)

    // 5. 应用自定义操作符（包括提示词卡片操作符）
    for (const operator of this.customOperators) {
      editor = operator(editor)
    }

    // 6. 最后执行压缩（确保所有内容包括提示词卡片都被压缩）
    if (config.enableCompression) {
      editor = compressMessages()(editor)
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
   *     .insertSystemMessage('You are a translator')
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

