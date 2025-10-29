/**
 * 手动挡处理器 - 传统的直接 API 调用模式
 * 
 * 职责：
 * 1. 接收规范化的初始请求数据
 * 2. 直接调用 AI API，不经过 Agent Pipeline
 * 3. 返回统一格式的结果
 * 
 * 特点：
 * - 简单直接，没有中间优化步骤
 * - 保留现有的所有功能（流式输出、思考过程等）
 * - 与 Agent 模式完全隔离，互不影响
 */

import type { 
  InitialRequestData, 
  RequestResult, 
  StreamCallbacks,
  FlatMessage
} from '../types'
import { callAIAPI } from './api'

/**
 * 构建完整的消息历史
 * 将对话历史 + 系统提示词 + 用户输入 + 附加内容 组合成最终的消息列表
 */
function buildMessagesForAPI(data: InitialRequestData): FlatMessage[] {
  const messages: FlatMessage[] = []
  
  // 1. 添加系统提示词（如果有）
  if (data.systemPrompt && data.systemPrompt.trim()) {
    messages.push({
      id: 'system-prompt',
      content: data.systemPrompt,
      role: 'system',
      timestamp: new Date(),
      parentId: null
    })
  }
  
  // 2. 添加对话历史
  messages.push(...data.conversationHistory)
  
  // 3. 添加当前用户消息
  messages.push(data.userMessageNode)
  
  return messages
}

/**
 * 手动模式处理器
 * 
 * @param data 初始请求数据
 * @param callbacks 流式回调
 * @returns 请求结果
 */
export async function executeManualMode(
  data: InitialRequestData,
  callbacks: StreamCallbacks
): Promise<RequestResult> {
  console.log('[ManualMode] 开始执行传统 API 调用')
  
  let currentGeneratedContent = ''
  let currentReasoningContent = ''
  
  try {
    // 构建消息列表
    const messages = buildMessagesForAPI(data)
    
    // 准备附加内容参数（用于旧的 API 兼容）
    // 注意：这里使用 separate 模式，将附加内容作为独立的消息传递
    const tempContentList = data.attachedContents.length > 0 
      ? data.attachedContents 
      : undefined
    
    const tempPlacement = data.aiConfig.fileContentPlacement || 'append'
    
    console.log('[ManualMode] 调用 AI API', {
      messageCount: messages.length,
      hasAttachedContents: !!tempContentList,
      attachedCount: data.attachedContents.length,
      placement: tempPlacement
    })
    
    // 调用 AI API
    const result = await callAIAPI(
      messages,
      data.aiConfig,
      data.abortSignal,
      (thinking) => {
        currentReasoningContent = thinking
        callbacks.onThinkingUpdate(thinking)
      },
      (answer) => {
        currentGeneratedContent = answer
        callbacks.onAnswerUpdate(answer)
      },
      undefined,  // tempContent（单个）设为 undefined
      tempPlacement,
      tempContentList  // 使用列表形式
    )
    
    console.log('[ManualMode] API 调用成功')
    
    return {
      content: result.content,
      reasoning_content: result.reasoning_content,
      components: undefined  // 手动模式不生成额外组件
    }
    
  } catch (error: any) {
    console.error('[ManualMode] API 调用失败:', error)
    
    // 处理中断错误 - 保留已生成的内容
    if (error.name === 'AbortError') {
      const finalContent = currentGeneratedContent.trim() || '生成被中断'
      const finalReasoning = currentReasoningContent.trim() || undefined
      
      console.log('[ManualMode] 请求被中断，保留部分内容')
      
      return {
        content: finalContent,
        reasoning_content: finalReasoning,
        components: undefined
      }
    }
    
    // 处理其他错误
    return {
      content: `生成失败: ${error.message || '未知错误'}`,
      reasoning_content: undefined,
      components: undefined
    }
  }
}

