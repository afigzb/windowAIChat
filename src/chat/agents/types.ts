/**
 * Agents 系统类型定义（线性流程版）
 * 
 * 核心流程：
 * 1. 输入：用户输入 + 对话历史 + 附件文件 + 提示词卡片
 * 2. 预处理：文件概括 + 上下文概括（减少token消耗）
 * 3. 生成：直接调用AI生成答案
 * 4. 输出：最终答案
 */

 
// 核心消息类型
 

/**
 * 消息类型标记
 * 
 * 对应实际的处理流程：
 * - system_prompt: 系统提示词（不处理）
 * - context: 对话历史（需要概括）
 * - context_summary: 概括后的对话历史
 * - prompt_card: 提示词卡片（不处理）
 * - file: 文件内容（需要概括）
 * - file_summary: 概括后的文件内容
 * - user_input: 用户输入（不处理）
 */
export type MessageType = 
  | 'system_prompt'      // 系统提示词
  | 'context'            // 对话历史（单条）
  | 'context_summary'    // 对话历史概括（处理后）
  | 'prompt_card'        // 提示词卡片
  | 'file'               // 文件内容
  | 'file_summary'       // 文件概括（处理后）
  | 'user_input'         // 用户输入

/**
 * 消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant'

/**
 * 消息元数据（内部标记）
 */
export interface MessageMetadata {
  /** 消息类型 */
  type: MessageType
  
  /** 是否需要预处理 */
  needsProcessing: boolean
  
  /** 是否已处理 */
  processed?: boolean
  
  /** 优先级（数字越大优先级越高，用于提示词卡片排序） */
  priority?: number
  
  /** 原始索引（用于构建时记录顺序） */
  originalIndex?: number
  
  /** 标题（用于文件、提示词卡片） */
  title?: string
  
  /** 可合并标记（用于上下文消息） */
  canMerge?: boolean
  
  /**
   * 消息唯一标识符（可选）
   * 用于增量上下文处理，追踪已概括的消息
   * 如果未设置，将通过内容哈希动态生成
   */
  messageId?: string
}

/**
 * 标准消息结构（带内部标记）
 */
export interface Message {
  role: MessageRole
  content: string
  _meta: MessageMetadata  // 下划线前缀表示内部字段
}

/**
 * API消息格式（不含元数据）
 */
export interface ApiMessage {
  role: string
  content: string
  /** 消息ID（如果来自FlatMessage） */
  id?: string
}

 
// Agent 上下文
  
/**
 * 执行阶段
 */
export type ExecutionStage = 'preprocessing' | 'generating' | 'completed' | 'failed'

/**
 * Agent 上下文 - 完整的处理上下文
 * 
 * 三区架构：
 * - input: 原始数据（只读，不可变）
 * - processing: 处理过程数据（可修改）
 * - output: 输出结果（可修改）
 */
export interface AgentContext {
  // === 输入区（只读，保留原始数据副本） ===
  readonly input: {
    /** 原始用户输入 */
    readonly userInput: string
    
    /** 附加文件内容列表 */
    readonly attachedContents: readonly string[]
    
    /** 对话历史 */
    readonly conversationHistory: readonly ApiMessage[]
    
    /** 提示词卡片 */
    readonly promptCards?: readonly PromptCard[]
    
    /** AI 配置 */
    readonly aiConfig: any
  }
  
  // === 处理区（可修改） ===
  processing: {
    /** 构建的消息数组（可修改） */
    messages: Message[]
    
    /** 预处理是否完成 */
    preprocessed: boolean
  }
  
  // === 输出区（可修改） ===
  output: {
    /** 最终答案 */
    finalAnswer?: string
    
    /** Token 使用量 */
    tokensUsed: number
    
    /** 扩展元数据 */
    metadata: Record<string, unknown>
  }
  
  // === 元数据 ===
  meta: {
    /** 上下文ID */
    id: string
    
    /** 创建时间 */
    createdAt: number
    
    /** 当前执行阶段 */
    stage: ExecutionStage
  }
}

// 配置类型

/**
 * 处理器配置（文件和上下文处理器共用）
 */
export interface ProcessorConfig {
  /** 是否启用该处理器（默认：文件处理器关闭，上下文处理器开启） */
  enabled?: boolean
  /** 使用的模型ID（未设置则使用主模型） */
  providerId?: string
  /** 自定义提示词（未设置则使用默认） */
  systemPrompt?: string
}

/**
 * 预处理器配置
 */
export interface PreprocessorConfig {
  /** 是否并行处理文件（默认true） */
  parallelFiles?: boolean
  
  /** 最大并行数（默认5） */
  maxConcurrency?: number
  
  /** 文件处理器配置 */
  fileProcessor?: ProcessorConfig
  
  /** 上下文处理器配置 */
  contextProcessor?: ProcessorConfig
}

/**
 * Agent引擎配置
 */
export interface AgentEngineConfig {
  /** Preprocessing配置 */
  preprocessing?: PreprocessorConfig
  
  /** 温度参数 */
  temperature?: number
  
  /** 进度回调 */
  onProgress?: (message: string, stage: 'preprocessing' | 'generating') => void
  
  /** 思考过程流式回调 */
  onThinkingUpdate?: (thinking: string) => void
  
  /** 答案内容流式回调 */
  onAnswerUpdate?: (answer: string) => void
}

/**
 * Agent Pipeline 配置（在 AIConfig 中使用）
 */
export interface AgentPipelineConfig {
  /** 是否启用 Agent 系统 */
  enabled: boolean
  
  /** 自定义系统提示词 */
  customSystemPrompt?: string
  
  /** 预处理模型配置 */
  preprocessor?: {
    /** 文件概括配置 */
    fileProcessor?: ProcessorConfig
    
    /** 上下文概括配置 */
    contextProcessor?: ProcessorConfig
  }
}

/**
 * AI调用配置
 */
export interface AICallOptions {
  /** 温度参数（0-1） */
  temperature?: number
  
  /** 最大token数 */
  maxTokens?: number
  
  /** 流式回调（单一回调） */
  onStream?: (content: string) => void
  
  /** 思考过程流式回调 */
  onThinkingUpdate?: (thinking: string) => void
  
  /** 答案内容流式回调 */
  onAnswerUpdate?: (answer: string) => void
  
  /** 中止信号 */
  abortSignal?: AbortSignal
}

 
// 输入输出类型

/**
 * Agent引擎输入（简化版）
 */
export interface AgentEngineInput {
  /** Agent 上下文 */
  context: AgentContext
  
  /** 引擎配置 */
  config?: AgentEngineConfig
  
  /** 中止信号 */
  abortSignal?: AbortSignal
}

/**
 * Agent引擎输出
 */
export interface AgentEngineResult {
  /** 是否成功 */
  success: boolean
  
  /** 最终答案 */
  finalAnswer?: string
  
  /** 上下文（最终状态） */
  context: AgentContext
  
  /** Token使用量 */
  tokensUsed: number
  
  /** 错误信息 */
  error?: string
}

/**
 * 处理结果（文件和上下文处理器共用）
 */
export interface ProcessResult {
  success: boolean
  tokensUsed: number
  error?: string
}

/**
 * 预处理响应
 */
export interface PreprocessingResponse extends ProcessResult {}

/**
 * 创建上下文的输入数据
 */
export interface CreateContextInput {
  userInput: string
  attachedContents: string[]
  conversationHistory: ApiMessage[]
  promptCards?: PromptCard[]
  aiConfig: any
}

/**
 * 提示词卡片
 */
export interface PromptCard {
  id: string
  title: string
  content: string
  placement: 'system' | 'after_system' | 'user_end'
  priority?: number
}

/**
 * 消息构建器输入
 */
export interface MessageBuilderInput {
  /** 用户输入 */
  userInput: string
  
  /** 对话历史 */
  conversationHistory: ApiMessage[]
  
  /** 附加文件内容 */
  attachedContents: string[]
  
  /** 提示词卡片 */
  promptCards?: PromptCard[]
  
  /** AI配置 */
  aiConfig: any
}

/**
 * 消息构建器输出
 */
export interface MessageBuilderOutput {
  /** 构建的消息数组 */
  messages: Message[]
  
  /** 原始用户输入 */
  rawUserInput: string
}

 
// 消息操作类型

/**
 * 消息选择器配置
 */
export interface MessageSelector {
  /** 按类型选择 */
  types?: MessageType[]
  
  /** 排除特定类型 */
  excludeTypes?: MessageType[]
  
  /** 按角色选择 */
  roles?: MessageRole[]
  
  /** 自定义过滤器 */
  filter?: (msg: Message) => boolean
  
  /** 限制数量 */
  limit?: number
  
  /** 是否只选择未处理的 */
  onlyUnprocessed?: boolean
}

 
// 缓存类型

/**
 * 上下文概括缓存项
 */
export interface ContextSummaryCacheEntry {
  /** 概括消息 */
  summaryMessage: Message
  
  /** 已概括的原始消息的ID列表（用于增量检测） */
  summarizedMessageIds: string[]
  
  /** 概括时的总字符数 */
  totalChars: number
  
  /** 缓存创建时间 */
  createdAt: number
  
  /** 最后更新时间 */
  updatedAt: number
}

/**
 * 文件概括缓存结果
 */
export interface SummaryCacheResult {
  /** 缓存的概括内容 */
  content: string
  /** 缓存时间 */
  cachedAt: Date
}
