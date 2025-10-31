/**
 * Agents 系统与对话管理器的集成层
 * 
 * 提供与现有系统的兼容接口
 */

import type {
  FlatMessage,
  AIConfig,
  MessageComponents,
  AgentTaskResultForUI
} from '../types'
import type {
  WorkflowResult,
  TaskResult,
  ProgressUpdate
} from './types'
import { executeWorkflow } from './workflow'
import { DEFAULT_WORKFLOW } from './workflows'
import {
  executeDynamicAgent,
  formatAgentResultForUI,
  type DynamicAgentResult,
  type AgentStep
} from './dynamic-agent'

// ============================================================
// 执行参数和结果类型
// ============================================================

export interface ExecutePipelineParams {
  userMessage: FlatMessage
  conversationHistory: FlatMessage[]
  config: AIConfig
  abortSignal?: AbortSignal
  onProgress?: (content: string | ProgressUpdate) => void
  overrideAttachedFiles?: string[]
}

export interface PipelineExecutionResult {
  finalContent: string
  reasoning_content?: string
  agentComponents: MessageComponents
}

// ============================================================
// 主要集成函数
// ============================================================

/**
 * 执行 Agent Pipeline（兼容接口）
 * 
 * 支持两种模式：
 * 1. static: 使用预定义的静态工作流
 * 2. dynamic: 使用动态Agent执行引擎（AI自主决策）
 */
export async function executeAgentPipeline(
  params: ExecutePipelineParams
): Promise<PipelineExecutionResult> {
  const {
    userMessage,
    conversationHistory,
    config,
    abortSignal,
    onProgress,
    overrideAttachedFiles
  } = params
  
  const userContent = userMessage.components?.userInput || userMessage.content
  const attachedFiles = overrideAttachedFiles ?? userMessage.components?.attachedFiles
  
  // 检查是否使用动态Agent模式
  const agentMode = config.agentConfig?.mode || 'static'
  
  console.log('[AgentPipeline] 开始执行', {
    mode: agentMode,
    agentConfig: config.agentConfig,
    hasOverrideFiles: !!overrideAttachedFiles,
    filesCount: attachedFiles?.length || 0
  })
  
  console.log(`[AgentPipeline] 执行模式: ${agentMode === 'dynamic' ? '🧠 动态Agent（AI自主决策）' : '📋 静态工作流'}`)
  
  if (agentMode === 'dynamic') {
    // ========== 动态Agent模式 ==========
    return executeDynamicAgentMode(params, userContent, attachedFiles)
  } else {
    // ========== 静态工作流模式 ==========
    return executeStaticWorkflowMode(params, userContent, attachedFiles)
  }
}

/**
 * 执行静态工作流模式（原有逻辑）
 */
async function executeStaticWorkflowMode(
  params: ExecutePipelineParams,
  userContent: string,
  attachedFiles: string[] | undefined
): Promise<PipelineExecutionResult> {
  const { conversationHistory, config, abortSignal, onProgress } = params
  
  // 包装进度回调
  const wrappedOnProgress = onProgress ? (update: ProgressUpdate) => {
    if (typeof onProgress === 'function') {
      // 将 ProgressUpdate 转换为字符串或传递原始对象
      if (update.type === 'message' && update.message) {
        onProgress(update.message)
      } else {
        // 转换为 JSON 字符串
        const progressData = {
          type: update.type,
          message: update.message,
          currentTask: update.taskName ? {
            name: update.taskName,
            type: 'custom' as const
          } : undefined,
          completedTasks: update.completedTasks?.map(convertTaskResultForUI)
        }
        onProgress(JSON.stringify(progressData))
      }
    }
  } : undefined
  
  // 执行工作流
  const workflowResult = await executeWorkflow(
    DEFAULT_WORKFLOW,
    {
      userInput: userContent,
      attachedFiles,
      conversationHistory,
      aiConfig: config
    },
    abortSignal,
    wrappedOnProgress
  )
  
  console.log('[AgentPipeline] 静态工作流执行完成:', {
    success: workflowResult.success,
    taskCount: workflowResult.taskResults.length,
    totalTime: `${workflowResult.totalDuration}ms`
  })
  
  // 提取主生成结果
  if (!workflowResult.generationResult) {
    throw new Error('主模型生成任务未完成或失败')
  }
  
  const finalContent = workflowResult.generationResult.content
  const reasoning_content = workflowResult.generationResult.reasoning
  
  // 将任务结果转换为 UI 组件格式
  const agentComponents: MessageComponents = {
    agentResults: workflowResult.taskResults.length > 0
      ? workflowResult.taskResults.map(convertTaskResultForUI)
      : undefined
  }
  
  return {
    finalContent,
    reasoning_content,
    agentComponents
  }
}

/**
 * 执行动态Agent模式（新逻辑）
 */
async function executeDynamicAgentMode(
  params: ExecutePipelineParams,
  userContent: string,
  attachedFiles: string[] | undefined
): Promise<PipelineExecutionResult> {
  const { conversationHistory, config, abortSignal, onProgress } = params
  
  // 包装进度回调
  const wrappedOnProgress = onProgress ? (step: AgentStep) => {
    if (typeof onProgress === 'function') {
      // 将Agent步骤转换为友好的进度消息
      let message = ''
      
      switch (step.type) {
        case 'thought':
          message = `💭 思考: ${step.thought}`
          break
        case 'action':
          message = `🔧 执行: ${step.action?.toolName}`
          break
        case 'observation':
          message = step.observation?.success
            ? `✓ 完成: ${step.action?.toolName}`
            : `✗ 失败: ${step.observation?.error}`
          break
        case 'final_answer':
          message = '✨ 生成最终答案'
          break
      }
      
      onProgress(message)
    }
  } : undefined
  
  // 执行动态Agent
  const agentResult = await executeDynamicAgent({
    userInput: userContent,
    attachedFiles,
    conversationHistory,
    aiConfig: config,
    config: {
      maxSteps: config.agentConfig?.maxSteps || 10,
      verbose: true
    },
    abortSignal,
    onProgress: wrappedOnProgress
  })
  
  console.log('[AgentPipeline] 动态Agent执行完成:', {
    success: agentResult.success,
    stepCount: agentResult.steps.length,
    totalTime: `${agentResult.totalDuration}ms`
  })
  
  if (!agentResult.success || !agentResult.finalAnswer) {
    throw new Error(agentResult.error || '动态Agent执行失败')
  }
  
  const finalContent = agentResult.finalAnswer
  
  // 将Agent执行步骤转换为 UI 组件格式
  const agentComponents: MessageComponents = {
    agentResults: agentResult.steps.length > 0
      ? convertAgentStepsForUI(agentResult)
      : undefined
  }
  
  return {
    finalContent,
    reasoning_content: formatAgentResultForUI(agentResult),
    agentComponents
  }
}

/**
 * 检查是否应该执行 Agent Pipeline
 */
export function shouldExecuteAgentPipeline(config: AIConfig): boolean {
  return !!(config.agentConfig && config.agentConfig.enabled)
}

/**
 * 格式化工作流结果为 UI 格式
 */
export function formatWorkflowResultForUI(
  workflowResult: WorkflowResult
): MessageComponents {
  return {
    agentResults: workflowResult.taskResults.length > 0
      ? workflowResult.taskResults.map(convertTaskResultForUI)
      : undefined
  }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 将 TaskResult 转换为 UI 展示格式
 */
function convertTaskResultForUI(taskResult: TaskResult): AgentTaskResultForUI {
  // 提取显示文本
  let displayResult: string | undefined
  let optimizedInput: string | undefined
  
  if (taskResult.output) {
    // 判断结果
    if (typeof taskResult.output === 'object' && 'result' in taskResult.output) {
      const judgment = taskResult.output as import('./types').JudgmentResult
      displayResult = `判断结果: ${judgment.result ? '是' : '否'}\n${judgment.reason || ''}`
    }
    // 字符串结果
    else if (typeof taskResult.output === 'string') {
      optimizedInput = taskResult.output
      displayResult = taskResult.output
    }
    // 生成结果
    else if (typeof taskResult.output === 'object' && 'content' in taskResult.output) {
      const generation = taskResult.output as import('./types').GenerationResult
      displayResult = generation.content.substring(0, 200) + (generation.content.length > 200 ? '...' : '')
    }
  }
  
  return {
    success: taskResult.status === 'completed',
    optimizedInput,
    displayResult,
    metadata: {
      taskType: 'custom',  // 兼容旧的类型
      name: taskResult.name,
      originalInput: taskResult.input,
      processingTime: taskResult.duration,
      error: taskResult.error
    }
  }
}

/**
 * 将动态Agent步骤转换为UI展示格式
 */
function convertAgentStepsForUI(agentResult: DynamicAgentResult): AgentTaskResultForUI[] {
  const results: AgentTaskResultForUI[] = []
  
  // 按步骤分组
  let currentGroup: {
    stepNumber: number
    thought?: string
    action?: AgentStep
    observation?: AgentStep
  } | null = null
  
  for (const step of agentResult.steps) {
    if (step.type === 'thought') {
      // 开始新的分组
      if (currentGroup) {
        results.push(convertAgentGroupForUI(currentGroup))
      }
      currentGroup = {
        stepNumber: step.stepNumber,
        thought: step.thought
      }
    } else if (step.type === 'action') {
      if (currentGroup) {
        currentGroup.action = step
      }
    } else if (step.type === 'observation') {
      if (currentGroup) {
        currentGroup.observation = step
      }
    } else if (step.type === 'final_answer') {
      // 最终答案作为单独的结果
      results.push({
        success: true,
        displayResult: `✨ 最终答案`,
        metadata: {
          taskType: 'custom',
          name: '生成答案',
          processingTime: step.duration || 0
        }
      })
    }
  }
  
  // 添加最后一个分组
  if (currentGroup) {
    results.push(convertAgentGroupForUI(currentGroup))
  }
  
  return results
}

/**
 * 将Agent步骤组转换为UI格式
 */
function convertAgentGroupForUI(group: {
  stepNumber: number
  thought?: string
  action?: AgentStep
  observation?: AgentStep
}): AgentTaskResultForUI {
  const toolName = group.action?.action?.toolName || '未知操作'
  const success = group.observation?.observation?.success ?? false
  
  let displayResult = ''
  
  if (group.thought) {
    displayResult += `💭 ${group.thought}\n\n`
  }
  
  if (group.action) {
    displayResult += `🔧 执行: ${toolName}\n`
    displayResult += `参数: ${JSON.stringify(group.action.action?.params)}\n\n`
  }
  
  if (group.observation) {
    if (success) {
      const output = group.observation.observation?.output
      const outputStr = typeof output === 'object' 
        ? JSON.stringify(output, null, 2)
        : String(output)
      displayResult += `✓ 结果: ${outputStr.substring(0, 200)}${outputStr.length > 200 ? '...' : ''}`
    } else {
      displayResult += `✗ 失败: ${group.observation.observation?.error}`
    }
  }
  
  return {
    success,
    displayResult,
    metadata: {
      taskType: 'custom',
      name: `步骤${group.stepNumber}: ${toolName}`,
      processingTime: group.observation?.duration || 0
    }
  }
}

// ============================================================
// 向后兼容（保留旧的导出名称）
// ============================================================

/**
 * @deprecated 使用 formatWorkflowResultForUI 代替
 */
export function formatPipelineResultForUI(
  pipelineResult: WorkflowResult,
  userContent: string
): MessageComponents {
  return formatWorkflowResultForUI(pipelineResult)
}
