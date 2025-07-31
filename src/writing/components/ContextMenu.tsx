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
        // 如果点击的是右键，不关闭菜单
        if (e.button === 2) return
        
        // 检查点击是否在菜单内部
        const target = e.target as Element
        const menuElement = document.querySelector('.context-menu')
        if (menuElement && menuElement.contains(target)) {
          return
        }
        
        onClose()
      }
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }
      
      // 使用捕获阶段，确保在其他处理器之前执行
      document.addEventListener('click', handleClick, true)
      document.addEventListener('keydown', handleEscape)
      
      return () => {
        document.removeEventListener('click', handleClick, true)
        document.removeEventListener('keydown', handleEscape)
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
        className="context-menu fixed bg-white rounded border border-gray-300 py-1 z-50 min-w-28 shadow"
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
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                try {
                  item.onClick()
                  onClose()
                } catch (error) {
                  console.error('菜单项执行失败:', item.label, error)
                  onClose()
                }
              }}
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