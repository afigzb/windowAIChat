/**
 * 请求路由器 - 决定使用哪种处理模式
 * 
 * 职责：
 * 1. 根据配置判断使用"手动挡"还是"自动挡"
 * 2. 提供清晰的路由逻辑，易于扩展
 */

import type { InitialRequestData, RequestMode } from '../types'

/**
 * 判断是否应该使用 Agent 模式
 */
function shouldUseAgentMode(data: InitialRequestData): boolean {
  const agentConfig = data.aiConfig.agentConfig
  
  // 必须显式启用 Agent 配置
  if (!agentConfig || !agentConfig.enabled) {
    return false
  }
  
  return true
}

/**
 * 路由请求到对应的处理模式
 * 
 * @param data 初始请求数据
 * @returns 请求模式：'manual' 或 'agent'
 */
export function routeRequest(data: InitialRequestData): RequestMode {
  if (shouldUseAgentMode(data)) {
    console.log('[Router] 使用 Agent 模式（自动挡）')
    return 'agent'
  }
  
  console.log('[Router] 使用传统模式（手动挡）')
  return 'manual'
}

/**
 * 检查是否启用了 Agent 模式（供外部使用）
 */
export function isAgentModeEnabled(data: InitialRequestData): boolean {
  return routeRequest(data) === 'agent'
}

