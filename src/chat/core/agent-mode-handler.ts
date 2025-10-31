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
import type { ProgressUpdate, TaskResult } from '../agents'
import { executeAgentPipeline } from '../agents'

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
      const judgment = taskResult.output as any
      displayResult = `判断结果: ${judgment.result ? '是' : '否'}\n${judgment.reason || ''}`
    }
    // 字符串结果
    else if (typeof taskResult.output === 'string') {
      optimizedInput = taskResult.output
      displayResult = taskResult.output
    }
    // 生成结果
    else if (typeof taskResult.output === 'object' && 'content' in taskResult.output) {
      const generation = taskResult.output as any
      displayResult = generation.content.substring(0, 200) + (generation.content.length > 200 ? '...' : '')
    }
  }
  
  return {
    success: taskResult.status === 'completed',
    optimizedInput,
    displayResult,
    metadata: {
      taskType: 'custom',  // 新架构使用统一的任务类型
      name: taskResult.name,
      originalInput: taskResult.input,
      processingTime: taskResult.duration,
      error: taskResult.error
    }
  }
}

/**
 * 包装进度回调，将 ProgressUpdate 转换为字符串（如果需要）
 */
function wrapProgressCallback(
  onAgentProgress: ((content: string | ProgressUpdate) => void) | undefined
): ((update: ProgressUpdate) => void) | undefined {
  if (!onAgentProgress) return undefined
  
  return (update: ProgressUpdate) => {
    if (update.type === 'message' && update.message) {
      // 简单消息，直接发送
      onAgentProgress(update.message)
    } else {
      // 将结构化数据转换为字符串（供 UI 展示）
      const progressData = {
        type: update.type,
        message: update.message,
        currentTask: update.taskName ? {
          name: update.taskName,
          type: 'custom' as const
        } : undefined,
        completedTasks: update.completedTasks?.map(r => convertTaskResultForUI(r))
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
      historyLength: data.conversationHistory.length,
      agentMode: data.aiConfig.agentConfig?.mode || 'static'
    })
    
    // 构造用户消息（模拟原有格式）
    const userMessage: FlatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userInput,
      parentId: null,
      components: {
        userInput,
        attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined
      },
      timestamp: new Date()
    }
    
    // 使用 executeAgentPipeline（根据配置自动选择静态/动态模式）
    const pipelineResult = await executeAgentPipeline({
      userMessage,
      conversationHistory: data.conversationHistory,
      config: data.aiConfig,
      abortSignal: data.abortSignal,
      onProgress: callbacks.onAgentProgress
    })
    
    console.log('[AgentMode] Pipeline执行完成')
    
    return {
      content: pipelineResult.finalContent,
      reasoning_content: pipelineResult.reasoning_content,
      components: pipelineResult.agentComponents
    }
    
  } catch (error: any) {
    console.error('[AgentMode] 工作流执行失败:', error)
    
    // Agent 模式失败时，返回错误信息
    // 注意：不再回退到手动模式，因为路由层已经做了选择
    return {
      content: `Agent 工作流执行失败: ${error.message || '未知错误'}`,
      reasoning_content: undefined,
      components: undefined
    }
  }
}

