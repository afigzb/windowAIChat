// 写作区域组件

export function WritingArea() {
  return (
    <div className="h-full">
      <textarea 
        className="w-full h-full p-4 border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-slate-300"
        placeholder="在这里开始您的创作..."
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.6' }}
      />
    </div>
  )
}