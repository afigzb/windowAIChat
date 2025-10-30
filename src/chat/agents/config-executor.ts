/**
 * 配置驱动的工具执行器
 * 
 * 根据工具配置动态执行，不需要预定义的任务类
 */

import type { AgentContext, AgentTaskResult, AgentTaskExecuteParams, AgentProgressUpdate } from './types'
import type { ToolConfig, JudgmentToolConfig, SimpleLLMToolConfig, MainGenerationToolConfig } from './tool-config'
import { executeJudgmentTask } from './steps/judgment-task'
import { executeSimpleLLMTask } from './steps/simple-llm-task'
import { callAIAPI } from '../core/api'
import { generateTaskId, buildSuccessResult, buildErrorResult, buildCancelledResult } from './steps/task-utils'

/**
 * 根据工具配置执行工具
 */
export async function executeToolByConfig(
  toolConfig: ToolConfig,
  input: any,
  context: AgentContext,
  abortSignal?: AbortSignal,
  onProgress?: (update: string | AgentProgressUpdate) => void
): Promise<AgentTaskResult> {
  console.log(`[ConfigExecutor] 执行工具: ${toolConfig.name} (${toolConfig.template})`)
  
  // 根据模板类型选择执行方式
  switch (toolConfig.template) {
    case 'judgment':
      return executeJudgmentTool(toolConfig, input, context, abortSignal, onProgress)
    
    case 'simple-llm':
      return executeSimpleLLMTool(toolConfig, input, context, abortSignal, onProgress)
    
    case 'main-generation':
      return executeMainGenerationTool(toolConfig, input, context, abortSignal, onProgress)
    
    default:
      throw new Error(`未知的工具模板类型: ${(toolConfig as any).template}`)
  }
}

/**
 * 执行判断工具
 */
async function executeJudgmentTool(
  config: JudgmentToolConfig,
  input: any,
  context: AgentContext,
  abortSignal?: AbortSignal,
  onProgress?: (update: string | AgentProgressUpdate) => void
): Promise<AgentTaskResult> {
  // 构建执行参数
  const params: AgentTaskExecuteParams = {
    input,
    context,
    config: {
      type: config.id as any,  // 使用 ID 作为类型
      name: config.name,
      enabled: true,
      description: config.description,
      systemPrompt: config.systemPrompt
    },
    abortSignal,
    onProgress
  }
  
  // 调用判断任务模板
  const result = await executeJudgmentTask({
    taskType: config.id as any,
    taskName: config.name,
    params,
    defaultSystemPrompt: config.systemPrompt,
    progressMessage: `正在执行: ${config.name}`,
    minInputLength: config.minInputLength,
    shortInputDefault: config.shortInputDefault,
    parseJudgment: config.parseJudgment,
    extractReason: config.extractReason
  })
  
  // 调用结果处理器
  if (config.onResult && result.status === 'completed' && result.output) {
    config.onResult(result.output.result, result.output.reason, context)
  }
  
  return result
}

/**
 * 执行单次通信工具
 */
async function executeSimpleLLMTool(
  config: SimpleLLMToolConfig,
  input: any,
  context: AgentContext,
  abortSignal?: AbortSignal,
  onProgress?: (update: string | AgentProgressUpdate) => void
): Promise<AgentTaskResult> {
  // 构建执行参数
  const params: AgentTaskExecuteParams = {
    input,
    context,
    config: {
      type: config.id as any,
      name: config.name,
      enabled: true,
      description: config.description,
      systemPrompt: config.systemPrompt
    },
    abortSignal,
    onProgress
  }
  
  // 调用单次通信任务模板
  const result = await executeSimpleLLMTask({
    taskType: config.id as any,
    taskName: config.name,
    params,
    defaultSystemPrompt: config.systemPrompt,
    progressMessage: config.progressMessage || `正在执行: ${config.name}`,
    minInputLength: config.minInputLength,
    shortInputFallback: config.shortInputFallback,
    buildUserMessage: config.buildUserMessage,
    parseOutput: config.parseOutput
  })
  
  // 调用结果处理器
  if (config.onResult && result.status === 'completed' && result.output !== undefined) {
    config.onResult(result.output, context)
  }
  
  return result
}

/**
 * 执行主模型生成工具
 */
async function executeMainGenerationTool(
  config: MainGenerationToolConfig,
  input: any,
  context: AgentContext,
  abortSignal?: AbortSignal,
  onProgress?: (update: string | AgentProgressUpdate) => void
): Promise<AgentTaskResult> {
  const startTime = Date.now()
  const taskId = generateTaskId('main-generation' as any)

  try {
    const finalInput = input || context.goal || context.userInput
    const conversationHistory = context.conversationHistory || []
    const attachedFiles = context.attachedFiles
    
    // 处理附加文件
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
    const result = await callAIAPI(
      conversationHistory,
      context.aiConfig,
      abortSignal || new AbortController().signal,
      (thinking) => {
        if (onProgress) {
          onProgress({
            type: 'message',
            message: `💭 思考中...\n${thinking}`,
            currentTask: {
              name: config.name,
              type: 'main-generation' as any
            }
          })
        }
      },
      (answer) => {
        if (onProgress) {
          onProgress({
            type: 'message',
            message: `✍️ 生成中...\n${answer}`,
            currentTask: {
              name: config.name,
              type: 'main-generation' as any
            }
          })
        }
      },
      tempContent,
      'after_system',
      tempContentList
    )

    const output = {
      content: result.content,
      reasoning_content: result.reasoning_content,
      displayText: `✅ 生成完成\n\n字数: ${result.content.length} 字符`
    }

    return buildSuccessResult(
      'main-generation' as any,
      config.name,
      finalInput,
      output,
      startTime
    )
    
  } catch (error: any) {
    if (error.name === 'AbortError' || abortSignal?.aborted) {
      return buildCancelledResult(
        'main-generation' as any,
        config.name,
        input || context.userInput,
        startTime
      )
    }

    return buildErrorResult(
      'main-generation' as any,
      config.name,
      input || context.userInput,
      error,
      startTime
    )
  }
}

