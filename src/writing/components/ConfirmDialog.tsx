// 自定义确认对话框组件
// 替代原生confirm，避免焦点丢失问题

import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'warning' | 'danger' | 'info'
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'warning'
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  // 简单的焦点管理
  useEffect(() => {
    if (isOpen) {
      // 对话框打开时聚焦到确认按钮
      setTimeout(() => {
        confirmButtonRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // 处理键盘事件
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      } else if (e.key === 'Enter') {
        onConfirm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onConfirm, onCancel])

  if (!isOpen) return null

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:ring-red-400 shadow-md hover:shadow-lg'
      case 'info':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-400 shadow-md hover:shadow-lg'
      default: // warning
        return 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 focus:ring-amber-400 shadow-md hover:shadow-lg'
    }
  }

  const confirmBg = getConfirmButtonStyle()

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={(e) => {
        // 点击背景区域时取消对话框
        if (e.target === e.currentTarget) {
          onCancel()
        }
      }}
    >
      {/* 对话框容器 */}
      <div className="flex min-h-full items-center justify-center p-6 animate-fade-in">
        <div 
          className="relative bg-white rounded-2xl shadow-2xl border-2 border-gray-200 max-w-md w-full mx-auto transform transition-all duration-300 scale-100 hover:scale-[1.02]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
          onClick={(e) => {
            // 阻止点击对话框内容时触发背景点击
            e.stopPropagation()
          }}
        >
          {/* 对话框内容 */}
          <div className="p-8">
            <div className="text-center">
              <h3 id="dialog-title" className="text-xl font-bold text-gray-900 mb-4">
                {title}
              </h3>
              <p id="dialog-description" className="text-base text-gray-700 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
          
          {/* 按钮区域 */}
          <div className="px-8 py-5 bg-gradient-to-r from-gray-50 to-slate-50 flex justify-end space-x-4 rounded-b-2xl border-t-2 border-gray-200">
            <button
              onClick={onCancel}
              className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-100 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {cancelText}
            </button>
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              className={`px-6 py-3 text-sm font-semibold text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 ${confirmBg}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}