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
 * - CollapsibleSection: 通用可折叠内容展示组件
 */

import { useState, useRef, useEffect } from 'react'
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

// ===== 子组件：可折叠内容展示 =====

function CollapsibleSection({ 
  title, 
  content, 
  isExpanded, 
  onToggle 
}: {
  title: string
  content: string
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="w-full min-w-[8rem] bg-white border-2 border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 w-full text-left px-6 hover:bg-gray-50 ${
          isExpanded ? 'py-3' : 'py-6'
        }`}
      >
        <span className="text-sm text-gray-700 whitespace-nowrap">{title}</span>
        <div className={`ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          <Icon name="chevronDown" className="w-4 h-4 text-gray-500" />
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap border-t border-gray-200 break-words">
          <div className="pt-4">{content}</div>
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
  currentAgentOptimizing = '',
  isInContext
}: MessageBubbleProps) {
  const [showThinkingExpanded, setShowThinkingExpanded] = useState(false)
  const [showAgentResultExpanded, setShowAgentResultExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const isUser = node.role === 'user'
  // 对于用户消息，使用 userInput；对于 AI 消息，使用 content
  const [editContent, setEditContent] = useState(
    isUser && node.components?.userInput ? node.components.userInput : node.content
  )
  const [isHovered, setIsHovered] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [thinkingCompleted, setThinkingCompleted] = useState(false) // 标记思考是否已完成
  const contentRef = useRef<HTMLDivElement>(null)

  // 监听思考过程是否完成：当有思考内容且开始生成答案时，认为思考完成
  useEffect(() => {
    if (isGenerating && currentThinking && currentAnswer) {
      // 思考过程完成，开始生成答案了
      if (!thinkingCompleted) {
        setThinkingCompleted(true)
        setShowThinkingExpanded(false) // 立即自动折叠
      }
    } else if (!isGenerating) {
      // 生成结束，重置标记
      setThinkingCompleted(false)
    }
  }, [isGenerating, currentThinking, currentAnswer, thinkingCompleted])

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
    setEditContent(isUser && node.components?.userInput ? node.components.userInput : node.content)
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

          {/* AI消息的 Agent 优化结果展示（放在思考过程上面） */}
          {!isUser && (() => {
            // 如果正在显示"正在优化输入..."且有流式内容
            if (isGenerating && node.content === '正在优化输入...' && currentAgentOptimizing) {
              return (
                <div className="mb-4 w-full min-w-[8rem] bg-white border-2 border-blue-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <span className="text-sm text-blue-700 font-medium whitespace-nowrap">正在优化输入</span>
                  </div>
                  <div className="px-6 py-4 text-sm text-gray-700 leading-relaxed">
                    <div className="whitespace-pre-wrap break-words">
                      <MarkdownRenderer content={currentAgentOptimizing} />
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-blue-500">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-xs">生成中...</span>
                    </div>
                  </div>
                </div>
              )
            }
            
            // 如果正在优化但还没有流式内容
            if (isGenerating && node.content === '正在优化输入...') {
              return (
                <div className="mb-4 w-full min-w-[8rem] bg-white border-2 border-blue-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <span className="text-sm text-blue-700 font-medium whitespace-nowrap">正在优化输入</span>
                  </div>
                  <div className="px-6 py-4 text-sm text-gray-700 leading-relaxed">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span>AI 正在分析并优化您的输入...</span>
                    </div>
                  </div>
                </div>
              )
            }
            
            // Agent 处理完成后，显示结果（可折叠）
            if (node.components?.agentResults && node.components.agentResults.length > 0) {
              const result = node.components.agentResults.find(r => r.success && r.metadata)
              
              if (!result || !result.metadata) return null
              
              // 检查是否有实际修改
              const hasModification = result.optimizedInput && 
                result.optimizedInput.trim().length > 0 &&
                result.metadata.originalInput.trim() !== result.optimizedInput.trim()
              
              // 构建显示内容
              let displayContent: string
              if (hasModification) {
                displayContent = `优化后：\n${result.optimizedInput}`
              } else {
                displayContent = `输入已优化，无需修改\n\n原始输入：\n${result.metadata.originalInput}`
              }
              
              return (
                <div className="mb-4 w-full">
                  <CollapsibleSection
                    title={hasModification ? "AI 优化" : "AI 检查"}
                    content={displayContent}
                    isExpanded={showAgentResultExpanded}
                    onToggle={() => setShowAgentResultExpanded(!showAgentResultExpanded)}
                  />
                </div>
              )
            }
            
            return null
          })()}
          
          {/* AI思考过程 */}
          {!isUser && (
            <>
              {/* 思考过程生成中（展开状态） - 仅当思考尚未完成时显示 */}
              {isGenerating && currentThinking && !thinkingCompleted && (
                <div className="mb-4 w-full min-w-[8rem] bg-white border-2 border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-3 bg-gray-50">
                    <span className="text-sm text-gray-700 whitespace-nowrap">思考过程</span>
                  </div>
                  <div className="px-6 pb-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap border-t border-gray-200 break-words">
                    <div className="pt-4">{currentThinking}</div>
                  </div>
                </div>
              )}
              
              {/* 思考过程已完成（可折叠状态） - 一旦完成立即显示 */}
              {(thinkingCompleted || node.reasoning_content) && (currentThinking || node.reasoning_content) && (
                <div className="mb-6 w-full min-w-[8rem]">
                  <CollapsibleSection
                    title="思考过程"
                    content={node.reasoning_content || currentThinking}
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
                  ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-4 shadow-md' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl px-6 py-4 shadow-lg hover:shadow-xl transition-all duration-300'
              }`}>
                {isEditing ? (
                  <div className="space-y-2.5">
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
                      className="w-full bg-white text-gray-900 placeholder-gray-400 border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-y text-base leading-relaxed"
                      placeholder="修改消息内容..."
                      rows={Math.max(5, Math.min(editContent.split('\n').length, 15))}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={handleEditCancel} 
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-gray-100 whitespace-nowrap"
                      >
                        取消
                      </button>
                      <button 
                        onClick={handleEditSave} 
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 whitespace-nowrap"
                      >
                        保存并重新生成
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed text-base break-words">
                    {node.content}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* AI消息 - 卡片样式 */
            <div className={`w-full min-w-[8rem] ${
              isEditing 
                ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl shadow-md' 
                : 'bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300'
            } overflow-hidden`}>
              <div className={isEditing ? "p-4" : "p-8 pb-4"}>
                {isEditing ? (
                  <div className="space-y-2.5">
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
                      className="w-full bg-white text-gray-900 placeholder-gray-400 border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-y text-base leading-relaxed"
                      placeholder="修改AI回答内容..."
                      rows={Math.max(8, Math.min(editContent.split('\n').length + 2, 20))}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={handleEditCancel} 
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-gray-100 whitespace-nowrap"
                      >
                        取消
                      </button>
                      <button 
                        onClick={handleEditSave} 
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 whitespace-nowrap"
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
                    <div className="flex items-center gap-5">
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
          <div className={`flex flex-col gap-3 mt-5 min-w-[4rem] transition-opacity duration-300 ${
            isHovered || showBranchControls ? 'opacity-100' : 'opacity-0'
          } ${isUser ? 'items-end' : 'items-start'}`}>
            {/* 操作按钮组 */}
            {!isUser && !isGenerating && !isEditing && (
              <div className="flex items-center shadow-sm rounded-lg overflow-hidden border border-gray-300">
                {onRegenerate && (
                  <button
                    onClick={() => onRegenerate(node.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200 border-r border-gray-300 whitespace-nowrap"
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
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors duration-200 border-r border-gray-300 whitespace-nowrap"
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
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-200 border-r border-gray-300 whitespace-nowrap ${
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
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors duration-200 whitespace-nowrap"
                    title="删除此节点及其兄弟节点"
                  >
                    <Icon name="delete" className="w-3 h-3 flex-shrink-0" />
                    <span>删除</span>
                  </button>
                )}
              </div>
            )}
            
            {isUser && !isGenerating && !isEditing && (
              <div className="flex items-center shadow-sm rounded-lg overflow-hidden border border-gray-300">
                {onEditUserMessage && (
                  <button
                    onClick={() => {
                      setEditContent(node.components?.userInput || node.content)
                      setIsEditing(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200 border-r border-gray-300 whitespace-nowrap"
                    title="修改消息并重新生成"
                  >
                    <Icon name="edit" className="w-3 h-3 flex-shrink-0" />
                    <span>修改</span>
                  </button>
                )}
                
                {onDelete && (
                  <button
                    onClick={() => onDelete(node.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors duration-200 whitespace-nowrap"
                    title="删除此节点及其兄弟节点"
                  >
                    <Icon name="delete" className="w-3 h-3 flex-shrink-0" />
                    <span>删除</span>
                  </button>
                )}
              </div>
            )}
            
            {/* 分支导航 */}
            {showBranchControls && branchNavigation && onBranchNavigate && (
              <BranchNavigation navigation={branchNavigation} onNavigate={onBranchNavigate} />
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
