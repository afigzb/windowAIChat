import { useState, useRef, useEffect } from 'react'
import type { MessageNode, AIConfig, ChatMode, MessageBubbleProps, BranchNavigation } from '../data/types'
import { DEFAULT_CONFIG } from '../api/api'
import { MarkdownRenderer } from './MarkdownRenderer'

// ===== 公共组件 =====

// 动画点组件 - 统一的加载动画
const AnimatedDots = ({ size = 'sm', color = 'slate' }: { size?: 'sm' | 'md'; color?: 'teal' | 'slate' }) => {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  const colorClasses = {
    teal: 'bg-teal-500',
    slate: 'bg-slate-400'
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
type IconName = 'settings' | 'close' | 'send' | 'stop' | 'chevronDown' | 'chevronLeft' | 'chevronRight' | 'regenerate' | 'edit'

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
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
  }

  if (strokeIcons[name]) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={strokeIcons[name]} />
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
            ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100' 
            : 'text-slate-300 cursor-not-allowed'
        }`}
        title="上一个分支"
      >
        <Icon name="chevronLeft" className="w-3 h-3" />
      </button>
      
      <span className="px-3 py-1 text-slate-600 font-medium bg-slate-100 rounded-lg min-w-[3rem] text-center">
        {navigation.currentIndex + 1}/{navigation.totalBranches}
      </span>
      
      <button
        onClick={() => onNavigate('right')}
        disabled={!navigation.canNavigateRight}
        className={`p-1 rounded-lg transition-colors ${
          navigation.canNavigateRight 
            ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100' 
            : 'text-slate-300 cursor-not-allowed'
        }`}
        title="下一个分支"
      >
        <Icon name="chevronRight" className="w-3 h-3" />
      </button>
    </div>
  )
}

// 模式切换按钮
export function ModelToggle({ currentMode, onModeChange, disabled }: {
  currentMode: ChatMode
  onModeChange: (mode: ChatMode) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => onModeChange(currentMode === 'v3' ? 'r1' : 'v3')}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
        disabled 
          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' 
          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
      }`}
    >
      <div className={`w-2 h-2 rounded-full ${currentMode === 'r1' ? 'bg-slate-600' : 'bg-teal-500'}`} />
      <span>{currentMode.toUpperCase()}</span>
    </button>
  )
}

// 思考过程展示
function ThinkingContent({ content, isExpanded, onToggle }: {
  content: string
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="mb-6 w-full bg-slate-50 border border-slate-200 rounded-2xl p-5">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 mb-4 w-full text-left"
      >
        <div className="w-2 h-2 bg-teal-500 rounded-full" />
        <span className="text-sm font-medium text-slate-700">💭 思考过程</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <span>{isExpanded ? '收起' : '展开'}</span>
          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <Icon name="chevronDown" className="w-4 h-4" />
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="text-sm text-slate-700 font-mono leading-relaxed whitespace-pre-wrap bg-white rounded-xl p-4 border border-slate-200">
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
  showThinking = false
}: MessageBubbleProps) {
  const [showThinkingExpanded, setShowThinkingExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(node.content)
  const [isHovered, setIsHovered] = useState(false)
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
            <div className="w-9 h-9 bg-teal-500 rounded-2xl flex items-center justify-center">
              <span className="text-white text-sm font-medium">AI</span>
            </div>
          </div>
        )}

        <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
          {/* 用户标识和状态 */}
          <div className={`flex items-center mb-3 gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isUser ? 'text-teal-600' : 'text-slate-700'}`}>
                {isUser ? 'You' : 'DeepSeek'}
              </span>
              {!isUser && isGenerating && (
                <div className="flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 text-xs rounded-full border border-teal-200">
                  <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                  <span>正在回复</span>
                </div>
              )}
            </div>
            
            {/* 时间戳 - 只在hover时显示 */}
            {node.content !== '正在生成...' && (
              <div className={`text-xs text-slate-400 transition-opacity duration-200 ${
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
                <div className="mb-6 w-full bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <AnimatedDots color="teal" />
                    <span className="text-sm font-medium text-slate-700">💭 正在思考</span>
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
                  ? 'bg-teal-50 border border-teal-200 rounded-2xl p-4' 
                  : 'bg-teal-500 text-white rounded-2xl px-5 py-3'
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
                      className="w-full bg-white text-slate-900 placeholder-slate-500 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                      placeholder="修改消息内容..."
                      rows={Math.max(2, editContent.split('\n').length)}
                      autoFocus
                    />
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={handleEditCancel} 
                        className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm rounded-lg transition-colors"
                      >
                        取消
                      </button>
                      <button 
                        onClick={handleEditSave} 
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm rounded-lg transition-colors"
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
            <div className="w-full bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-6">
                {isGenerating ? (
                  currentAnswer ? (
                    <div className="text-slate-800 leading-relaxed">
                      <MarkdownRenderer content={currentAnswer} />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-8 bg-slate-50 rounded-xl">
                      <AnimatedDots size="md" color="teal" />
                      <span className="text-slate-600">正在准备回复...</span>
                    </div>
                  )
                ) : (
                  <MarkdownRenderer 
                    content={node.content} 
                    className="text-slate-800 leading-relaxed text-[15px]" 
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
            {!isUser && !isGenerating && onRegenerate && (
              <button
                onClick={() => onRegenerate(node.id)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                title="重新生成回答"
              >
                <Icon name="regenerate" className="w-3 h-3" />
                <span>重新生成</span>
              </button>
            )}
            
            {isUser && !isGenerating && !isEditing && onEditUserMessage && (
              <button
                onClick={() => {
                  setEditContent(node.content)
                  setIsEditing(true)
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
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
            <div className="w-9 h-9 bg-teal-500 rounded-2xl flex items-center justify-center">
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
      <label className="block text-sm font-medium text-slate-700">
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
          className="w-full accent-teal-500"
        />
        {marks && (
          <div className="flex justify-between text-xs text-slate-500 mt-2">
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
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-teal-500 flex items-center justify-center">
              <Icon name="settings" className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">模型设置</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* V3配置 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              <h3 className="text-sm font-semibold text-slate-900">DeepSeek-V3 配置</h3>
            </div>
            
            <Slider
              label="🌡️ 创意度"
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
              label="📝 回复长度"
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
              <h3 className="text-sm font-semibold text-slate-900">DeepSeek-R1 配置</h3>
            </div>
            
            <Slider
              label="📝 回复长度"
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
            <h3 className="text-sm font-semibold text-slate-900">💭 显示设置</h3>
            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
              <div>
                <span className="font-medium text-slate-900">显示思考过程</span>
                <p className="text-xs text-slate-600 mt-1">在R1模式下显示AI的推理步骤</p>
              </div>
              <input
                type="checkbox"
                checked={config.showThinking}
                onChange={(e) => onConfigChange({ ...config, showThinking: e.target.checked })}
                className="w-4 h-4 text-teal-600 border-2 border-slate-300 rounded"
              />
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200">
          <button
            onClick={() => onConfigChange(DEFAULT_CONFIG)}
            className="w-full px-4 py-3 text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium"
          >
            重置为默认设置
          </button>
        </div>
      </div>
    </div>
  )
}

// 聊天输入区域
export function ChatInputArea({ 
  value, 
  onChange, 
  onSend, 
  isLoading, 
  onAbort, 
  currentMode, 
  onModeChange 
}: {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isLoading: boolean
  onAbort: () => void
  currentMode: ChatMode
  onModeChange: (mode: ChatMode) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
      <div className="max-w-4xl mx-auto p-6 pt-0 bg-slate-50">
        <div className="border border-slate-200 rounded-2xl bg-white focus-within:border-teal-300 transition-colors">
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                onChange(e.target.value)
                adjustHeight(e.target)
              }}
              onKeyPress={handleKeyPress}
              placeholder="发送消息给 DeepSeek Assistant..."
              className="w-full bg-transparent border-none focus:outline-none resize-none placeholder-slate-500 text-slate-900 leading-relaxed min-h-[60px] max-h-[150px]"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
            <div className="flex items-center gap-4">
              <ModelToggle currentMode={currentMode} onModeChange={onModeChange} disabled={isLoading} />
              
              {isLoading && (
                <div className="flex items-center gap-2">
                  <AnimatedDots size="sm" color="slate" />
                  <span className="text-xs text-slate-500">AI正在回复中...</span>
                </div>
              )}
            </div>

            <button
              onClick={isLoading ? onAbort : onSend}
              disabled={!isLoading && !canSend}
              className={`px-5 py-2.5 rounded-xl transition-colors text-sm font-medium flex items-center gap-2 ${
                isLoading 
                  ? 'bg-slate-600 text-white hover:bg-slate-700'
                  : canSend
                    ? 'bg-teal-500 text-white hover:bg-teal-600'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
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
} 