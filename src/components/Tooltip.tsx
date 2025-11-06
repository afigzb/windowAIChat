import { Icon } from './Icon'

interface TooltipProps {
  content: string
  className?: string
}

/**
 * 悬停提示组件
 */
export function Tooltip({ content, className = '' }: TooltipProps) {
  return (
    <div className={`group relative ${className}`}>
      <Icon 
        name="help" 
        className="w-4 h-4 text-gray-600 hover:text-gray-900 cursor-help"
      />
      
      <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute left-0 top-6 z-50 w-80 p-3 bg-gray-800 text-white text-xs rounded shadow-lg">
        {content}
      </div>
    </div>
  )
}

