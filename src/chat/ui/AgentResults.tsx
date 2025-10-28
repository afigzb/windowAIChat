/**
 * Agent 处理结果展示组件
 * 
 * 功能：
 * - 清晰展示每个处理步骤的结果
 * - 显示输入输出对比
 * - 显示处理时间和状态
 * - 简洁实用的设计
 */

import type { AgentTaskResultForUI } from '../types'

interface AgentResultsProps {
  results: AgentTaskResultForUI[]
  /** 是否正在处理中 */
  isProcessing?: boolean
  /** 当前处理的流式内容 */
  streamingContent?: string
}

interface ProgressData {
  type: 'task_start' | 'task_complete' | 'message'
  message?: string
  currentTask?: {
    name: string
    type: string
  }
  completedTasks?: AgentTaskResultForUI[]
}

export function AgentResults({ results, isProcessing, streamingContent }: AgentResultsProps) {
  // 解析进度数据
  let progressData: ProgressData | null = null
  if (streamingContent) {
    try {
      progressData = JSON.parse(streamingContent) as ProgressData
    } catch {
      // 如果解析失败，不是结构化数据，忽略
    }
  }
  
  // 优先使用进度数据中的已完成任务，否则使用 props 传入的 results
  const displayResults = (progressData?.completedTasks && progressData.completedTasks.length > 0) 
    ? progressData.completedTasks 
    : results
  
  // 如果没有任何结果且不在处理中，不显示任何内容
  if ((!displayResults || displayResults.length === 0) && !isProcessing) {
    return null
  }

  return (
    <div className="mb-4 space-y-2 w-full">
      {/* 显示所有已完成的步骤结果 */}
      {displayResults?.map((result, index) => (
        <AgentStepResult key={index} result={result} />
      ))}
      
      {/* 如果正在处理中，在底部显示正在处理的任务 */}
      {isProcessing && progressData?.currentTask && (
        <ProcessingTask 
          taskName={progressData.currentTask.name}
          message={progressData.message}
        />
      )}
    </div>
  )
}

function ProcessingTask({ taskName, message }: { taskName: string, message?: string }) {
  return (
    <div className="p-4 rounded-lg border border-blue-300 bg-blue-50/50">
      <div className="flex items-start gap-3">
        {/* 加载动画 */}
        <div className="relative w-5 h-5 mt-0.5">
          <div className="absolute inset-0 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-blue-700 mb-1">
            正在处理: {taskName}
          </div>
          {message && (
            <div className="text-xs text-blue-600 whitespace-pre-wrap break-words">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AgentStepResult({ result }: { result: AgentTaskResultForUI }) {
  const { displayResult, metadata } = result
  
  if (!metadata) return null

  // 获取输出内容：优先使用 displayResult，否则使用任务的其他输出
  const output = displayResult || result.optimizedInput || metadata.error || '处理完成'
  
  return (
    <div className="p-3 rounded-lg border border-gray-200 bg-white">
      {/* 标题 - 显示用户友好的名称 */}
      <div className="text-sm font-medium text-gray-700 mb-2">
        {metadata.name}
      </div>

      {/* 输出内容 */}
      <div className="text-sm text-gray-600 whitespace-pre-wrap">
        {output}
      </div>
    </div>
  )
}

