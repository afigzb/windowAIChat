/**
 * Agent Workflows - 工作流实现
 * 
 * 包含具体的工作流逻辑和辅助函数
 */

import type { 
  AgentWorkflow, 
  AgentContext,
  AgentTaskResult,
  AgentTaskConfig
} from './types'
import { shouldOptimizeTask } from './steps/should-optimize-step'
import { optimizeInputTask } from './steps/optimize-input-step'
import {
  DEFAULT_SHOULD_OPTIMIZE_CONFIG,
  DEFAULT_OPTIMIZE_INPUT_CONFIG
} from './defaults'

/**
 * 从上下文中获取任务配置（如果有的话）
 */
function getTaskConfigFromContext(
  context: AgentContext,
  taskType: string,
  defaultConfig: AgentTaskConfig
): AgentTaskConfig {
  // 尝试从 aiConfig.agentConfig.options.taskConfigs 中读取配置
  const taskConfigs = context.aiConfig.agentConfig?.options?.taskConfigs as AgentTaskConfig[] | undefined
  
  if (taskConfigs) {
    const customConfig = taskConfigs.find(c => c.type === taskType)
    if (customConfig) {
      console.log(`[Workflow] 使用自定义配置: ${taskType}`)
      return customConfig
    }
  }
  
  return defaultConfig
}

/**
 * 默认优化工作流
 * 
 * 流程：
 * 1. 判断是否需要优化（如果启用）
 * 2. 如果需要优化，则执行优化（如果启用）
 * 3. 返回所有任务结果
 * 
 * 支持从 context.aiConfig.agentConfig.options.taskConfigs 读取自定义配置
 * 任务的启用/禁用由配置中的 enabled 字段控制
 */
export const defaultOptimizeWorkflow: AgentWorkflow = async (
  context: AgentContext,
  abortSignal?: AbortSignal,
  onProgress?: (message: string) => void
): Promise<AgentTaskResult[]> => {
  const results: AgentTaskResult[] = []

  // 获取任务配置（优先使用用户自定义配置）
  const shouldOptimizeConfig = getTaskConfigFromContext(
    context,
    'should-optimize',
    DEFAULT_SHOULD_OPTIMIZE_CONFIG
  )

  const optimizeInputConfig = getTaskConfigFromContext(
    context,
    'optimize-input',
    DEFAULT_OPTIMIZE_INPUT_CONFIG
  )

  // 检查任务是否启用（默认为 true）
  const isShouldOptimizeEnabled = shouldOptimizeConfig.enabled !== false
  const isOptimizeInputEnabled = optimizeInputConfig.enabled !== false

  // 任务1: 判断是否需要优化（如果启用）
  if (isShouldOptimizeEnabled) {
    const shouldOptimizeResult = await shouldOptimizeTask.execute({
      input: context.userInput,
      context,
      config: shouldOptimizeConfig,
      abortSignal,
      onProgress
    })
    
    results.push(shouldOptimizeResult)
    
    console.log('[DefaultWorkflow] 判断结果:', shouldOptimizeResult.output)

    // 如果中止，直接返回
    if (abortSignal?.aborted) {
      return results
    }

    // 任务2: 根据判断结果决定是否优化
    const shouldOptimize = shouldOptimizeResult.output?.shouldOptimize
    
    if (shouldOptimize && isOptimizeInputEnabled) {
      console.log('[DefaultWorkflow] 开始优化输入')
      
      const optimizeResult = await optimizeInputTask.execute({
        input: context.userInput,
        context,
        config: optimizeInputConfig,
        abortSignal,
        onProgress
      })
      
      results.push(optimizeResult)
    } else if (!shouldOptimize) {
      console.log('[DefaultWorkflow] 无需优化，跳过优化步骤')
    } else if (!isOptimizeInputEnabled) {
      console.log('[DefaultWorkflow] 优化任务已禁用，跳过')
    }
  } else {
    console.log('[DefaultWorkflow] 判断任务已禁用，直接执行优化')
    
    // 如果判断任务被禁用，但优化任务启用，则直接执行优化
    if (isOptimizeInputEnabled) {
      const optimizeResult = await optimizeInputTask.execute({
        input: context.userInput,
        context,
        config: optimizeInputConfig,
        abortSignal,
        onProgress
      })
      
      results.push(optimizeResult)
    }
  }

  return results
}

