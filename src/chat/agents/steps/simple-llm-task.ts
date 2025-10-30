/**
 * 单次通信任务模板
 * 
 * 适用场景：
 * - 简单的提示词 + 用户输入 → AI输出
 * - 如：优化输入、生成结构、翻译、总结等
 * 
 * 特点：
 * - 单次 LLM 调用
 * - 支持流式输出
 * - 自动处理错误和进度
 */

import type { AgentTaskExecuteParams, AgentTaskResult, AgentContext } from '../types'
import type { ApiProviderConfig } from '../../types'
import { callSimpleAPI } from '../simple-api'
import {
  getApiProvider,
  validateApiProvider,
  normalizeInput,
  isValidInput,
  buildSuccessResult,
  buildErrorResult,
  buildCancelledResult
} from './task-utils'

/**
 * 单次通信任务配置
 */
export interface SimpleLLMTaskConfig<TOutput = string> {
  /** 任务类型 */
  taskType: import('../types').AgentTaskType
  
  /** 任务名称 */
  taskName: string
  
  /** 任务执行参数 */
  params: AgentTaskExecuteParams
  
  /** 默认系统提示词 */
  defaultSystemPrompt: string
  
  /** 进度消息（可选）*/
  progressMessage?: string
  
  /** 最小输入长度（可选，默认5）*/
  minInputLength?: number
  
  /** 输入不足时的回退输出（可选）*/
  shortInputFallback?: TOutput
  
  /**
   * 构建用户消息内容
   * 默认：直接使用输入
   */
  buildUserMessage?: (input: any, context: AgentContext) => string
  
  /**
   * 解析 LLM 输出
   * 默认：trim 后返回字符串
   */
  parseOutput?: (response: string, input: any, context: AgentContext) => TOutput
  
  /**
   * 自定义 API Provider 选择（可选）
   * 用于需要特殊逻辑的场景
   */
  selectApiProvider?: (aiConfig: import('../../types').AIConfig, config: import('../types').AgentTaskConfig) => ApiProviderConfig | null
}

/**
 * 执行单次通信任务
 * 
 * 这是一个高度可配置的模板函数，处理了所有通用逻辑：
 * - API Provider 选择和验证
 * - 输入标准化和验证
 * - LLM 调用和流式输出
 * - 错误处理和结果构建
 */
export async function executeSimpleLLMTask<TOutput = string>(
  config: SimpleLLMTaskConfig<TOutput>
): Promise<AgentTaskResult> {
  const {
    taskType,
    taskName,
    params,
    defaultSystemPrompt,
    progressMessage,
    minInputLength = 5,
    shortInputFallback,
    buildUserMessage,
    parseOutput,
    selectApiProvider
  } = config
  
  const { input, context, config: taskConfig, abortSignal, onProgress } = params
  const startTime = Date.now()
  
  try {
    // 1. 标准化输入
    const normalizedInput = normalizeInput(input)
    
    // 2. 检查输入长度（可选的短路逻辑）
    if (shortInputFallback !== undefined && !isValidInput(normalizedInput, minInputLength)) {
      console.log(`[${taskName}] 输入过短，使用回退值`)
      return buildSuccessResult(
        taskType,
        taskName,
        normalizedInput,
        shortInputFallback,
        startTime
      )
    }
    
    // 3. 选择和验证 API Provider
    const apiProvider = selectApiProvider 
      ? selectApiProvider(context.aiConfig, taskConfig)
      : getApiProvider(context.aiConfig, taskConfig, taskName)
    
    validateApiProvider(apiProvider, taskName)
    
    // 4. 发送进度消息
    if (onProgress && progressMessage) {
      onProgress(progressMessage)
    }
    
    console.log(`[${taskName}] 开始执行，使用 ${apiProvider.name}`)
    
    // 5. 构建用户消息
    const userMessage = buildUserMessage 
      ? buildUserMessage(input, context)
      : normalizedInput
    
    // 6. 获取系统提示词（优先使用配置中的）
    const systemPrompt = taskConfig.systemPrompt || defaultSystemPrompt
    
    // 7. 构建消息列表
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage }
    ]
    
    // 8. 调用 LLM API
    const response = await callSimpleAPI(
      messages,
      apiProvider,
      context.aiConfig,
      abortSignal,
      (accumulatedContent) => {
        // 流式输出回调
        if (onProgress) {
          onProgress(accumulatedContent)
        }
      }
    )
    
    // 9. 解析输出
    const output = parseOutput 
      ? parseOutput(response, input, context)
      : (response.trim() as TOutput)
    
    console.log(`[${taskName}] 执行完成`, {
      inputLength: normalizedInput.length,
      outputLength: typeof output === 'string' ? output.length : 'N/A'
    })
    
    // 10. 返回成功结果
    return buildSuccessResult(
      taskType,
      taskName,
      input,
      output,
      startTime
    )
    
  } catch (error: any) {
    console.error(`[${taskName}] 执行失败:`, error.message)
    
    // 对于中止错误，返回取消状态
    if (error.name === 'AbortError' || abortSignal?.aborted) {
      return buildCancelledResult(taskType, taskName, input, startTime)
    }
    
    // 其他错误，返回失败结果（可能有回退输出）
    return buildErrorResult(
      taskType,
      taskName,
      input,
      error,
      startTime,
      shortInputFallback
    )
  }
}

