/**
 * Agent 预处理提示组件
 * 
 * 简化版本：仅显示预处理阶段的进度提示
 */

interface AgentResultsProps {
  /** 是否正在处理中 */
  isProcessing?: boolean
  /** 当前处理的进度消息 */
  streamingContent?: string
}

export function AgentResults({ isProcessing, streamingContent }: AgentResultsProps) {
  // 如果不在处理中，不显示任何内容
  if (!isProcessing) {
    return null
  }

  return (
    <div className="mb-4 w-full">
      <div className="p-4 rounded-lg border border-blue-300 bg-blue-50/50">
        <div className="flex items-start gap-3">
          {/* 加载动画 */}
          <div className="relative w-5 h-5 mt-0.5">
            <div className="absolute inset-0 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-blue-700 mb-1">
              预处理阶段
            </div>
            {streamingContent && (
              <div className="text-xs text-blue-600 whitespace-pre-wrap break-words">
                {streamingContent}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

