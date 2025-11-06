/**
 * 加载动画点组件
 */

export const AnimatedDots = ({ 
  size = 'sm', 
  color = 'slate' 
}: { 
  size?: 'sm' | 'md'
  color?: 'teal' | 'slate' 
}) => {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
  const colorClasses = {
    teal: 'bg-blue-500',
    slate: 'bg-gray-400'
  }
  
  return (
    <div className="flex items-center justify-center gap-1">
      {[0, 0.1, 0.2].map((delay, i) => (
        <div 
          key={i}
          className={`${dotSize} ${colorClasses[color]} rounded-full animate-bounce`}
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  )
}

