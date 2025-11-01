/**
 * AgentEngine - AI写作专用引擎（简化版）
 */

import type { AIConfig } from '../types'
import { 
  createWorkspace,
  updateStage,
  type WorkspaceData,
  type Message
} from './workspace-data'
import { preprocess, type PreprocessorConfig } from './preprocessor'
import { createAIService } from './ai-service'
import { selectForSending } from './message-ops'
import { estimateTokens } from './utils'

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
// Agent引擎主函数（简化版）
// ============================================================

/**
 * 运行AI写作引擎（简化版）
 * 
 * 简化流程：Preprocessing → 直接发送请求
 * 
 * 注意：系统提示词已经在 buildMessages 阶段构建，这里直接使用
 */
export async function runAgentEngine(input: AgentEngineInput): Promise<AgentEngineResult> {
  const config = input.config || {}
  const verbose = config.verbose ?? true
  const startTime = Date.now()
  
  if (verbose) {
    console.log('\n' + '='.repeat(80))
    console.log('🚀 AI写作引擎启动（简化版）')
    console.log('='.repeat(80))
    console.log(`[AgentEngine] Messages 总数: ${input.messages.length}`)
  }
  
  // 1. 创建WorkspaceData
  const workspace = createWorkspace(input.messages, input.rawUserInput)
  let totalTokens = 0
  
  try {
    // ========== 阶段1：Preprocessing ==========
    updateStage(workspace, 'preprocessing')
    
    if (verbose) {
      console.log('\n🔍 [Preprocessing阶段] 预处理中...')
    }
    
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
      if (verbose) {
        console.log('✓ Preprocessing完成')
        console.log(`  Token使用: ${preprocessingResult.tokensUsed}`)
      }
    } else {
      console.warn('[AgentEngine] Preprocessing失败，继续执行')
    }
    
    // ========== 阶段2：直接生成回答 ==========
    updateStage(workspace, 'generating')
    
    if (verbose) {
      console.log('\n✨ [Generating阶段] 生成回答...')
    }
    
    if (config.onProgress) {
      config.onProgress('正在生成回答...', 'generating')
    }
    
    // 构建请求消息
    const messages = workspace.workspace.processedMessages
    
    // 转换为发送格式（直接使用已经构建好的消息，包括系统提示词）
    const requestMessages = selectForSending(messages)
    
    if (verbose) {
      console.log(`[AgentEngine] 使用 ${requestMessages.length} 条消息`)
    }
    
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
    
    if (verbose) {
      console.log('✓ 回答生成完成')
      console.log(`  回答长度: ${finalAnswer.length} 字符`)
      console.log(`  Token使用: ${answerTokens}`)
    }
    
    // 设置最终答案
    workspace.output.finalAnswer = finalAnswer.trim()
    
    // ========== 完成 ==========
    updateStage(workspace, 'completed')
    
    const duration = Date.now() - startTime
    
    if (verbose) {
      console.log('\n' + '='.repeat(80))
      console.log('✅ Agent引擎执行成功')
      console.log('='.repeat(80))
      console.log(`总耗时: ${duration}ms`)
      console.log(`总Token: ${totalTokens}`)
    }
    
    return {
      success: true,
      finalAnswer: workspace.output.finalAnswer,
      workspace,
      tokensUsed: totalTokens
    }
    
  } catch (error: any) {
    console.error('[AgentEngine] 执行失败:', error)
    
    updateStage(workspace, 'failed')
    
    const duration = Date.now() - startTime
    
    if (verbose) {
      console.log('\n' + '='.repeat(80))
      console.log('❌ Agent引擎执行失败')
      console.log('='.repeat(80))
      console.log(`耗时: ${duration}ms`)
      console.log(`错误: ${error.message}`)
    }
    
    return {
      success: false,
      workspace,
      tokensUsed: totalTokens,
      error: error.message || '未知错误'
    }
  }
}

