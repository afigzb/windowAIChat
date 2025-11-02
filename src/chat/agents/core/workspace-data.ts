/**
 * WorkspaceData - Agent工作区数据结构（重构版本）
 */

import { generateWorkspaceId, generateDocumentId, getNestedProperty } from '../utils/utils'

// ============================================================
// 消息类型定义（带内部标记）
// ============================================================

/**
 * 消息类型标记
 */
export type MessageType = 
  | 'system_prompt'      // 系统提示词
  | 'context'            // 对话历史（单条）
  | 'context_summary'    // 对话历史概括（处理后）
  | 'prompt_card'        // 提示词卡片
  | 'file'               // 文件内容
  | 'file_summary'       // 文件概括（处理后）
  | 'user_input'         // 用户输入
  | 'generated_content'  // 生成的内容（中间插入）

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
  
  /** 优先级（数字越大优先级越高） */
  priority?: number
  
  /** 原始索引（用于排序） */
  originalIndex?: number
  
  /** 标题（用于文件、提示词卡片） */
  title?: string
  
  /** 文件索引（用于文件类型） */
  fileIndex?: number
  
  /** 可合并标记（用于上下文） */
  canMerge?: boolean
  
  /** 重要性（用于文件） */
  importance?: 'high' | 'medium' | 'low'
  
  /** 上一次记录的字符数量（用于上下文概括的增量机制） */
  lastRecordedChars?: number
}

/**
 * 标准消息结构（带内部标记）
 */
export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
  _meta: MessageMetadata  // 下划线前缀表示内部字段
}

// ============================================================
// 核心数据结构
// ============================================================

/**
 * 文档数据
 */
export interface Document {
  id: string
  type: 'text' | 'markdown' | 'json' | 'code' | 'other'
  content: string
  metadata?: Record<string, any>
  createdAt: number
}

/**
 * 执行阶段
 */
export type ExecutionStage = 'preprocessing' | 'generating' | 'completed' | 'failed'

/**
 * WorkspaceData - Agent工作区数据（重构版）
 * 
 * 核心变化：使用 messages 数组替代分散的字段
 */
export interface WorkspaceData {
  // ========== 输入区（只读） ==========
  input: {
    /** 原始 messages 数组（带标记） */
    readonly rawMessages: Message[]
    
    /** 原始用户输入文本（用于引用） */
    readonly rawUserInput: string
  }
  
  // ========== 工作区（可变） ==========
  workspace: {
    /** 预处理后的 messages 数组 */
    processedMessages: Message[]
    
    /** 预处理是否完成 */
    preprocessed: boolean
    
    /** 提取的结构化信息 */
    extractedInfo: Map<string, any>
    
    /** 中间结果（任务产生的临时数据） */
    intermediateResults: Map<string, any>
    
    /** 生成的文档/内容 */
    documents: Document[]
    
    /** 写作专用：情节片段列表 */
    plotSegments?: Array<{
      scene: string
      mood?: string
      wordCountSuggestion?: string
    }>
  }
  
  // ========== 输出区（最终结果） ==========
  output: {
    /** 最终答案 */
    finalAnswer?: string
    
    /** 生成的内容 */
    generatedContent?: string
    
    /** 附件 */
    attachments?: any[]
    
    /** 元数据 */
    metadata: Record<string, any>
  }
  
  // ========== 元数据 ==========
  meta: {
    /** 创建时间 */
    createdAt: number
    
    /** 当前执行阶段 */
    stage: ExecutionStage
    
    /** 工作区ID */
    id: string
  }
}

// ============================================================
// 数据引用系统
// ============================================================

/**
 * DataReference - 数据引用
 * 
 * 用于在任务间明确传递数据
 */
export type DataReference =
  | { type: 'input'; path: string }              // 从输入区读取
  | { type: 'workspace'; path: string }          // 从工作区读取
  | { type: 'task_result'; taskId: string }      // 从任务结果读取
  | { type: 'literal'; value: any }              // 字面值

/**
 * DataPath - 数据路径类型
 * 
 * 用于类型安全的路径访问
 */
export type DataPath =
  | 'input.rawMessages'
  | 'input.rawUserInput'
  | 'workspace.processedMessages'
  | 'workspace.extractedInfo'
  | 'workspace.intermediateResults'
  | 'workspace.documents'
  | 'workspace.plotSegments'
  | 'output.finalAnswer'
  | 'output.generatedContent'
  | 'output.attachments'
  | 'output.metadata'
  | string  // 允许动态路径

// ============================================================
// 工具函数
// ============================================================

/**
 * 创建 WorkspaceData（新版本，基于 messages 数组）
 * 
 * @param rawMessages 带标记的原始 messages 数组
 * @param rawUserInput 原始用户输入文本
 */
export function createWorkspace(
  rawMessages: Message[],
  rawUserInput: string
): WorkspaceData {
  return {
    input: {
      rawMessages: [...rawMessages],
      rawUserInput
    },
    workspace: {
      processedMessages: [...rawMessages],  // 初始状态，复制原始 messages
      preprocessed: false,
      extractedInfo: new Map(),
      intermediateResults: new Map(),
      documents: [],
      plotSegments: undefined
    },
    output: {
      metadata: {}
    },
    meta: {
      createdAt: Date.now(),
      stage: 'preprocessing',
      id: generateWorkspaceId()
    }
  }
}


/**
 * 从WorkspaceData读取数据
 */
export function readData(workspace: WorkspaceData, ref: DataReference): any {
  switch (ref.type) {
    case 'literal':
      return ref.value
    
    case 'input':
    case 'workspace': {
      const path = `${ref.type}.${ref.path}`
      return getNestedProperty(workspace, path)
    }
    
    case 'task_result':
      // 从intermediateResults中读取任务结果
      return workspace.workspace.intermediateResults.get(ref.taskId)
    
    default:
      throw new Error(`未知的数据引用类型`)
  }
}

/**
 * 向WorkspaceData写入数据
 */
export function writeData(
  workspace: WorkspaceData,
  path: DataPath,
  value: any
): void {
  const parts = path.split('.')
  
  if (parts[0] === 'input') {
    throw new Error('不能写入只读的input区域')
  }
  
  if (parts.length < 2) {
    throw new Error('无效的数据路径')
  }
  
  const [section, key] = parts
  
  if (section === 'workspace') {
    // 处理workspace的直接属性
    if (key === 'processedMessages' && Array.isArray(value)) {
      workspace.workspace.processedMessages = value
    } else if (key === 'preprocessed') {
      workspace.workspace.preprocessed = !!value
    } else if (key === 'documents' && Array.isArray(value)) {
      workspace.workspace.documents = value
    } else if (key === 'plotSegments') {
      workspace.workspace.plotSegments = value
    } else if (parts.length === 3) {
      // 处理深层路径：workspace.extractedInfo.key
      const mapName = key
      const mapKey = parts[2]
      
      if (mapName === 'extractedInfo') {
        workspace.workspace.extractedInfo.set(mapKey, value)
      } else if (mapName === 'intermediateResults') {
        workspace.workspace.intermediateResults.set(mapKey, value)
      }
    }
  } else if (section === 'output') {
    // 处理output的直接属性
    if (key === 'finalAnswer') {
      workspace.output.finalAnswer = value
    } else if (key === 'generatedContent') {
      workspace.output.generatedContent = value
    } else if (key === 'attachments') {
      workspace.output.attachments = value
    } else if (key === 'metadata') {
      workspace.output.metadata = { ...workspace.output.metadata, ...value }
    }
  }
}

/**
 * 添加文档到工作区
 */
export function addDocument(
  workspace: WorkspaceData,
  content: string,
  type: Document['type'] = 'text',
  metadata?: Record<string, any>
): Document {
  const doc: Document = {
    id: generateDocumentId(),
    type,
    content,
    metadata,
    createdAt: Date.now()
  }
  
  workspace.workspace.documents.push(doc)
  
  return doc
}

/**
 * 更新执行阶段
 */
export function updateStage(workspace: WorkspaceData, stage: ExecutionStage): void {
  workspace.meta.stage = stage
}

// cloneWorkspace 函数已删除（未使用）

// insertMessage 函数已删除（未使用）

/**
 * 过滤掉 _meta 标记，返回标准 API messages
 */
export function stripMetadata(messages: Message[]): Array<{ role: string; content: string }> {
  return messages.map(m => ({
    role: m.role,
    content: m.content
  }))
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 格式化WorkspaceData用于调试
 */
export function formatWorkspaceForDebug(workspace: WorkspaceData): string {
  const sections: string[] = []
  
  sections.push('=== WorkspaceData ===')
  sections.push(`ID: ${workspace.meta.id}`)
  sections.push(`Stage: ${workspace.meta.stage}`)
  sections.push('')
  
  sections.push('--- Input ---')
  sections.push(`Raw Messages: ${workspace.input.rawMessages.length}`)
  sections.push(`User Input: ${workspace.input.rawUserInput.substring(0, 100)}${workspace.input.rawUserInput.length > 100 ? '...' : ''}`)
  
  // 消息类型统计
  const typeCount: Record<string, number> = {}
  workspace.input.rawMessages.forEach(m => {
    typeCount[m._meta.type] = (typeCount[m._meta.type] || 0) + 1
  })
  sections.push(`Message Types:`)
  Object.entries(typeCount).forEach(([type, count]) => {
    sections.push(`  - ${type}: ${count}`)
  })
  sections.push('')
  
  sections.push('--- Workspace ---')
  sections.push(`Processed Messages: ${workspace.workspace.processedMessages.length}`)
  sections.push(`Preprocessed: ${workspace.workspace.preprocessed}`)
  sections.push(`Extracted Info: ${workspace.workspace.extractedInfo.size} items`)
  sections.push(`Intermediate Results: ${workspace.workspace.intermediateResults.size} items`)
  sections.push(`Documents: ${workspace.workspace.documents.length}`)
  sections.push('')
  
  sections.push('--- Output ---')
  sections.push(`Final Answer: ${workspace.output.finalAnswer ? 'Yes' : 'No'}`)
  sections.push(`Generated Content: ${workspace.output.generatedContent ? 'Yes' : 'No'}`)
  
  return sections.join('\n')
}
