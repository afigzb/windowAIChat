import { Icon } from '../components'

interface SideToolbarProps {
  activeTool: 'workspace' | 'api' | 'docs' | 'settings' | 'prompt' | 'agents'
  isPromptWindowOpen: boolean
  isTextEditorWindowOpen: boolean
  onSelectTool: (tool: 'workspace' | 'api' | 'docs' | 'settings' | 'prompt' | 'agents') => void
  onOpenPromptWindow: () => void
  onOpenTextEditorWindow: () => void
}

export function SideToolbar({ activeTool, isPromptWindowOpen, isTextEditorWindowOpen, onSelectTool, onOpenPromptWindow, onOpenTextEditorWindow }: SideToolbarProps) {
  return (
    <div className="w-14 bg-white border-r border-slate-300 flex flex-col items-center py-3">
      <div className="flex flex-col items-center gap-2">
        {([
          { key: 'workspace', label: '工作区', icon: <Icon name="workspace" className="w-5 h-5" /> },
          { key: 'api', label: 'API', icon: <Icon name="api" className="w-5 h-5" /> },
          { key: 'agents', label: 'Agents', icon: <Icon name="agents" className="w-5 h-5" /> },
          { key: 'prompt', label: '提示词', icon: <Icon name="prompt" className="w-5 h-5" /> },
          { key: 'text-editor', label: '空白文本', icon: <Icon name="textEditor" className="w-5 h-5" /> },
        ] as const).map(item => {
          const isActive = item.key === 'prompt' 
            ? isPromptWindowOpen 
            : item.key === 'text-editor'
            ? isTextEditorWindowOpen
            : activeTool === (item.key as SideToolbarProps['activeTool'])
          
          const activeClass = (item.key === 'prompt' && isPromptWindowOpen) || (item.key === 'text-editor' && isTextEditorWindowOpen)
            ? 'bg-emerald-600 text-white shadow-sm'
            : isActive
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-200'

          return (
            <button
              key={item.key}
              onClick={() => {
                if (item.key === 'prompt') {
                  onOpenPromptWindow()
                } else if (item.key === 'text-editor') {
                  onOpenTextEditorWindow()
                } else {
                  onSelectTool(item.key as SideToolbarProps['activeTool'])
                }
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeClass}`}
              title={item.label}
            >
              {item.icon}
            </button>
          )
        })}
      </div>

      <div className="flex-1"></div>

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => onSelectTool('docs')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTool === 'docs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
          }`}
          title="说明文档"
        >
          <Icon name="docs" className="w-5 h-5" />
        </button>

        <button
          onClick={() => onSelectTool('settings')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTool === 'settings' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
          }`}
          title="设置"
        >
          <Icon name="settings" className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}


