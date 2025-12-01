import type { AIConfig } from '../chat'

interface BookSplitPageProps {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
}

/**
 * 拆书页面
 */
export function BookSplitPage({ config, onConfigChange }: BookSplitPageProps) {
  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            拆书
          </h1>
          <p className="text-sm text-gray-600">
            拆书功能配置页面（开发中...）
          </p>
        </div>

        {/* 占位内容 */}
        <div className="bg-white rounded-lg shadow-sm p-6 min-h-[400px] flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg 
              className="w-16 h-16 mx-auto mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
              />
            </svg>
            <p className="text-lg font-medium">拆书功能即将上线</p>
            <p className="text-sm mt-2">敬请期待...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

