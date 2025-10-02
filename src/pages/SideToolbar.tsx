interface SideToolbarProps {
  activeTool: 'workspace' | 'api' | 'docs' | 'settings' | 'prompt'
  isPromptWindowOpen: boolean
  onSelectTool: (tool: 'workspace' | 'api' | 'docs' | 'settings' | 'prompt') => void
  onOpenPromptWindow: () => void
}

export function SideToolbar({ activeTool, isPromptWindowOpen, onSelectTool, onOpenPromptWindow }: SideToolbarProps) {
  return (
    <div className="w-14 bg-white border-r border-slate-300 flex flex-col items-center py-3">
      <div className="flex flex-col items-center gap-2">
        {([
          { key: 'workspace', label: '工作区', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          )},
          { key: 'api', label: 'API', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          )},
          { key: 'prompt', label: '提示词', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          )},
        ] as const).map(item => {
          const isActive = item.key === 'prompt' ? isPromptWindowOpen : activeTool === (item.key as SideToolbarProps['activeTool'])
          const activeClass = item.key === 'prompt' && isPromptWindowOpen
            ? 'bg-emerald-600 text-white shadow-sm'
            : isActive
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-50'

          return (
            <button
              key={item.key}
              onClick={() => {
                if (item.key === 'prompt') {
                  onOpenPromptWindow()
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
            activeTool === 'docs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
          title="说明文档"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>

        <button
          onClick={() => onSelectTool('settings')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTool === 'settings' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
          title="设置"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
  )
}


