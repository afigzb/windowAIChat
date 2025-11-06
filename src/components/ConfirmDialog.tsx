// 自定义确认对话框组件
// 替代原生confirm，避免焦点丢失问题

import { useEffect } from 'react'
import { Icon } from './Icon'

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

  const getIconStyle = () => {
    switch (type) {
      case 'danger':
        return { 
          bgClass: 'bg-red-100', 
          iconClass: 'text-red-600',
          buttonClass: 'bg-red-500 hover:bg-red-600 text-white'
        }
      case 'info':
        return { 
          bgClass: 'bg-blue-100', 
          iconClass: 'text-blue-600',
          buttonClass: 'bg-blue-500 hover:bg-blue-600 text-white'
        }
      default: // warning
        return { 
          bgClass: 'bg-amber-100', 
          iconClass: 'text-amber-600',
          buttonClass: 'bg-amber-500 hover:bg-amber-600 text-white'
        }
    }
  }

  const getIconName = (): 'delete' | 'info' | 'warning' => {
    switch (type) {
      case 'danger':
        return 'delete'
      case 'info':
        return 'info'
      default: // warning
        return 'warning'
    }
  }

  const iconStyles = getIconStyle()

  const getSubtitle = () => {
    switch (type) {
      case 'danger':
        return '此操作无法撤销'
      case 'info':
        return '请确认您的选择'
      default: // warning
        return '请仔细确认'
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div 
        className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border-2 border-gray-200 transform transition-all duration-300 scale-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-12 h-12 ${iconStyles.bgClass} rounded-full flex items-center justify-center shadow-md`}>
            <Icon name={getIconName()} className={`w-6 h-6 ${iconStyles.iconClass}`} />
          </div>
          <div>
            <h3 id="dialog-title" className="text-xl font-bold text-gray-900">
              {title}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{getSubtitle()}</p>
          </div>
        </div>
        <p id="dialog-description" className="text-base text-gray-700 mb-8 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3">
          {cancelText && (
            <button
              onClick={onCancel}
              className="flex-1 px-5 py-3 bg-gray-100 text-gray-800 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`${cancelText ? 'flex-1' : 'w-full'} px-5 py-3 ${iconStyles.buttonClass} text-sm font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}