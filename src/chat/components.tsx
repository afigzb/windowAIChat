import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import type { MessageNode, AIConfig, ChatMode, MessageBubbleProps, BranchNavigation } from './types'
import { DEFAULT_CONFIG } from './api'
import { MarkdownRenderer } from './MarkdownRenderer'

// ===== 公共组件 =====

// 动画点组件 - 统一的加载动画
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

// 合并的图标组件
type IconName = 'settings' | 'close' | 'send' | 'stop' | 'chevronDown' | 'chevronLeft' | 'chevronRight' | 'regenerate' | 'edit' | 'copy'

const Icon = ({ name, className = "w-4 h-4" }: { name: IconName; className?: string }) => {
  const icons: Record<string, string> = {
    settings: "M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z",
    close: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z",
    send: "M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z",
    stop: "M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z",
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

// ===== 核心组件 =====

// 分支导航控件
function BranchNavigation({ navigation, onNavigate }: {
  navigation: BranchNavigation
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

// 模式选择器
export function ModelToggle({ currentMode, onModeChange, disabled }: {
  currentMode: ChatMode
  onModeChange: (mode: ChatMode) => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  const modes = [
    { value: 'r1', label: 'R1', color: 'bg-gray-700' },
    { value: 'v3', label: 'V3', color: 'bg-blue-600' }
  ]
  
  const currentModeInfo = modes.find(mode => mode.value === currentMode)
  
  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 min-w-[80px] shadow-sm ${
          disabled 
            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
            : 'border-gray-200 hover:border-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 cursor-pointer bg-white hover:bg-gray-50 hover:shadow-md'
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${currentModeInfo?.color}`} />
        <span>{currentModeInfo?.label}</span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && !disabled && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute -top-4 left-0 -translate-y-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden backdrop-blur-sm">
            {modes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => {
                  onModeChange(mode.value as ChatMode)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-blue-50 ${
                  mode.value === currentMode ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${mode.color}`} />
                <div className="flex flex-col items-start">
                  <span>{mode.label}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
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

// Markdown转纯文本工具函数
const markdownToPlainText = (markdown: string): string => {
  return markdown
    // 移除代码块
    .replace(/```[\s\S]*?```/g, (match) => {
      // 提取代码块内容，保留换行
      const codeContent = match.replace(/```(\w+)?\n?/, '').replace(/```$/, '')
      return codeContent
    })
    // 移除内联代码的反引号
    .replace(/`([^`]+)`/g, '$1')
    // 移除链接但保留文本
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 移除图片
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // 移除标题的#号
    .replace(/^#{1,6}\s+/gm, '')
    // 移除粗体和斜体标记
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // 移除删除线
    .replace(/~~([^~]+)~~/g, '$1')
    // 移除引用标记
    .replace(/^>\s+/gm, '')
    // 移除列表标记，保留内容和缩进结构
    .replace(/^(\s*)[-*+]\s+/gm, '$1• ')
    .replace(/^(\s*)\d+\.\s+/gm, '$1')
    // 移除水平线
    .replace(/^-{3,}$/gm, '')
    .replace(/^={3,}$/gm, '')
    // 移除表格分隔符，保留内容
    .replace(/\|/g, ' ')
    .replace(/^[\s-:]+$/gm, '')
    // 清理多余的空行
    .replace(/\n{3,}/g, '\n\n')
    // 清理首尾空白
    .trim()
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
  showThinking = false
}: MessageBubbleProps) {
  const [showThinkingExpanded, setShowThinkingExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(node.content)
  const [isHovered, setIsHovered] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const isUser = node.role === 'user'

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
              {isGenerating && currentThinking && showThinking && (
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
                    <div className="text-gray-800 leading-relaxed">
                      <MarkdownRenderer content={currentAnswer} />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-8 bg-gray-50 rounded-xl">
                      <AnimatedDots size="md" color="teal" />
                      <span className="text-gray-600">正在准备回复...</span>
                    </div>
                  )
                ) : (
                  <MarkdownRenderer 
                    content={node.content} 
                    className="text-gray-800 leading-relaxed text-[15px]" 
                  />
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
                  onClick={() => {
                    // 将markdown转换为纯文本后复制
                    const plainText = markdownToPlainText(node.content)
                    navigator.clipboard.writeText(plainText).then(() => {
                      setCopySuccess(true)
                      setTimeout(() => setCopySuccess(false), 2000)
                    }).catch(err => {
                      console.error('复制失败:', err)
                    })
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
                    copySuccess 
                      ? 'text-green-700 bg-green-50' 
                      : 'text-gray-500 hover:text-green-700 hover:bg-green-50'
                  }`}
                  title="复制纯文本内容"
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

// 滑块组件
function Slider({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 100, 
  step = 1, 
  marks,
  formatValue = (v) => v.toString()
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  marks?: string[]
  formatValue?: (value: number) => string
}) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label} ({formatValue(value)})
      </label>
      <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
                      className="w-full accent-indigo-600"
        />
        {marks && (
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            {marks.map((mark, i) => <span key={i}>{mark}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}

// AI设置面板
export function AISettings({ config, onConfigChange, onClose, isOpen }: {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
  onClose: () => void
  isOpen: boolean
}) {
  return (
    <div className={`fixed top-0 left-0 h-full w-80 bg-white z-50 border-r border-slate-200 transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="flex flex-col h-full">
        <div className="flex h-16 items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center">
              <Icon name="settings" className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">模型设置</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* API Key设置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">API 设置</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">API Key</label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => onConfigChange({ ...config, apiKey: e.target.value })}
                placeholder="输入你的 API Key"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* 对话设置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">对话设置</h3>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">系统提示</label>
              <textarea
                value={config.systemPrompt}
                onChange={(e) => onConfigChange({ ...config, systemPrompt: e.target.value })}
                placeholder="设置AI的角色和行为..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[80px] resize-none"
                rows={3}
              />
              <p className="text-xs text-gray-500">定义AI的角色定位和回答风格</p>
            </div>
            
            <Slider
              label="历史消息保留数量"
              value={config.historyLimit}
              onChange={(historyLimit) => onConfigChange({
                ...config,
                historyLimit
              })}
              min={4}
              max={40}
              step={2}
              marks={['4条', '20条 推荐', '40条']}
              formatValue={(v) => `${v}条消息 (${Math.floor(v/2)}次对话)`}
            />
            <p className="text-xs text-gray-500">为节约tokens，只保留最近的消息发送给AI</p>
          </div>

          {/* V3配置 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">V3 配置</h3>
            </div>
            
            <Slider
              label="创意度"
              value={config.v3Config.temperature}
              onChange={(temperature) => onConfigChange({
                ...config,
                v3Config: { ...config.v3Config, temperature }
              })}
              min={0}
              max={2}
              step={0.1}
              marks={['0.0 精确', '1.0 均衡', '2.0 创意']}
            />

            <Slider
              label="回复长度"
              value={config.v3Config.maxTokens}
              onChange={(maxTokens) => onConfigChange({
                ...config,
                v3Config: { ...config.v3Config, maxTokens }
              })}
              min={100}
              max={8000}
              step={100}
              marks={['100', '4K 推荐', '8K 最大']}
              formatValue={(v) => v.toLocaleString() + ' tokens'}
            />
          </div>

          {/* R1配置 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-600" />
              <h3 className="text-sm font-semibold text-gray-900">R1 配置</h3>
            </div>
            
            <Slider
              label="回复长度"
              value={config.r1Config.maxTokens}
              onChange={(maxTokens) => onConfigChange({
                ...config,
                r1Config: { ...config.r1Config, maxTokens }
              })}
              min={100}
              max={64000}
              step={100}
              marks={['100', '32K 推荐', '64K 最大']}
              formatValue={(v) => v.toLocaleString() + ' tokens'}
            />
          </div>

          {/* 显示设置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">显示设置</h3>
            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
              <div>
                <span className="font-medium text-gray-900">显示思考过程</span>
                <p className="text-xs text-slate-600 mt-1">在R1模式下显示AI的推理步骤</p>
              </div>
              <input
                type="checkbox"
                checked={config.showThinking}
                onChange={(e) => onConfigChange({ ...config, showThinking: e.target.checked })}
                className="w-4 h-4 text-indigo-700 border-2 border-gray-300 rounded"
              />
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200">
          <button
            onClick={() => onConfigChange(DEFAULT_CONFIG)}
            className="w-full px-4 py-3 text-slate-600 border border-gray-300 rounded-xl hover:bg-slate-50 transition-colors font-medium"
          >
            重置为默认设置
          </button>
        </div>
      </div>
    </div>
  )
}

// 聊天输入区域
export const ChatInputArea = forwardRef<
  { focus: () => void },
  {
    value: string
    onChange: (value: string) => void
    onSend: () => void
    isLoading: boolean
    onAbort: () => void
    currentMode: ChatMode
    onModeChange: (mode: ChatMode) => void
  }
>(({ 
  value, 
  onChange, 
  onSend, 
  isLoading, 
  onAbort, 
  currentMode, 
  onModeChange 
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 暴露focus方法给父组件
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus()
    }
  }), [])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isLoading) {
        onAbort()
      } else if (value.trim()) {
        onSend()
      }
    }
  }

  const adjustHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto'
    element.style.height = Math.min(element.scrollHeight, 150) + 'px'
  }

  useEffect(() => {
    if (!value.trim() && textareaRef.current) {
      textareaRef.current.style.height = '60px'
    }
  }, [value])

  const canSend = !isLoading && value.trim()

  return (
    <div className="sticky bottom-0">
      <div className="max-w-4xl mx-auto p-6 pt-0">
        <div className="border border-gray-200 rounded-2xl bg-white focus-within:border-blue-400 transition-colors shadow-sm hover:shadow-md">
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                onChange(e.target.value)
                adjustHeight(e.target)
              }}
              onKeyPress={handleKeyPress}
              placeholder={isLoading ? "AI正在回复中，可以预输入下一条消息..." : "发送消息给 AI Assistant..."}
              className="w-full bg-transparent border-none focus:outline-none resize-none placeholder-gray-500 text-gray-900 leading-relaxed min-h-[60px] max-h-[150px]"
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <div className="flex items-center gap-4">
              <ModelToggle currentMode={currentMode} onModeChange={onModeChange} disabled={isLoading} />
              
              {isLoading && (
                <div className="flex items-center gap-2">
                  <AnimatedDots size="sm" color="slate" />
                  <span className="text-xs text-gray-500">AI正在回复中...</span>
                </div>
              )}
            </div>

            <button
              onClick={isLoading ? onAbort : onSend}
              disabled={!isLoading && !canSend}
              className={`px-5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md ${
                isLoading 
                  ? 'bg-gray-600 text-white hover:bg-gray-700'
                  : canSend
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Icon name={isLoading ? 'stop' : 'send'} />
              <span>{isLoading ? '停止' : '发送'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

ChatInputArea.displayName = 'ChatInputArea' 