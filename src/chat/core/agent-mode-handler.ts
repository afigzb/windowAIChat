/**
 * 自动挡处理器 - Agent Pipeline 模式
 * 
 * 职责：
 * 1. 接收规范化的初始请求数据
 * 2. 执行 Agent Pipeline（优化、结构生成、主模型生成）
 * 3. 返回统一格式的结果（包含 Agent 组件）
 * 
 * 特点：
 * - 多步骤优化流程
 * - 生成结构化的任务结果
 * - 与手动模式完全隔离，互不影响
 */

import type { 
  InitialRequestData, 
  RequestResult, 
  StreamCallbacks,
  FlatMessage,
  MessageComponents,
  AgentTaskResultForUI
} from '../types'
import type { AgentProgressUpdate } from '../agents'
import { agentPipeline } from '../agents/pipeline'
import type { AgentTaskResult } from '../agents/types'

/**
 * 将 AgentTaskResult 转换为 UI 展示格式
 */
function convertTaskResultForUI(taskResult: AgentTaskResult): AgentTaskResultForUI {
  return {
    success: taskResult.status === 'completed',
    optimizedInput: typeof taskResult.output === 'string' ? taskResult.output : undefined,
    displayResult: taskResult.output?.displayText,
    metadata: {
      taskType: taskResult.type,
      name: taskResult.name,
      originalInput: taskResult.input,
      processingTime: taskResult.duration,
      error: taskResult.error
    }
  }
}

/**
 * 包装进度回调，将 AgentProgressUpdate 转换为字符串（如果需要）
 */
function wrapProgressCallback(
  onAgentProgress: ((content: string | AgentProgressUpdate) => void) | undefined
): ((update: string | AgentProgressUpdate) => void) | undefined {
  if (!onAgentProgress) return undefined
  
  return (update: string | AgentProgressUpdate) => {
    if (typeof update === 'string') {
      onAgentProgress(update)
    } else {
      // 将结构化数据转换为字符串（供 UI 展示）
      const progressData = {
        type: update.type,
        message: update.message,
        currentTask: update.currentTask,
        completedTasks: update.completedResults?.map(r => convertTaskResultForUI(r))
      }
      onAgentProgress(JSON.stringify(progressData))
    }
  }
}

/**
 * 自动模式处理器
 * 
 * @param data 初始请求数据
 * @param callbacks 流式回调
 * @returns 请求结果（包含 Agent 组件）
 */
export async function executeAgentMode(
  data: InitialRequestData,
  callbacks: StreamCallbacks
): Promise<RequestResult> {
  console.log('[AgentMode] 开始执行 Agent Pipeline')
  
  try {
    // 提取用户输入和附加内容
    const userInput = data.userInput
    const attachedFiles = data.attachedContents
    
    console.log('[AgentMode] Pipeline 参数:', {
      userInputLength: userInput.length,
      attachedFilesCount: attachedFiles.length,
      historyLength: data.conversationHistory.length
    })
    
    // 执行 Agent Pipeline（使用新的动态执行引擎）
    const pipelineResult = await agentPipeline.executeDefaultWorkflow(
      {
        userInput,
        goal: userInput,  // 初始 goal 与 userInput 相同
        attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined,
        conversationHistory: data.conversationHistory,
        aiConfig: data.aiConfig
      },
      data.abortSignal,
      wrapProgressCallback(callbacks.onAgentProgress)
    )
    
    console.log('[AgentMode] Pipeline 执行完成:', {
      success: pipelineResult.success,
      taskCount: pipelineResult.taskResults.length,
      totalTime: `${pipelineResult.totalTime}ms`
    })
    
    // 从任务结果中提取主模型生成的内容
    const mainGenerationTask = pipelineResult.taskResults.find(
      r => r.type === 'main-generation'
    )
    
    if (!mainGenerationTask || mainGenerationTask.status !== 'completed') {
      throw new Error('主模型生成任务未完成或失败')
    }
    
    const finalContent = mainGenerationTask.output.content
    const reasoning_content = mainGenerationTask.output.reasoning_content
    
    // 构建 Agent 组件（用于 UI 展示）
    const agentComponents: MessageComponents = {
      agentResults: pipelineResult.taskResults.length > 0 
        ? pipelineResult.taskResults.map(taskResult => convertTaskResultForUI(taskResult))
        : undefined
    }
    
    console.log('[AgentMode] 生成成功，返回结果')
    
    return {
      content: finalContent,
      reasoning_content,
      components: agentComponents
    }
    
  } catch (error: any) {
    console.error('[AgentMode] Pipeline 执行失败:', error)
    
    // Agent 模式失败时，返回错误信息
    // 注意：不再回退到手动模式，因为路由层已经做了选择
    return {
      content: `Agent Pipeline 执行失败: ${error.message || '未知错误'}`,
      reasoning_content: undefined,
      components: undefined
    }
  }
}

