/**
 * Agent Workflows - 工作流实现
 * 
 * 包含具体的工作流逻辑和辅助函数
 */

import type { 
  AgentWorkflow, 
  AgentContext,
  AgentTaskResult,
  AgentTaskConfig,
  AgentProgressUpdate
} from './types'
import { shouldOptimizeTask } from './steps/should-optimize-step'
import { optimizeInputTask } from './steps/optimize-input-step'
import { generateStructureTask } from './steps/generate-structure-step'
import { mainGenerationTask } from './steps/main-generation-step'
import {
  DEFAULT_SHOULD_OPTIMIZE_CONFIG,
  DEFAULT_OPTIMIZE_INPUT_CONFIG,
  DEFAULT_GENERATE_STRUCTURE_CONFIG,
  DEFAULT_MAIN_GENERATION_CONFIG
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
 * 包装 onProgress 回调，将任务内部的字符串内容转换为结构化更新
 */
function wrapProgressCallback(
  onProgress: ((update: AgentProgressUpdate) => void) | undefined,
  config: AgentTaskConfig,
  completedResults: AgentTaskResult[]
): ((content: string | AgentProgressUpdate) => void) | undefined {
  if (!onProgress) return undefined
  
  return (content: string | AgentProgressUpdate) => {
    if (typeof content === 'string') {
      onProgress({
        type: 'message',
        message: content,
        currentTask: {
          name: config.name,
          type: config.type
        },
        completedResults: [...completedResults]
      })
    }
  }
}

/**
 * 执行单个任务的通用函数
 * 负责：通知开始 -> 执行任务 -> 通知完成
 */
async function executeTask(
  task: { execute: (params: any) => Promise<AgentTaskResult> },
  input: string,
  context: AgentContext,
  config: AgentTaskConfig,
  completedResults: AgentTaskResult[],
  abortSignal?: AbortSignal,
  onProgress?: (update: AgentProgressUpdate) => void
): Promise<AgentTaskResult> {
  // 通知任务开始
  if (onProgress) {
    onProgress({
      type: 'task_start',
      currentTask: {
        name: config.name,
        type: config.type
      },
      completedResults: [...completedResults]
    })
  }
  
  // 执行任务
  const result = await task.execute({
    input,
    context,
    config,
    abortSignal,
    onProgress: wrapProgressCallback(onProgress, config, completedResults)
  })
  
  // 通知任务完成
  if (onProgress) {
    onProgress({
      type: 'task_complete',
      completedResults: [...completedResults, result]
    })
  }
  
  return result
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
  context,
  abortSignal,
  onProgress
) => {
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

  const generateStructureConfig = getTaskConfigFromContext(
    context,
    'generate-structure',
    DEFAULT_GENERATE_STRUCTURE_CONFIG
  )

  const mainGenerationConfig = getTaskConfigFromContext(
    context,
    'main-generation',
    DEFAULT_MAIN_GENERATION_CONFIG
  )

  // 检查任务是否启用（默认为 true）
  const isShouldOptimizeEnabled = shouldOptimizeConfig.enabled !== false
  const isOptimizeInputEnabled = optimizeInputConfig.enabled !== false
  const isGenerateStructureEnabled = generateStructureConfig.enabled !== false
  const isMainGenerationEnabled = mainGenerationConfig.enabled !== false

  // 任务1: 判断是否需要优化（如果启用）
  let shouldOptimize = true // 默认需要优化

  if (isShouldOptimizeEnabled) {
    const shouldOptimizeResult = await executeTask(
      shouldOptimizeTask,
      context.userInput,
      context,
      shouldOptimizeConfig,
      results,
      abortSignal,
      onProgress
    )
    
    results.push(shouldOptimizeResult)
    console.log('[DefaultWorkflow] 判断结果:', shouldOptimizeResult.output)

    // 如果中止，直接返回
    if (abortSignal?.aborted) {
      return results
    }

    // 获取判断结果
    shouldOptimize = shouldOptimizeResult.output?.shouldOptimize ?? true
  } else {
    console.log('[DefaultWorkflow] 判断任务已禁用，默认执行优化')
  }

  // 任务2: 根据判断结果决定是否优化
  let finalInput = context.userInput // 最终输入（可能是优化后的）
  
  if (shouldOptimize && isOptimizeInputEnabled) {
    console.log('[DefaultWorkflow] 开始优化输入')
    
    const optimizeResult = await executeTask(
      optimizeInputTask,
      context.userInput,
      context,
      optimizeInputConfig,
      results,
      abortSignal,
      onProgress
    )
    
    results.push(optimizeResult)
    
    // 如果优化成功，使用优化后的输入
    if (optimizeResult.status === 'completed' && optimizeResult.output) {
      finalInput = optimizeResult.output
    }
  } else if (!shouldOptimize) {
    console.log('[DefaultWorkflow] 无需优化，跳过优化步骤')
  } else if (!isOptimizeInputEnabled) {
    console.log('[DefaultWorkflow] 优化任务已禁用，跳过')
  }

  // 如果中止，直接返回
  if (abortSignal?.aborted) {
    return results
  }

  // 任务3: 生成文章结构（如果启用）
  let generatedStructure: string | undefined = undefined
  if (isGenerateStructureEnabled) {
    console.log('[DefaultWorkflow] 开始生成文章结构')
    
    const structureResult = await executeTask(
      generateStructureTask,
      finalInput, // 使用优化后的输入（如果有）
      context,
      generateStructureConfig,
      results,
      abortSignal,
      onProgress
    )
    
    results.push(structureResult)
    
    // 如果生成了文章结构，保存到变量中（不修改 context）
    if (structureResult.status === 'completed' && structureResult.output) {
      generatedStructure = structureResult.output
      console.log('[DefaultWorkflow] 文章结构生成完成，将传递给主模型')
    }
  } else {
    console.log('[DefaultWorkflow] 文章结构任务已禁用，跳过')
  }

  // 如果中止，直接返回
  if (abortSignal?.aborted) {
    return results
  }

  // 任务4: 主模型生成（如果启用）
  if (isMainGenerationEnabled) {
    console.log('[DefaultWorkflow] 开始主模型生成')
    
    // 创建一个临时的 context 副本，合并生成的文章结构（如果有）
    const mainGenerationContext = {
      ...context,
      // 如果有生成的结构，将其添加到附加文件列表的开头
      // 使用新数组，避免修改原始的 context.attachedFiles
      attachedFiles: generatedStructure
        ? [`# 生成的文章结构\n\n${generatedStructure}`, ...(context.attachedFiles || [])]
        : context.attachedFiles
    }
    
    const mainGenerationResult = await executeTask(
      mainGenerationTask,
      finalInput, // 使用优化后的输入（如果有）
      mainGenerationContext,
      mainGenerationConfig,
      results,
      abortSignal,
      onProgress
    )
    
    results.push(mainGenerationResult)
  } else {
    console.log('[DefaultWorkflow] 主模型生成任务已禁用，跳过')
  }

  return results
}

