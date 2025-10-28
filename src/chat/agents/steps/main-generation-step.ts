/**
 * 主模型生成任务
 * 
 * 这是最核心的生成任务，负责调用主 AI 模型生成最终回复
 * 特点：
 * - 独立运行：不依赖其他任务的输出
 * - 流式输出：通过 onProgress 实时推送生成内容
 * - 灵活输入：可以使用原始输入或其他任务处理后的输入
 */

import type { AgentTask, AgentTaskExecuteParams, AgentTaskResult, AgentTaskStatus } from '../types'
import type { FlatMessage } from '../../types'
import { callAIAPI } from '../../core/api'

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 主模型生成任务实现
 */
export const mainGenerationTask: AgentTask = {
  type: 'main-generation',
  name: '主模型生成',
  description: '调用主 AI 模型生成最终回复',

  async execute(params: AgentTaskExecuteParams): Promise<AgentTaskResult> {
    const { input, context, config, abortSignal, onProgress } = params
    
    const startTime = Date.now()
    const taskId = generateId()

    try {
      // 输入可以是：
      // 1. 原始用户输入（如果没有其他任务处理）
      // 2. 优化后的输入（如果有 optimize-input 任务）
      // 3. 生成的文章结构（如果有 generate-structure 任务）
      const finalInput = input || context.userInput

      // 构建对话历史
      // 注意：这里使用 context.conversationHistory，它已经包含了当前用户消息
      const conversationHistory = context.conversationHistory || []
      
      // 如果有附加文件（可能是原始文件或生成的结构），需要传递
      // 从上下文中获取附加文件
      const attachedFiles = context.attachedFiles
      
      // 根据文件模式决定如何传递文件内容
      const fileMode = context.aiConfig.fileContentMode || 'merged'
      let tempContent: string | undefined
      let tempContentList: string[] | undefined
      
      if (attachedFiles && attachedFiles.length > 0) {
        if (fileMode === 'separate') {
          tempContentList = attachedFiles
        } else {
          tempContent = attachedFiles.join('\n\n---\n\n')
        }
      }
      
      // 调用主 AI API
      // 流式输出通过 onProgress 实时推送
      const result = await callAIAPI(
        conversationHistory,
        context.aiConfig,
        abortSignal || new AbortController().signal,
        (thinking) => {
          // 推送思考过程
          if (onProgress) {
            onProgress({
              type: 'message',
              message: `💭 思考中...\n${thinking}`,
              currentTask: {
                name: '主模型生成',
                type: 'main-generation'
              }
            })
          }
        },
        (answer) => {
          // 推送生成内容
          if (onProgress) {
            onProgress({
              type: 'message',
              message: `✍️ 生成中...\n${answer}`,
              currentTask: {
                name: '主模型生成',
                type: 'main-generation'
              }
            })
          }
        },
        tempContent,
        'after_system', // 使用 after_system 模式，让文件内容按优先级插入
        tempContentList
      )

      const endTime = Date.now()

      return {
        id: taskId,
        type: 'main-generation',
        name: '主模型生成',
        status: 'completed' as AgentTaskStatus,
        input: finalInput,
        output: {
          content: result.content,
          reasoning_content: result.reasoning_content,
          displayText: `✅ 生成完成\n\n字数: ${result.content.length} 字符`
        },
        startTime,
        endTime,
        duration: endTime - startTime
      }
    } catch (error: any) {
      const endTime = Date.now()
      
      // 处理中断错误
      if (error.name === 'AbortError') {
        return {
          id: taskId,
          type: 'main-generation',
          name: '主模型生成',
          status: 'cancelled' as AgentTaskStatus,
          input: input || context.userInput,
          startTime,
          endTime,
          duration: endTime - startTime,
          error: '生成被中断'
        }
      }

      // 其他错误
      return {
        id: taskId,
        type: 'main-generation',
        name: '主模型生成',
        status: 'failed' as AgentTaskStatus,
        input: input || context.userInput,
        startTime,
        endTime,
        duration: endTime - startTime,
        error: error.message || '生成失败'
      }
    }
  }
}

