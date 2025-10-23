// ===== 上下文引擎相关类型定义 =====

/**
 * 临时上下文的插入位置
 * - append: 拼接到最后一条用户消息末尾
 * - after_system: 在 system 消息之后独立插入
 */
export type TempContextPlacement = 'append' | 'after_system'

/**
 * 上下文元数据（用于 UI 展示）
 */
export interface ContextMetadata {
  totalMessages: number          // 历史消息总数
  includedMessages: number        // 计入上下文的消息数
  excludedMessages: number        // 未计入的消息数
  inclusionMap: Map<string, boolean>  // 消息ID -> 是否计入
}

/**
 * 标准化的请求消息格式（OpenAI 风格）
 */
export interface RequestMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 带优先级的插入项（用于 after_system 模式的排序）
 * 数值越大，权重越高，插入位置越靠前
 */
export interface PrioritizedInsertion {
  priority: number
  message: RequestMessage
}

