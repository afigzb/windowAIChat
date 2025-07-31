// 通用右键菜单组件

import { useEffect } from 'react'

export interface MenuItem {
  label: string
  icon?: string
  onClick: () => void
  variant?: 'normal' | 'danger'
  divider?: boolean
}

interface ContextMenuProps {
  isOpen: boolean
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export function ContextMenu({ isOpen, x, y, items, onClose }: ContextMenuProps) {
  useEffect(() => {
    if (isOpen) {
      const handleClick = (e: MouseEvent) => {
        // 如果点击的是右键，不关闭菜单（让新的右键菜单处理）
        if (e.button === 2) return
        onClose()
      }
      
      const handleContextMenu = (e: MouseEvent) => {
        // 右键点击时关闭当前菜单，让新菜单打开
        onClose()
      }
      
      // 使用捕获阶段，确保在其他处理器之前执行
      document.addEventListener('click', handleClick, true)
      document.addEventListener('contextmenu', handleContextMenu, true)
      
      return () => {
        document.removeEventListener('click', handleClick, true)
        document.removeEventListener('contextmenu', handleContextMenu, true)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()} 
      />
      <div 
        className="fixed bg-white rounded border border-gray-300 py-1 z-50 min-w-28 shadow"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {items.map((item, index) => (
          item.divider ? (
            <div key={index} className="border-t border-gray-200 my-1" />
          ) : (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full text-left px-3 py-1 text-sm flex items-center gap-2 ${
                item.variant === 'danger' 
                  ? 'text-red-600 hover:bg-red-50' 
                  : 'hover:bg-gray-100'
              }`}
            >
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          )
        ))}
      </div>
    </>
  )
}