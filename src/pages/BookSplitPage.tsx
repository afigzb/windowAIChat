import type { AIConfig } from '../chat'
import { InputArea, PreviewArea, OutputArea } from '../BookSplit'

interface BookSplitPageProps {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
}

/**
 * 拆书页面
 */
export function BookSplitPage({ config, onConfigChange }: BookSplitPageProps) {
  return (
    <div className="h-full flex flex-col bg-gray-50 p-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h1 className="text-xl font-semibold text-gray-900">
          拆书
        </h1>
      </div>

      {/* 主内容区域：左中右三栏布局 */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* 左侧：输入区域 */}
        <div className="col-span-3 h-full">
          <InputArea />
        </div>

        {/* 中间：预览区域（包含底部操作区） */}
        <div className="col-span-6 h-full">
          <PreviewArea />
        </div>

        {/* 右侧：输出区域 */}
        <div className="col-span-3 h-full">
          <OutputArea />
        </div>
      </div>
    </div>
  )
}

