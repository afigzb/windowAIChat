import type { 
  FlatMessage, 
  ConversationTree,
  StreamCallbacks
} from '../types'

// 重新导出 StreamCallbacks 供其他模块使用（现在从 types.ts 导入）
export type { StreamCallbacks }

/**
 * 对话管理器的状态接口
 */
export interface ConversationState {
  conversationTree: ConversationTree
  inputValue: string
  isLoading: boolean
  currentThinking: string
  currentAnswer: string
  currentAgentOptimizing: string  // Agent 优化过程中的实时内容
}

/**
 * 对话管理器的操作接口
 */
export interface ConversationActions {
  sendMessage: (content: string, parentNodeId?: string | null, tempContent?: string, tempPlacement?: 'append' | 'after_system', tempContentList?: string[]) => Promise<void>
  editUserMessage: (nodeId: string, newContent: string, tempContent?: string, tempPlacement?: 'append' | 'after_system', tempContentList?: string[]) => Promise<void>
  editAssistantMessage: (nodeId: string, newContent: string) => void
  deleteNode: (nodeId: string) => void
  updateInputValue: (value: string) => void
  abortRequest: () => void
  clearStreamState: () => void
  updateConversationTree: (flatMessages: Map<string, FlatMessage>, activePath: string[]) => void
  updateActivePath: (newPath: string[]) => void
}

