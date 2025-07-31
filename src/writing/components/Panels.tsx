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
  },
  characters: {
    title: '人物管理',
    description: '管理您故事中的人物角色',
    items: [
      { title: '张三', description: '主角 • 25岁 • 程序员' },
      { title: '李四', description: '配角 • 30岁 • 经理' }
    ],
    addButtonText: '+ 添加新人物'
  },
  outline: {
    title: '大纲管理',
    description: '规划您的故事大纲和情节结构',
    items: [
      { title: '起：引入主角', description: '介绍背景，建立人物关系' },
      { title: '承：矛盾升级', description: '冲突加剧，推动情节发展' },
      { title: '转：高潮部分', description: '故事转折点，关键情节' }
    ],
    addButtonText: '+ 添加大纲节点'
  },
  settings: {
    title: '世界设定',
    description: '建立您故事的世界观和设定',
    items: [
      { title: '时代背景', description: '现代都市，2024年' },
      { title: '地理环境', description: '某个繁华的大都市' },
      { title: '特殊规则', description: '科技发达，AI普及' }
    ],
    addButtonText: '+ 添加设定项'
  }
}

// 导出具体面板组件
export const ChaptersPanel = () => <GenericPanel config={panelConfigs.chapters} />
export const CharactersPanel = () => <GenericPanel config={panelConfigs.characters} />
export const OutlinePanel = () => <GenericPanel config={panelConfigs.outline} />
export const SettingsDataPanel = () => <GenericPanel config={panelConfigs.settings} />

// 重新导出文件树面板
export { FileTreePanel } from './FileTreePanel'