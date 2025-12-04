import { OperationBar } from './OperationBar'

/**
 * 预览区域组件
 */
export function PreviewArea() {
  return (
    <div className="h-full bg-white rounded-lg shadow-sm flex flex-col">
      {/* 预览内容区域 */}
      <div className="flex-1 p-6 flex items-center justify-center overflow-auto">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">预览区域</p>
          <p className="text-sm mt-2">中间预览区域</p>
        </div>
      </div>
      
      {/* 操作区域 */}
      <div className="border-t border-gray-200">
        <OperationBar />
      </div>
    </div>
  )
}

