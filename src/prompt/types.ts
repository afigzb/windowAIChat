/**
 * 提示词卡片插入位置
 */
export type PromptCardPlacement = 
  | 'system'           // 追加到system消息
  | 'after_system'     // 在system消息之后独立插入
  | 'user_end'         // 追加到最后一条user消息末尾

/**
 * 提示词卡片
 */
export interface PromptCard {
  id: string
  title: string          // 卡片标题
  content: string        // 提示词内容
  placement: PromptCardPlacement  // 插入位置
  enabled: boolean       // 是否启用
  order: number          // 排序顺序（数字越小越靠前）
  priority: number       // 优先级（数值越大权重越高，越靠前）默认5
  createdAt: number      // 创建时间戳
  updatedAt: number      // 更新时间戳
}

/**
 * 提示词卡片的创建参数
 */
export interface CreatePromptCardParams {
  title: string
  content: string
  placement?: PromptCardPlacement
  enabled?: boolean
}

/**
 * 提示词卡片的更新参数
 */
export interface UpdatePromptCardParams {
  title?: string
  content?: string
  placement?: PromptCardPlacement
  enabled?: boolean
  priority?: number
}

