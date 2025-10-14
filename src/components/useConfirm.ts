// 自定义确认对话框Hook
// 提供类似confirm()的API，但不会导致焦点丢失
// 这是一个通用的UI Hook，被多个模块使用

import { useState, useCallback } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'danger' | 'info'
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  resolve?: (result: boolean) => void
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: ''
  })

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        isOpen: true,
        resolve
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    const { resolve } = confirmState
    setConfirmState(prev => ({ ...prev, isOpen: false }))
    if (resolve) {
      resolve(true)
    }
  }, [confirmState])

  const handleCancel = useCallback(() => {
    const { resolve } = confirmState
    setConfirmState(prev => ({ ...prev, isOpen: false }))
    if (resolve) {
      resolve(false)
    }
  }, [confirmState])

  return {
    confirm,
    confirmProps: {
      isOpen: confirmState.isOpen,
      title: confirmState.title,
      message: confirmState.message,
      confirmText: confirmState.confirmText,
      cancelText: confirmState.cancelText,
      type: confirmState.type,
      onConfirm: handleConfirm,
      onCancel: handleCancel
    }
  }
}

