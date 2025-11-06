import { useState, useEffect, useRef } from 'react'
import { ConfirmDialog, Icon } from '../components'

/**
 * 空白文本编辑器页面
 * 用于临时保留文本，支持换行但不保留格式
 */
export function TextEditorPage() {
  const [content, setContent] = useState('')
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false)
  const [shouldClose, setShouldClose] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 监听窗口关闭事件
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 如果已经确认关闭，直接允许
      if (shouldClose) {
        return
      }
      
      // 如果有内容且未确认关闭，阻止关闭并显示确认对话框
      if (content.trim()) {
        e.preventDefault()
        e.returnValue = ''
        setShowCloseConfirm(true)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [content, shouldClose])

  // 获取初始置顶状态
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      ;(window as any).electronAPI.getChildWindowAlwaysOnTop('text-editor-window').then((alwaysOnTop: boolean) => {
        setIsAlwaysOnTop(alwaysOnTop)
      })
    }
  }, [])

  // 自动聚焦
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleClear = () => {
    setContent('')
    textareaRef.current?.focus()
  }

  const handleToggleAlwaysOnTop = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const newState = await (window as any).electronAPI.toggleChildWindowAlwaysOnTop('text-editor-window')
      setIsAlwaysOnTop(newState)
    }
  }

  const handleClose = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      ;(window as any).electronAPI.closeChildWindow('text-editor-window')
    }
  }

  const handleConfirmClose = () => {
    setShowCloseConfirm(false)
    setShouldClose(true)
    // 延迟一点关闭，确保状态已更新
    setTimeout(() => {
      handleClose()
    }, 0)
  }

  const wordCount = content.length
  const lineCount = content.split('\n').length

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-slate-700">空白文本</h1>
          <div className="text-xs text-slate-500">
            {wordCount} 字符 · {lineCount} 行
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleAlwaysOnTop}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 ${
              isAlwaysOnTop 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
            title={isAlwaysOnTop ? '取消置顶' : '窗口置顶'}
          >
            <Icon name="pin" className={`w-4 h-4 ${isAlwaysOnTop ? 'fill-current' : ''}`} />
          </button>
          
          <button
            onClick={handleClear}
            disabled={!content}
            className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="清空内容"
          >
            清空
          </button>
          
          <button
            onClick={() => {
              if (content.trim()) {
                setShowCloseConfirm(true)
              } else {
                handleClose()
              }
            }}
            className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            title="关闭窗口"
          >
            关闭
          </button>
        </div>
      </div>

      {/* 文本编辑区域 */}
      <div className="flex-1 p-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full resize-none border border-slate-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-mono text-sm leading-relaxed"
          placeholder="在这里输入文本..."
          spellCheck={false}
        />
      </div>

      {/* 关闭确认对话框 */}
      <ConfirmDialog
        isOpen={showCloseConfirm}
        title="确认关闭"
        message="该内容无法保存，关闭后将会丢失。确定要关闭吗？"
        confirmText="确定关闭"
        cancelText="取消"
        type="warning"
        onConfirm={handleConfirmClose}
        onCancel={() => setShowCloseConfirm(false)}
      />
    </div>
  )
}

