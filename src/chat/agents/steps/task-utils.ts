/**
 * 任务通用工具函数
 * 
 * 提供所有任务共享的工具方法，避免代码重复
 */

import type { AIConfig } from '../../types'
import type { AgentTaskConfig, AgentTaskType, AgentTaskStatus, AgentTaskResult } from '../types'
import type { ApiProviderConfig } from '../../types'

/**
 * 获取任务应该使用的 API Provider
 * 
 * 优先级：
 * 1. 任务配置中指定的 apiProviderId
 * 2. 当前选中的 API Provider
 */
export function getApiProvider(
  aiConfig: AIConfig,
  config: AgentTaskConfig,
  taskName: string
): ApiProviderConfig | null {
  // 优先使用任务配置中指定的 API
  if (config.apiProviderId) {
    const provider = aiConfig.providers.find(p => p.id === config.apiProviderId)
    if (provider) {
      console.log(`[${taskName}] 使用指定 API: ${provider.name}`)
      return provider
    }
    console.warn(`[${taskName}] 未找到指定的 API: ${config.apiProviderId}，使用当前 API`)
  }

  // 否则使用当前选中的 API
  const currentProvider = aiConfig.providers.find(p => p.id === aiConfig.currentProviderId)
  if (currentProvider) {
    console.log(`[${taskName}] 使用当前 API: ${currentProvider.name}`)
  }
  return currentProvider || null
}

/**
 * 生成任务唯一标识
 */
export function generateTaskId(type: AgentTaskType): string {
  return `${type}-${Date.now()}`
}

/**
 * 构建任务结果对象（成功）
 */
export function buildSuccessResult(
  type: AgentTaskType,
  name: string,
  input: any,
  output: any,
  startTime: number
): AgentTaskResult {
  const endTime = Date.now()
  return {
    id: generateTaskId(type),
    type,
    name,
    status: 'completed' as AgentTaskStatus,
    input,
    output,
    startTime,
    endTime,
    duration: endTime - startTime
  }
}

/**
 * 构建任务结果对象（失败）
 */
export function buildErrorResult(
  type: AgentTaskType,
  name: string,
  input: any,
  error: Error | string,
  startTime: number,
  fallbackOutput?: any
): AgentTaskResult {
  const endTime = Date.now()
  const errorMessage = typeof error === 'string' ? error : error.message
  
  return {
    id: generateTaskId(type),
    type,
    name,
    status: 'failed' as AgentTaskStatus,
    input,
    output: fallbackOutput,
    startTime,
    endTime,
    duration: endTime - startTime,
    error: errorMessage
  }
}

/**
 * 构建任务结果对象（取消）
 */
export function buildCancelledResult(
  type: AgentTaskType,
  name: string,
  input: any,
  startTime: number
): AgentTaskResult {
  const endTime = Date.now()
  return {
    id: generateTaskId(type),
    type,
    name,
    status: 'cancelled' as AgentTaskStatus,
    input,
    startTime,
    endTime,
    duration: endTime - startTime,
    error: '任务被取消'
  }
}

/**
 * 验证 API Provider 配置
 * 抛出错误如果配置不完整
 */
export function validateApiProvider(
  provider: ApiProviderConfig | null,
  taskName: string
): asserts provider is ApiProviderConfig {
  if (!provider) {
    throw new Error(`未配置 ${taskName} 的 API Provider`)
  }
  
  if (!provider.apiKey || provider.apiKey.trim() === '') {
    throw new Error(`API Provider ${provider.name} 的 API Key 未配置`)
  }
}

/**
 * 标准化输入为字符串
 */
export function normalizeInput(input: any): string {
  if (typeof input === 'string') {
    return input
  }
  if (input === null || input === undefined) {
    return ''
  }
  return String(input)
}

/**
 * 检查输入是否有效（非空且长度足够）
 */
export function isValidInput(input: string, minLength: number = 1): boolean {
  return input.trim().length >= minLength
}

