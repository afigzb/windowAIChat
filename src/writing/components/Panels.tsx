// 功能模块面板组件

export function ChaptersPanel() {
  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-700">
        <p className="mb-3">在这里管理您的小说章节结构</p>
      </div>
      <div className="space-y-2">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="font-medium text-slate-900">第一章 开端</div>
          <div className="text-sm text-slate-600 mt-1">字数: 2,500</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="font-medium text-slate-900">第二章 冲突</div>
          <div className="text-sm text-slate-600 mt-1">字数: 3,200</div>
        </div>
        <button className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
          + 添加新章节
        </button>
      </div>
    </div>
  )
}

export function CharactersPanel() {
  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-700">
        <p className="mb-3">管理您故事中的人物角色</p>
      </div>
      <div className="space-y-2">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="font-medium text-slate-900">张三</div>
          <div className="text-sm text-slate-600 mt-1">主角 • 25岁 • 程序员</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="font-medium text-slate-900">李四</div>
          <div className="text-sm text-slate-600 mt-1">配角 • 30岁 • 经理</div>
        </div>
        <button className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
          + 添加新人物
        </button>
      </div>
    </div>
  )
}

export function OutlinePanel() {
  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-700">
        <p className="mb-3">规划您的故事大纲和情节结构</p>
      </div>
      <div className="space-y-2">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="font-medium text-slate-900">起：引入主角</div>
          <div className="text-sm text-slate-600 mt-1">介绍背景，建立人物关系</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="font-medium text-slate-900">承：矛盾升级</div>
          <div className="text-sm text-slate-600 mt-1">冲突加剧，推动情节发展</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="font-medium text-slate-900">转：高潮部分</div>
          <div className="text-sm text-slate-600 mt-1">故事转折点，关键情节</div>
        </div>
        <button className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
          + 添加大纲节点
        </button>
      </div>
    </div>
  )
}

export function SettingsDataPanel() {
  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-700">
        <p className="mb-3">建立您故事的世界观和设定</p>
      </div>
      <div className="space-y-2">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="font-medium text-slate-900">时代背景</div>
          <div className="text-sm text-slate-600 mt-1">现代都市，2024年</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="font-medium text-slate-900">地理环境</div>
          <div className="text-sm text-slate-600 mt-1">某个繁华的大都市</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="font-medium text-slate-900">特殊规则</div>
          <div className="text-sm text-slate-600 mt-1">科技发达，AI普及</div>
        </div>
        <button className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
          + 添加设定项
        </button>
      </div>
    </div>
  )
}

// 重新导出文件树面板
export { FileTreePanel } from './FileTreePanel'