// 功能模块面板组件

interface PanelItem {
  title: string
  description: string
}

interface PanelConfig {
  title: string
  description: string
  items: PanelItem[]
  addButtonText: string
}

// 通用面板组件
function GenericPanel({ config }: { config: PanelConfig }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-700">
        <p className="mb-3">{config.description}</p>
      </div>
      <div className="space-y-2">
        {config.items.map((item, index) => (
          <div 
            key={index}
            className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <div className="font-medium text-slate-900">{item.title}</div>
            <div className="text-sm text-slate-600 mt-1">{item.description}</div>
          </div>
        ))}
        <button className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
          {config.addButtonText}
        </button>
      </div>
    </div>
  )
}

// 面板配置数据
const panelConfigs: Record<string, PanelConfig> = {
  chapters: {
    title: '章节管理',
    description: '在这里管理您的小说章节结构',
    items: [
      { title: '第一章 开端', description: '字数: 2,500' },
      { title: '第二章 冲突', description: '字数: 3,200' }
    ],
    addButtonText: '+ 添加新章节'
  }
}

// 导出具体面板组件
export const ChaptersPanel = () => <GenericPanel config={panelConfigs.chapters} />

// 重新导出文件树面板
export { FileTreePanel } from './FileTreePanel'