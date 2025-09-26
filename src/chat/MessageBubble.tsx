import { useState, useRef } from 'react'
import type { MessageNode, MessageBubbleProps } from './types'
import { MarkdownRenderer } from './MarkdownRenderer'

// 动画点组件
const AnimatedDots = ({ size = 'sm', color = 'slate' }: { size?: 'sm' | 'md'; color?: 'teal' | 'slate' }) => {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  const colorClasses = {
    teal: 'bg-blue-600',
    slate: 'bg-gray-400'
  }
  
  return (
    <div className="flex items-center justify-center gap-1">
      {[0, 0.1, 0.2].map((delay, i) => (
        <div 
          key={i}
          className={`${dotSize} ${colorClasses[color]} rounded-full animate-bounce`}
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  )
}

// 图标组件
type IconName = 'chevronDown' | 'chevronLeft' | 'chevronRight' | 'regenerate' | 'edit' | 'copy'

const Icon = ({ name, className = "w-4 h-4" }: { name: IconName; className?: string }) => {
  const icons: Record<string, string> = {
    chevronDown: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z",
    chevronLeft: "M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z",
    chevronRight: "M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
  }

  const strokeIcons: Record<string, string> = {
    regenerate: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    copy: "M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
  }

  if (strokeIcons[name]) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={strokeIcons[name]} />
      </svg>
    )
  }

  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d={icons[name]} clipRule="evenodd"/>
    </svg>
  )
}

// 分支导航控件
function BranchNavigation({ navigation, onNavigate }: {
  navigation: import('./types').BranchNavigation
  onNavigate: (direction: 'left' | 'right') => void
}) {
  if (navigation.totalBranches <= 1) return null

  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        onClick={() => onNavigate('left')}
        disabled={!navigation.canNavigateLeft}
        className={`p-1 rounded-lg transition-colors ${
          navigation.canNavigateLeft 
            ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100' 
            : 'text-gray-300 cursor-not-allowed'
        }`}
        title="上一个分支"
      >
        <Icon name="chevronLeft" className="w-3 h-3" />
      </button>
      
      <span className="px-3 py-1 text-gray-600 font-medium bg-gray-100 rounded-lg min-w-[3rem] text-center">
        {navigation.currentIndex + 1}/{navigation.totalBranches}
      </span>
      
      <button
        onClick={() => onNavigate('right')}
        disabled={!navigation.canNavigateRight}
        className={`p-1 rounded-lg transition-colors ${
          navigation.canNavigateRight 
            ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100' 
            : 'text-gray-300 cursor-not-allowed'
        }`}
        title="下一个分支"
      >
        <Icon name="chevronRight" className="w-3 h-3" />
      </button>
    </div>
  )
}

// 思考过程展示
function ThinkingContent({ content, isExpanded, onToggle }: {
  content: string
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="mb-6 w-full bg-gray-50 border border-gray-200 rounded-2xl p-5">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 mb-4 w-full text-left"
      >
        <div className="w-2 h-2 bg-blue-600 rounded-full" />
        <span className="text-sm font-medium text-gray-700">💭 思考过程</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <span>{isExpanded ? '收起' : '展开'}</span>
          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <Icon name="chevronDown" className="w-4 h-4" />
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="text-sm text-gray-700 font-mono leading-relaxed whitespace-pre-wrap bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          {content}
        </div>
      )}
    </div>
  )
}


// 消息气泡组件
export function MessageBubble({ 
  node, 
  onRegenerate, 
  onEditUserMessage,
  branchNavigation, 
  onBranchNavigate, 
  isInActivePath, 
  showBranchControls,
  isGenerating = false,
  currentThinking = '',
  currentAnswer = '',
}: MessageBubbleProps) {
  const [showThinkingExpanded, setShowThinkingExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(node.content)
  const [isHovered, setIsHovered] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const isUser = node.role === 'user'
  const contentRef = useRef<HTMLDivElement>(null)

  const handleEditSave = () => {
    if (editContent.trim() && editContent.trim() !== node.content && onEditUserMessage) {
      onEditUserMessage(node.id, editContent.trim())
    }
    setIsEditing(false)
  }

  const handleEditCancel = () => {
    setEditContent(node.content)
    setIsEditing(false)
  }
  
  return (
    <div 
      className={`w-full max-w-4xl mx-auto px-6 py-6 transition-opacity duration-200 ${
        isInActivePath ? '' : 'opacity-40 pointer-events-none'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start gap-4`}>
        {/* AI头像 */}
        {!isUser && (
          <div className="flex-shrink-0 mt-1">
            <div className="w-9 h-9 bg-indigo-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-sm font-medium">AI</span>
            </div>
          </div>
        )}

        <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
          {/* 用户标识和状态 */}
          <div className={`flex items-center mb-3 gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isUser ? 'text-blue-700' : 'text-gray-700'}`}>
                {isUser ? 'You' : 'AI'}
              </span>
              {!isUser && isGenerating && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-800 text-xs rounded-full border border-blue-200">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                  <span>正在回复</span>
                </div>
              )}
            </div>
            
            {/* 时间戳 - 只在hover时显示 */}
            {node.content !== '正在生成...' && (
              <div className={`text-xs text-gray-400 transition-opacity duration-200 ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}>
                {node.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          {/* AI思考过程 */}
          {!isUser && (
            <>
              {isGenerating && currentThinking && (
                <div className="mb-6 w-full bg-gray-50 border border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <AnimatedDots color="teal" />
                    <span className="text-sm font-medium text-gray-700">💭 正在思考</span>
                  </div>
                  <div className="text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap bg-white rounded-xl p-4 border border-slate-200">
                    {currentThinking}
                  </div>
                </div>
              )}
              
              {!isGenerating && node.reasoning_content && (
                <div className="mb-6 w-full">
                  <ThinkingContent
                    content={node.reasoning_content}
                    isExpanded={showThinkingExpanded}
                    onToggle={() => setShowThinkingExpanded(!showThinkingExpanded)}
                  />
                </div>
              )}
            </>
          )}
          
          {/* 消息内容容器 */}
          {isUser ? (
            /* 用户消息 - 简洁样式 */
            <div className={`${isEditing ? 'w-full' : ''}`}>
              <div className={`${
                isEditing 
                  ? 'bg-blue-50 border border-blue-200 rounded-2xl p-4' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl px-5 py-3 shadow-md'
              }`}>
                {isEditing ? (
                  <div className="space-y-4">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleEditSave()
                        } else if (e.key === 'Escape') {
                          handleEditCancel()
                        }
                      }}
                      className="w-full bg-white text-gray-900 placeholder-gray-500 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="修改消息内容..."
                      rows={Math.max(2, editContent.split('\n').length)}
                      autoFocus
                    />
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={handleEditCancel} 
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm rounded-lg transition-colors"
                      >
                        取消
                      </button>
                      <button 
                        onClick={handleEditSave} 
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors shadow-sm"
                      >
                        保存并重新生成
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">{node.content}</div>
                )}
              </div>
            </div>
          ) : (
            /* AI消息 - 卡片样式 */
            <div className="w-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6">
                {isGenerating ? (
                  currentAnswer ? (
                    <div ref={contentRef} className="text-gray-800 leading-relaxed">
                      <MarkdownRenderer content={currentAnswer} />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-8 bg-gray-50 rounded-xl">
                      <AnimatedDots size="md" color="teal" />
                      <span className="text-gray-600">正在准备回复...</span>
                    </div>
                  )
                ) : (
                  <div ref={contentRef}>
                    <MarkdownRenderer 
                      content={node.content} 
                      className="text-gray-800 leading-relaxed text-[15px]" 
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 底部操作控件 */}
          <div className={`flex items-center gap-4 mt-4 transition-opacity duration-200 ${
            isHovered || showBranchControls ? 'opacity-100' : 'opacity-0'
          } ${isUser ? 'justify-end' : 'justify-start'}`}>
            {/* 分支导航 */}
            {showBranchControls && branchNavigation && onBranchNavigate && (
              <BranchNavigation navigation={branchNavigation} onNavigate={onBranchNavigate} />
            )}
            
            {/* 操作按钮 */}
            {!isUser && !isGenerating && (
              <div className="flex items-center gap-2">
                {onRegenerate && (
                  <button
                    onClick={() => onRegenerate(node.id)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                    title="重新生成回答"
                  >
                    <Icon name="regenerate" className="w-3 h-3" />
                    <span>重新生成</span>
                  </button>
                )}
                
                <button
                  onClick={async () => {
                    try {
                      const container = contentRef.current
                      const html = container?.innerHTML || ''
                      const text = container?.innerText || node.content

                      if ((window as any).ClipboardItem && navigator.clipboard && (navigator.clipboard as any).write) {
                        const clipboardItem = new (window as any).ClipboardItem({
                          'text/html': new Blob([html], { type: 'text/html' }),
                          'text/plain': new Blob([text], { type: 'text/plain' })
                        })
                        await (navigator.clipboard as any).write([clipboardItem])
                      } else {
                        await navigator.clipboard.writeText(text)
                      }

                      setCopySuccess(true)
                      setTimeout(() => setCopySuccess(false), 2000)
                    } catch (err) {
                      console.error('复制失败:', err)
                      // 兜底：尝试复制原始内容
                      try {
                        await navigator.clipboard.writeText(node.content)
                        setCopySuccess(true)
                        setTimeout(() => setCopySuccess(false), 2000)
                      } catch (err2) {
                        console.error('复制也失败了:', err2)
                      }
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
                    copySuccess 
                      ? 'text-green-700 bg-green-50' 
                      : 'text-gray-500 hover:text-green-700 hover:bg-green-50'
                  }`}
                  title="复制内容"
                >
                  <Icon name="copy" className="w-3 h-3" />
                  <span>{copySuccess ? '已复制' : '复制'}</span>
                </button>
              </div>
            )}
            
            {isUser && !isGenerating && !isEditing && onEditUserMessage && (
              <button
                onClick={() => {
                  setEditContent(node.content)
                  setIsEditing(true)
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                title="修改消息并重新生成"
              >
                <Icon name="edit" className="w-3 h-3" />
                <span>修改</span>
              </button>
            )}
          </div>
        </div>

        {/* 用户头像 */}
        {isUser && (
          <div className="flex-shrink-0 mt-1">
            <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-medium">U</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
