// 右键菜单 Hook - 简化右键菜单的使用

import { useState, useCallback } from 'react'

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
}

export function useContextMenu() {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0
  })

  const open = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState({
      isOpen: true,
      x: e.clientX,
      y: e.clientY
    })
  }, [])

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  return { ...state, open, close }
}