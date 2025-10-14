/**
 * 消息气泡组件
 * 
 * 功能：
 * - 显示用户和AI的消息（支持不同样式）
 * - 分支导航（查看/切换不同回复分支）
 * - AI思考过程展示（可折叠）
 * - 消息编辑（用户消息重新发送、AI消息直接修改）
 * - 消息操作（重新生成、复制、删除）
 * - 流式生成时的实时显示
 * 
 * 子组件：
 * - BranchNavigation: 分支切换控件
 * - ThinkingContent: AI思考过程展示
 */

import { useState, useRef } from 'react'
import type { MessageBubbleProps } from '../types'
import { MarkdownRenderer } from '../../md-html-dock/renderers/MarkdownRenderer'
import { Icon, AnimatedDots } from './components'

// ===== 子组件：分支导航控件 =====

function BranchNavigation({ navigation, onNavigate }: {
  navigation: import('../types').BranchNavigation
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
      
      <span className="px-3 py-1 text-gray-600 font-medium bg-gray-100 rounded-lg min-w-[2rem] max-w-[4rem] text-center whitespace-nowrap overflow-hidden text-ellipsis">
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

// ===== 子组件：思考过程展示 =====

function ThinkingContent({ content, isExpanded, onToggle }: {
  content: string
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="mb-6 w-full min-w-[8rem] bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200 rounded-2xl p-6 shadow-sm">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 mb-4 w-full text-left"
      >
        <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm animate-pulse" />
        <span className="text-base font-semibold text-gray-800 whitespace-nowrap">💭 思考过程</span>
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
          <span className="whitespace-nowrap">{isExpanded ? '收起' : '展开'}</span>
          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <Icon name="chevronDown" className="w-4 h-4" />
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="text-sm text-gray-700 font-mono leading-relaxed whitespace-pre-wrap bg-white rounded-xl p-6 border-2 border-gray-200 shadow-md min-w-[4rem] break-words">
          {content}
        </div>
      )}
    </div>
  )
}

// ===== 主组件：消息气泡 =====

export function MessageBubble({ 
  node, 
  onRegenerate, 
  onEditUserMessage,
  onEditAssistantMessage,
  onDelete,
  branchNavigation, 
  onBranchNavigate, 
  isInActivePath, 
  showBranchControls,
  isGenerating = false,
  currentThinking = '',
  currentAnswer = '',
  isInContext
}: MessageBubbleProps) {
  const [showThinkingExpanded, setShowThinkingExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(node.content)
  const [isHovered, setIsHovered] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const isUser = node.role === 'user'
  const contentRef = useRef<HTMLDivElement>(null)

  const handleEditSave = () => {
    if (editContent.trim() && editContent.trim() !== node.content) {
      if (isUser && onEditUserMessage) {
        onEditUserMessage(node.id, editContent.trim())
      } else if (!isUser && onEditAssistantMessage) {
        onEditAssistantMessage(node.id, editContent.trim())
      }
    }
    setIsEditing(false)
  }

  const handleEditCancel = () => {
    setEditContent(node.content)
    setIsEditing(false)
  }
  
  return (
    <div 
      className={`w-full max-w-4xl mx-auto px-8 py-8 transition-opacity duration-300 ${
        isInActivePath ? '' : 'opacity-30 pointer-events-none'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start gap-4`}>
        {/* AI头像 */}
        {!isUser && (
          <div className="flex-shrink-0 mt-1">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-base font-bold">AI</span>
            </div>
          </div>
        )}

        <div className={`flex-1 min-w-[10rem] max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
          {/* 用户标识和状态 */}
          <div className={`flex items-center mb-4 gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className="flex items-center gap-3">
              <span className={`text-base font-semibold min-w-[2rem] max-w-[6rem] whitespace-nowrap overflow-hidden text-ellipsis ${isUser ? 'text-blue-600' : 'text-gray-800'}`}>
                {isUser ? 'You' : 'AI Assistant'}
              </span>
              {(node.role === 'user' || node.role === 'assistant') && typeof isInContext === 'boolean' && (
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isInContext
                    ? 'bg-blue-500 shadow-sm shadow-blue-500/30'
                    : 'bg-gray-400'
                }`} title={isInContext ? '计入上下文' : '未计入上下文'} />
              )}
              {!isUser && isGenerating && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-sm rounded-full border-2 border-blue-200 shadow-sm min-w-[4rem] whitespace-nowrap">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50 flex-shrink-0" />
                  <span className="font-medium">正在回复</span>
                </div>
              )}
            </div>
            
            {/* 时间戳 - 只在hover时显示 */}
            {node.content !== '正在生成...' && (
              <div className={`text-sm text-gray-500 transition-opacity duration-300 min-w-[2rem] whitespace-nowrap ${
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
                <div className="mb-6 w-full min-w-[8rem] bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-md">
                  <div className="flex items-center gap-4 mb-4">
                    <AnimatedDots color="teal" />
                    <span className="text-base font-semibold text-blue-700 whitespace-nowrap">💭 正在思考</span>
                  </div>
                  <div className="text-sm text-gray-700 font-mono leading-relaxed whitespace-pre-wrap bg-white rounded-xl p-5 border-2 border-blue-200 shadow-sm min-w-[4rem] break-words">
                    {currentThinking}
                  </div>
                </div>
              )}
              
              {!isGenerating && node.reasoning_content && (
                <div className="mb-6 w-full min-w-[8rem]">
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
            <div className={`${isEditing ? 'w-full min-w-[8rem]' : ''}`}>
              <div className={`${
                isEditing 
                  ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-6 shadow-md' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl px-6 py-4 shadow-lg hover:shadow-xl transition-all duration-300'
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
                      className="w-full bg-white text-gray-900 placeholder-gray-400 border-2 border-gray-300 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none text-base leading-relaxed"
                      placeholder="修改消息内容..."
                      rows={Math.max(2, editContent.split('\n').length)}
                      autoFocus
                    />
                    <div className="flex gap-3 justify-end min-w-[6rem]">
                      <button 
                        onClick={handleEditCancel} 
                        className="px-5 py-2.5 text-gray-600 hover:text-gray-800 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-gray-100 min-w-[2rem] whitespace-nowrap"
                      >
                        取消
                      </button>
                      <button 
                        onClick={handleEditSave} 
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-w-[6rem] whitespace-nowrap"
                      >
                        保存并重新生成
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed text-base break-words">{node.content}</div>
                )}
              </div>
            </div>
          ) : (
            /* AI消息 - 卡片样式 */
            <div className={`w-full min-w-[8rem] ${
              isEditing 
                ? 'bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-blue-300 rounded-2xl shadow-md' 
                : 'bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300'
            } overflow-hidden`}>
              <div className="p-8">
                {isEditing ? (
                  <div className="space-y-4">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          e.preventDefault()
                          handleEditSave()
                        } else if (e.key === 'Escape') {
                          handleEditCancel()
                        }
                      }}
                      className="w-full bg-white text-gray-900 placeholder-gray-400 border-2 border-gray-300 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none text-base leading-relaxed"
                      placeholder="修改AI回答内容..."
                      rows={Math.max(3, editContent.split('\n').length)}
                      autoFocus
                    />
                    <div className="flex gap-3 justify-end min-w-[6rem]">
                      <button 
                        onClick={handleEditCancel} 
                        className="px-5 py-2.5 text-gray-600 hover:text-gray-800 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-gray-100 min-w-[2rem] whitespace-nowrap"
                      >
                        取消
                      </button>
                      <button 
                        onClick={handleEditSave} 
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-w-[6rem] whitespace-nowrap"
                      >
                        保存修改
                      </button>
                    </div>
                  </div>
                ) : isGenerating ? (
                  currentAnswer ? (
                    <div ref={contentRef} className="text-gray-800 leading-relaxed min-w-[4rem] break-words">
                      <MarkdownRenderer content={currentAnswer} />
                    </div>
                  ) : (
                    <div className="flex items-center gap-5 p-10 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border-2 border-gray-200">
                      <AnimatedDots size="md" color="teal" />
                      <span className="text-lg text-gray-700 font-medium whitespace-nowrap">正在准备回复...</span>
                    </div>
                  )
                ) : (
                  <div ref={contentRef} className="min-w-[4rem] break-words">
                    <MarkdownRenderer 
                      content={node.content} 
                      className="text-gray-800 leading-relaxed text-base" 
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 底部操作控件 */}
          <div className={`flex items-center gap-4 mt-5 min-w-[4rem] transition-opacity duration-300 ${
            isHovered || showBranchControls ? 'opacity-100' : 'opacity-0'
          } ${isUser ? 'justify-end' : 'justify-start'}`}>
            {/* 分支导航 */}
            {showBranchControls && branchNavigation && onBranchNavigate && (
              <BranchNavigation navigation={branchNavigation} onNavigate={onBranchNavigate} />
            )}
            
            {/* 操作按钮 */}
            {!isUser && !isGenerating && !isEditing && (
              <div className="flex items-center gap-2 min-w-[4rem]">
                {onRegenerate && (
                  <button
                    onClick={() => onRegenerate(node.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 min-w-[3rem] whitespace-nowrap"
                    title="重新生成回答"
                  >
                    <Icon name="regenerate" className="w-3 h-3 flex-shrink-0" />
                    <span>重新生成</span>
                  </button>
                )}
                
                {onEditAssistantMessage && (
                  <button
                    onClick={() => {
                      setEditContent(node.content)
                      setIsEditing(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 min-w-[3rem] whitespace-nowrap"
                    title="编辑AI回答"
                  >
                    <Icon name="edit" className="w-3 h-3 flex-shrink-0" />
                    <span>编辑</span>
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
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 min-w-[3rem] whitespace-nowrap ${
                    copySuccess 
                      ? 'text-green-600 bg-green-50' 
                      : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                  }`}
                  title="复制内容"
                >
                  <Icon name="copy" className="w-3 h-3 flex-shrink-0" />
                  <span>{copySuccess ? '已复制' : '复制'}</span>
                </button>
                
                {onDelete && (
                  <button
                    onClick={() => onDelete(node.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 min-w-[3rem] whitespace-nowrap"
                    title="删除此节点及其兄弟节点"
                  >
                    <Icon name="delete" className="w-3 h-3 flex-shrink-0" />
                    <span>删除</span>
                  </button>
                )}
              </div>
            )}
            
            {isUser && !isGenerating && !isEditing && (
              <div className="flex items-center gap-2 min-w-[4rem]">
                {onEditUserMessage && (
                  <button
                    onClick={() => {
                      setEditContent(node.content)
                      setIsEditing(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 min-w-[3rem] whitespace-nowrap"
                    title="修改消息并重新生成"
                  >
                    <Icon name="edit" className="w-3 h-3 flex-shrink-0" />
                    <span>修改</span>
                  </button>
                )}
                
                {onDelete && (
                  <button
                    onClick={() => onDelete(node.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 min-w-[3rem] whitespace-nowrap"
                    title="删除此节点及其兄弟节点"
                  >
                    <Icon name="delete" className="w-3 h-3 flex-shrink-0" />
                    <span>删除</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 用户头像 */}
        {isUser && (
          <div className="flex-shrink-0 mt-1">
            <div className="w-11 h-11 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-base font-bold">U</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
