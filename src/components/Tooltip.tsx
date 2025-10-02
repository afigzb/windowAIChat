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
      <svg 
        className="w-4 h-4 text-gray-600 hover:text-gray-900 cursor-help" 
        fill="none" 
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" />
      </svg>
      
      <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute left-0 top-6 z-50 w-80 p-3 bg-gray-800 text-white text-xs rounded shadow-lg">
        {content}
      </div>
    </div>
  )
}

