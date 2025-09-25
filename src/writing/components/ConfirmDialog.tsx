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
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
      default: // warning
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
    }
  }

  const confirmBg = getConfirmButtonStyle()

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={(e) => {
        // 点击背景区域时取消对话框
        if (e.target === e.currentTarget) {
          onCancel()
        }
      }}
    >
      {/* 对话框容器 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-lg shadow-xl border-2 border-slate-300 max-w-md w-full mx-auto transform transition-all"
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
          <div className="p-6">
            <div className="text-center">
              <h3 id="dialog-title" className="text-lg font-medium text-gray-900 mb-3">
                {title}
              </h3>
              <p id="dialog-description" className="text-sm text-gray-600 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
          
          {/* 按钮区域 */}
          <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              {cancelText}
            </button>
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${confirmBg}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}