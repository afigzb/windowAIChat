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

export function AgentResults({ results, isProcessing, streamingContent }: AgentResultsProps) {
  // 如果没有任何结果且不在处理中，不显示任何内容
  if ((!results || results.length === 0) && !isProcessing) {
    return null
  }

  return (
    <div className="mb-4 space-y-2 w-full">
      {/* 显示所有已完成的步骤结果 */}
      {results?.map((result, index) => (
        <AgentStepResult key={index} result={result} />
      ))}
      
      {/* 如果正在处理中，在底部显示处理提示 */}
      {isProcessing && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span>Agent 处理中...</span>
          </div>
          {streamingContent && (
            <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
              {streamingContent}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AgentStepResult({ result }: { result: AgentTaskResultForUI }) {
  const { success, optimizedInput, displayResult, metadata } = result
  
  if (!metadata) return null

  const hasChange = optimizedInput && 
    optimizedInput.trim() !== metadata.originalInput?.trim()

  return (
    <div className={`p-4 rounded-lg border ${
      success 
        ? 'bg-white border-gray-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      {/* 步骤头部 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            success ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-sm font-medium text-gray-700">
            {getStepName(metadata.taskType)}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {metadata.processingTime}ms
        </span>
      </div>

      {/* 错误信息 */}
      {!success && metadata.error && (
        <div className="text-sm text-red-600 mb-2">
          错误: {metadata.error}
        </div>
      )}

      {/* 内容展示 */}
      {success && (
        <div className="text-sm space-y-2">
          {/* 优先展示 displayResult（用于展示步骤的实际处理结果） */}
          {displayResult ? (
            <div className="p-2 bg-blue-50 rounded text-gray-700 whitespace-pre-wrap">
              {displayResult}
            </div>
          ) : hasChange ? (
            /* 如果没有 displayResult，但有输入输出变化，显示对比 */
            <>
              <div>
                <span className="text-gray-500">原始输入:</span>
                <div className="mt-1 p-2 bg-gray-50 rounded text-gray-700 whitespace-pre-wrap">
                  {metadata.originalInput}
                </div>
              </div>
              <div>
                <span className="text-gray-500">处理结果:</span>
                <div className="mt-1 p-2 bg-blue-50 rounded text-gray-700 whitespace-pre-wrap">
                  {optimizedInput}
                </div>
              </div>
              {metadata.changes && (
                <div className="text-xs text-blue-600">
                  {metadata.changes}
                </div>
              )}
            </>
          ) : (
            /* 既没有 displayResult 也没有变化 */
            <div className="text-gray-600">
              无需修改
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getStepName(taskType: string): string {
  const names: Record<string, string> = {
    'should-optimize': '检查是否需要优化',
    'optimize-input': '优化用户输入',
    'retrieve-info': '检索信息',
    'analyze-intent': '分析意图',
    'custom': '自定义步骤'
  }
  return names[taskType] || taskType
}

