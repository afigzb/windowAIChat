// ===== 基础类型 =====

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system'

// 对话模式
export type ChatMode = 'v3' | 'r1'

// ===== 消息相关 =====

// 扁平结构的聊天消息
export interface FlatMessage {
  id: string
  content: string
  role: MessageRole
  timestamp: Date
  reasoning_content?: string  // R1模式的思考过程
  parentId: string | null     // 父消息ID，根消息为null
}

// 树结构的聊天消息节点
export interface MessageNode {
  id: string
  content: string
  role: MessageRole
  timestamp: Date
  reasoning_content?: string
  parentId: string | null
  children: MessageNode[]     // 子节点列表
  depth: number              // 节点深度（根节点为0）
}

// 对话树状态
export interface ConversationTree {
  flatMessages: Map<string, FlatMessage>  // 扁平存储：id -> message
  rootNodes: MessageNode[]                // 根节点列表（通常只有一个系统消息或欢迎消息）
  activePath: string[]                    // 当前激活路径：从根到叶子的消息ID序列
}

// 分支导航信息
export interface BranchNavigation {
  currentIndex: number      // 当前分支在同级中的索引
  totalBranches: number     // 同级分支总数
  canNavigateLeft: boolean  // 是否可以向左切换
  canNavigateRight: boolean // 是否可以向右切换
}

// 重新生成上下文
export interface RegenerateContext {
  targetNodeId: string      // 要重新生成的目标节点ID
  parentNodeId: string      // 父节点ID
  conversationHistory: FlatMessage[]  // 到目标节点为止的对话历史
}

// ===== API相关 =====

// DeepSeek 流式响应
export interface DeepSeekStreamResponse {
  choices: Array<{
    delta: {
      content?: string
      reasoning_content?: string
    }
  }>
}

// ===== 配置相关 =====

// AI配置类型
export interface AIConfig {
  v3Config: {
    temperature: number
    maxTokens: number
  }
  r1Config: {
    maxTokens: number
  }
  showThinking: boolean
  apiKey: string           // API密钥
  historyLimit: number     // 保留的对话历史数量（消息条数）
  systemPrompt: string     // 系统提示词
}

// ===== 组件Props =====

// 聊天页面属性（暂时保留接口以保持兼容性）
export interface ChatPageProps {
  // 已删除onBack属性
}

// 消息气泡属性（优化后）
export interface MessageBubbleProps {
  node: MessageNode
  onRegenerate?: (nodeId: string) => void
  onEditUserMessage?: (nodeId: string, newContent: string) => void
  branchNavigation?: BranchNavigation
  onBranchNavigate?: (direction: 'left' | 'right') => void
  isInActivePath: boolean
  showBranchControls: boolean
  // 实时生成状态
  isGenerating?: boolean
  currentThinking?: string
  currentAnswer?: string
  showThinking?: boolean
}

// ===== 工具函数类型 =====

// 树构建器
export interface TreeBuilder {
  buildTreeFromFlat: (flatMessages: Map<string, FlatMessage>) => MessageNode[]
  getConversationHistory: (targetNodeId: string, flatMessages: Map<string, FlatMessage>) => FlatMessage[]
  findNode: (nodeId: string, roots: MessageNode[]) => MessageNode | null
  getBranchNavigation: (nodeId: string, activePath: string[], roots: MessageNode[]) => BranchNavigation
} 