/**
 * Agents 系统类型定义（重构版）
 * 
 * 设计理念：
 * 1. 原始数据仓库：所有外部数据集中存放
 * 2. 任务 = 输入 + 工具 + 输出
 * 3. 工作流 = 任务序列 + 条件控制
 */

import type { AIConfig, FlatMessage } from '../types'

// ============================================================
// 原始数据仓库
// ============================================================

/**
 * 原始数据仓库
 * 
 * 存储所有外部输入，任务可以读取和修改
 */
export interface RawData {
  /** 用户原始输入（不可变）*/
  readonly userInput: string
  
  /** 处理后的目标/问题（可被任务修改）*/
  goal: string
  
  /** 附加的文件内容（可被任务添加/修改）*/
  attachedFiles: string[]
  
  /** 对话历史（可被任务读取）*/
  readonly conversationHistory: FlatMessage[]
  
  /** 自定义数据存储（任务间共享）*/
  customData: Map<string, any>
}

// ============================================================
// 数据源和输出
// ============================================================

/**
 * 数据源：描述从原始数据仓库的哪里读取
 */
export type DataSource =
  | { type: 'user-input' }                    // 用户原始输入
  | { type: 'goal' }                          // 当前目标
  | { type: 'file'; index?: number }          // 单个文件
  | { type: 'all-files' }                     // 所有文件
  | { type: 'history'; limit?: number }       // 对话历史
  | { type: 'custom'; key: string }           // 自定义数据
  | { type: 'static'; content: string }       // 静态文本

/**
 * 组合数据源
 */
export interface CompositeDataSource {
  sources: DataSource[]
  separator?: string  // 默认 '\n\n'
  template?: string   // 可选模板，如 "问题: {0}\n文件: {1}"
}

/**
 * 输出目标：描述结果写入到原始数据仓库的哪里
 */
export type OutputTarget =
  | { type: 'goal' }                          // 更新目标
  | { type: 'files'; mode: 'append' | 'prepend' | 'replace' } // 文件操作
  | { type: 'custom'; key: string }           // 自定义数据
  | { type: 'none' }                          // 不保存（仅用于判断）

// ============================================================
// 工具定义
// ============================================================

/**
 * 工具类型
 */
export type ToolType = 'judgment' | 'transform' | 'generation'

/**
 * 工具执行上下文
 */
export interface ToolContext {
  /** 原始数据仓库（只读引用）*/
  rawData: Readonly<RawData>
  
  /** AI 配置 */
  aiConfig: AIConfig
  
  /** 中止信号 */
  abortSignal?: AbortSignal
  
  /** 进度回调 */
  onProgress?: (message: string) => void
}

/**
 * 工具执行结果
 */
export interface ToolResult<T = any> {
  success: boolean
  output?: T
  error?: string
  metadata?: {
    duration?: number
    [key: string]: any
  }
}

/**
 * 基础工具接口
 */
export interface Tool<TInput = any, TOutput = any> {
  /** 工具类型 */
  type: ToolType
  
  /** 工具名称（用于日志）*/
  name: string
  
  /** 
   * 执行工具
   * 
   * @param input 输入数据（已从原始数据解析）
   * @param context 执行上下文
   * @returns 工具执行结果
   */
  execute(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>>
}

// ============================================================
// 判断工具
// ============================================================

/**
 * 判断工具配置
 */
export interface JudgmentToolConfig {
  type: 'judgment'
  name: string
  systemPrompt: string
  
  /** 判断解析方式 */
  parser: JudgmentParser
  
  /** 进度消息（可选）*/
  progressMessage?: string
}

/**
 * 判断解析器
 */
export type JudgmentParser =
  | { type: 'tag'; yesTag?: string; noTag?: string }
  | { type: 'keywords'; yesKeywords?: string[] }
  | { type: 'custom'; parse: (response: string) => boolean }

/**
 * 判断结果
 */
export interface JudgmentResult {
  result: boolean
  reason?: string
  rawResponse: string
}

// ============================================================
// 转换工具 (LLM)
// ============================================================

/**
 * 转换工具配置
 */
export interface TransformToolConfig {
  type: 'transform'
  name: string
  systemPrompt: string
  
  /** 输出解析（可选）*/
  outputParser?: OutputParser
  
  /** 进度消息（可选）*/
  progressMessage?: string
}

/**
 * 输出解析器
 */
export type OutputParser =
  | { type: 'trim' }
  | { type: 'extract-tag'; tagName: string }
  | { type: 'json'; schema?: any }
  | { type: 'custom'; parse: (response: string) => any }

// ============================================================
// 主生成工具
// ============================================================

/**
 * 主生成工具配置
 */
export interface GenerationToolConfig {
  type: 'generation'
  name: string
}

/**
 * 主生成结果
 */
export interface GenerationResult {
  content: string
  reasoning?: string
}

// ============================================================
// 任务定义
// ============================================================

/**
 * 任务配置
 */
export interface TaskConfig {
  /** 任务 ID */
  id: string
  
  /** 任务名称（显示用）*/
  name: string
  
  /** 任务描述（可选）*/
  description?: string
  
  /** 输入：从哪里读取数据 */
  input: DataSource | CompositeDataSource
  
  /** 工具：使用什么工具处理 */
  tool: JudgmentToolConfig | TransformToolConfig | GenerationToolConfig
  
  /** 输出：结果写入到哪里 */
  output: OutputTarget
  
  /** 条件执行（可选）*/
  condition?: TaskCondition
}

/**
 * 任务执行条件
 */
export type TaskCondition =
  | { type: 'always' }                        // 总是执行
  | { type: 'if-true'; taskId: string }       // 如果指定任务结果为 true
  | { type: 'if-false'; taskId: string }      // 如果指定任务结果为 false
  | { type: 'custom'; check: (results: Map<string, TaskResult>) => boolean }

/**
 * 任务执行结果
 */
export interface TaskResult {
  /** 任务 ID */
  id: string
  
  /** 任务名称 */
  name: string
  
  /** 执行状态 */
  status: 'completed' | 'failed' | 'skipped' | 'cancelled'
  
  /** 输入数据 */
  input: any
  
  /** 输出数据 */
  output?: any
  
  /** 错误信息 */
  error?: string
  
  /** 开始时间 */
  startTime: number
  
  /** 结束时间 */
  endTime: number
  
  /** 执行耗时 */
  duration: number
}

// ============================================================
// 工作流定义
// ============================================================

/**
 * 工作流配置
 */
export interface WorkflowConfig {
  /** 工作流名称 */
  name: string
  
  /** 工作流描述 */
  description: string
  
  /** 任务列表 */
  tasks: TaskConfig[]
}

/**
 * 工作流执行上下文
 */
export interface WorkflowContext {
  /** 原始数据仓库 */
  rawData: RawData
  
  /** AI 配置 */
  aiConfig: AIConfig
  
  /** 任务执行结果 */
  taskResults: Map<string, TaskResult>
  
  /** 中止信号 */
  abortSignal?: AbortSignal
  
  /** 进度回调 */
  onProgress?: (update: ProgressUpdate) => void
}

/**
 * 进度更新
 */
export interface ProgressUpdate {
  type: 'task-start' | 'task-complete' | 'task-skip' | 'message'
  taskId?: string
  taskName?: string
  message?: string
  completedTasks?: TaskResult[]
}

/**
 * 工作流执行结果
 */
export interface WorkflowResult {
  success: boolean
  rawData: RawData
  taskResults: TaskResult[]
  totalDuration: number
  
  /** 主生成结果（如果有）*/
  generationResult?: GenerationResult
}

// ============================================================
// 工作流输入
// ============================================================

/**
 * 工作流输入参数
 */
export interface WorkflowInput {
  userInput: string
  attachedFiles?: string[]
  conversationHistory?: FlatMessage[]
  aiConfig: AIConfig
}
