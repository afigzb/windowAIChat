/**
 * AgentEngine - AI写作专用引擎（简化版）
 */

import type { AIConfig } from '../../types'
import { 
  createWorkspace,
  updateStage,
  type WorkspaceData,
  type Message
} from './workspace-data'
import { preprocess, type PreprocessorConfig } from '../preprocessor'
import { createAIService } from '../services/ai-service'
import { selectForSending } from './message-ops'
import { estimateTokens } from '../utils/utils'

// ============================================================
// Agent引擎配置
// ============================================================

export interface AgentEngineConfig {
  /** Preprocessing配置 */
  preprocessing?: PreprocessorConfig
  
  /** 是否启用详细日志 */
  verbose?: boolean
  
  /** 温度参数 */
  temperature?: number
  
  /** 进度回调 */
  onProgress?: (message: string, stage: 'preprocessing' | 'generating') => void
}

/**
 * Agent引擎输入
 */
export interface AgentEngineInput {
  /** 带标记的 messages 数组 */
  messages: Message[]
  
  /** 原始用户输入文本 */
  rawUserInput: string
  
  /** AI配置 */
  aiConfig: AIConfig
  
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
  
  /** 工作区数据（最终状态） */
  workspace: WorkspaceData
  
  /** Token使用量 */
  tokensUsed: number
  
  /** 错误信息 */
  error?: string
}

// ============================================================
// Agent引擎主函数
// ============================================================

/**
 * 运行AI写作引擎
 * 
 * 简化流程：Preprocessing → 直接发送请求
 * 
 * 注意：系统提示词已经在 buildMessages 阶段构建，这里直接使用
 */
export async function runAgentEngine(input: AgentEngineInput): Promise<AgentEngineResult> {
  const config = input.config || {}
  const verbose = config.verbose ?? true
  const startTime = Date.now()
  
  // 1. 创建WorkspaceData
  const workspace = createWorkspace(input.messages, input.rawUserInput)
  let totalTokens = 0
  
  try {
    // ========== 阶段1：Preprocessing ==========
    updateStage(workspace, 'preprocessing')
    
    if (config.onProgress) {
      config.onProgress('正在预处理输入...', 'preprocessing')
    }
    
    const preprocessingResult = await preprocess(
      workspace,
      input.aiConfig,
      config.preprocessing,
      input.abortSignal
    )
    
    if (preprocessingResult.success) {
      totalTokens += preprocessingResult.tokensUsed
    }
    
    // ========== 阶段2：直接生成回答 ==========
    updateStage(workspace, 'generating')
    
    if (config.onProgress) {
      config.onProgress('正在生成回答...', 'generating')
    }
    
    // 构建请求消息
    const messages = workspace.workspace.processedMessages
    
    // 转换为发送格式（直接使用已经构建好的消息，包括系统提示词）
    const requestMessages = selectForSending(messages)
    
    // 发送AI请求
    const aiService = createAIService(input.aiConfig)
    const finalAnswer = await aiService.call(
      requestMessages,
      { 
        abortSignal: input.abortSignal,
        temperature: config.temperature
      }
    )
    
    if (!finalAnswer || finalAnswer.trim().length === 0) {
      throw new Error('AI返回空结果')
    }
    
    const answerTokens = estimateTokens(finalAnswer)
    totalTokens += answerTokens
    
    // 设置最终答案
    workspace.output.finalAnswer = finalAnswer.trim()
    
    // ========== 完成 ==========
    updateStage(workspace, 'completed')
    
    return {
      success: true,
      finalAnswer: workspace.output.finalAnswer,
      workspace,
      tokensUsed: totalTokens
    }
    
  } catch (error: any) {
    updateStage(workspace, 'failed')
    
    return {
      success: false,
      workspace,
      tokensUsed: totalTokens,
      error: error.message || '未知错误'
    }
  }
}

