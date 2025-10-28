// ===== 基础类型 =====

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system'


// ===== 消息相关 =====

// Agent 任务结果（UI 展示专用）
export interface AgentTaskResultForUI {
  success: boolean
  optimizedInput?: string      // 优化后的输入（如果有）
  displayResult?: string       // 展示结果
  metadata?: {
    taskType: string
    originalInput?: string
    processingTime: number
    error?: string
    changes?: string
  }
}

// 消息组件：区分不同类型的内容来源
export interface MessageComponents {
  userInput?: string           // 用户真实输入（仅 user 消息）
  optimizedInput?: string      // Agent优化后的输入（用于发送给AI，不显示给用户）
  attachedFiles?: string[]     // 附加的文件内容列表
  promptCards?: {              // 使用的提示词卡片
    id: string
    title: string
    content: string
    placement: 'system' | 'after_system' | 'user_end'
  }[]
  systemPrompt?: string        // 使用的系统提示词（仅 system 消息或第一条 user 消息）
  agentResults?: AgentTaskResultForUI[]  // Agent 处理结果（用于 UI 展示）
  // 未来可扩展：
  // contextSnapshot?: string  // 上下文快照
  // toolCalls?: ToolCall[]    // 工具调用记录
}

// 扁平结构的聊天消息
export interface FlatMessage {
  id: string
  content: string              // 合并后的完整内容（用于快速访问和向后兼容）
  role: MessageRole
  timestamp: Date
  reasoning_content?: string   // 思考过程（支持思考的模型使用）
  parentId: string | null      // 父消息ID，根消息为null
  
  // 结构化内容组件（新增）
  components?: MessageComponents  // 可选，旧消息可能没有
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
  
  // 结构化内容组件（新增）
  components?: MessageComponents  // 可选，旧消息可能没有
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

// ===== API相关 =====

// OpenAI 格式的流式响应（适用于OpenAI兼容的API）
export interface ChatStreamResponse {
  choices: Array<{
    delta: {
      content?: string
      reasoning_content?: string
    }
  }>
}

// ===== 配置相关 =====

// 提供商类型
export type ProviderType = 'openai' | 'gemini'

// 通用提供方配置
export interface ApiProviderConfig {
  id: string               // 配置唯一标识
  name: string             // 配置显示名称
  type: ProviderType       // 提供商类型（手动指定）
  baseUrl: string          // 完整的聊天补全接口URL
  apiKey: string           // API密钥
  model: string            // 模型名称
  maxTokens?: number       // 最大输出令牌数（可选）
  extraHeaders?: Record<string, string>  // 额外请求头
  extraParams?: Record<string, any>      // 额外请求体参数
  // 代码配置模式
  enableCodeConfig?: boolean             // 是否启用代码配置模式
  codeConfigJson?: string               // 用户填写的原始JSON字符串
}

// AI配置类型（精细参数已废弃）
export interface AIConfig {
  currentProviderId: string              // 当前使用的API配置ID
  providers: ApiProviderConfig[]         // 可用的API配置列表
  historyLimit: number
  systemPrompt: string
  summarizePrompt?: string               // 概括功能的系统提示词（可选，为空则使用默认）
  enableCompression?: boolean            // 是否启用消息内容压缩（移除多余空白、压缩换行等）
  compressionOptions?: import('./core/context/text-compressor').TextCompressionOptions  // 压缩选项配置
  fileContentPlacement?: 'append' | 'after_system'  // 选中文件内容的插入位置（默认：append）
  fileContentPriority?: number           // 文件内容优先级（数值越大权重越高，默认：10）
  fileContentMode?: 'merged' | 'separate'  // 文件插入模式：merged-合并为一条，separate-独立插入（默认：merged）
  agentConfig?: import('./agents').AgentPipelineConfig  // Agent 系统配置（可选）
}

// ===== 组件Props =====

// 消息气泡属性（优化后）
export interface MessageBubbleProps {
  node: MessageNode
  onRegenerate?: (nodeId: string) => void
  onEditUserMessage?: (nodeId: string, newContent: string) => void
  onEditAssistantMessage?: (nodeId: string, newContent: string) => void
  onDelete?: (nodeId: string) => void
  branchNavigation?: BranchNavigation
  onBranchNavigate?: (direction: 'left' | 'right') => void
  isInActivePath: boolean
  showBranchControls: boolean
  // 实时生成状态
  isGenerating?: boolean
  currentThinking?: string
  currentAnswer?: string
  currentAgentOptimizing?: string  // Agent 优化过程的实时内容
  // 是否计入本次上下文（基于 historyLimit 计算）
  isInContext?: boolean
}

// ===== 工具函数类型 =====