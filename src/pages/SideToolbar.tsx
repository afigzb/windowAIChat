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
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
              <path d="M917.7 148.8l-42.4-42.4c-1.6-1.6-3.6-2.3-5.7-2.3s-4.1.8-5.7 2.3l-76.1 76.1a199.27 199.27 0 0 0-112.1-34.3c-51.2 0-102.4 19.5-141.5 58.6L432.3 308.7a8.03 8.03 0 0 0 0 11.3L704 591.7c1.6 1.6 3.6 2.3 5.7 2.3 2 0 4.1-.8 5.7-2.3l101.9-101.9c68.9-69 77-175.7 24.3-253.5l76.1-76.1c3.1-3.2 3.1-8.3 0-11.4zM769.1 441.7l-59.4 59.4-186.8-186.8 59.4-59.4c24.9-24.9 58.1-38.7 93.4-38.7 35.3 0 68.4 13.7 93.4 38.7 24.9 24.9 38.7 58.1 38.7 93.4 0 35.3-13.8 68.4-38.7 93.4zm-190.2 105a8.03 8.03 0 0 0-11.3 0L501 613.3 410.7 523l66.7-66.7c3.1-3.1 3.1-8.2 0-11.3L441 408.6a8.03 8.03 0 0 0-11.3 0L363 475.3l-43-43a7.85 7.85 0 0 0-5.7-2.3c-2 0-4.1.8-5.7 2.3L206.8 534.2c-68.9 69-77 175.7-24.3 253.5l-76.1 76.1a8.03 8.03 0 0 0 0 11.3l42.4 42.4c1.6 1.6 3.6 2.3 5.7 2.3s4.1-.8 5.7-2.3l76.1-76.1c33.7 22.9 72.9 34.3 112.1 34.3 51.2 0 102.4-19.5 141.5-58.6l101.9-101.9c3.1-3.1 3.1-8.2 0-11.3l-43-43 66.7-66.7c3.1-3.1 3.1-8.2 0-11.3l-36.6-36.2zM441.7 769.1a131.32 131.32 0 0 1-93.4 38.7c-35.3 0-68.4-13.7-93.4-38.7a131.32 131.32 0 0 1-38.7-93.4c0-35.3 13.7-68.4 38.7-93.4l59.4-59.4 186.8 186.8-59.4 59.4z"/>
            </svg>
          )},
          { key: 'prompt', label: '提示词', icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 8H16V16H8V8Z" stroke="currentColor" strokeWidth={1.5}/>
              <path d="M16 16.001L19 16.0005C20.6569 16.0002 22.0002 17.3432 22.0005 19C22.0007 20.6569 20.6578 22.0002 19.0009 22.0005C17.3441 22.0007 16.0007 20.6578 16.0005 19.001L16 16.001Z" stroke="currentColor" strokeWidth={1.5}/>
              <path d="M8.00096 16.001L5.00096 16.0005C3.34411 16.0002 2.00075 17.3432 2.00049 19C2.00023 20.6569 3.34316 22.0002 5.00002 22.0005C6.65687 22.0007 8.00023 20.6578 8.00049 19.001L8.00096 16.001Z" stroke="currentColor" strokeWidth={1.5}/>
              <path d="M16 8.00002L19 8.00049C20.6569 8.00075 22.0002 6.65781 22.0005 5.00096C22.0007 3.34411 20.6578 2.00075 19.0009 2.00049C17.3441 2.00023 16.0007 3.34316 16.0005 5.00002L16 8.00002Z" stroke="currentColor" strokeWidth={1.5}/>
              <path d="M8.00096 8.00002L5.00096 8.00049C3.34411 8.00075 2.00075 6.65781 2.00049 5.00096C2.00023 3.34411 3.34316 2.00075 5.00002 2.00049C6.65687 2.00023 8.00023 3.34316 8.00049 5.00002L8.00096 8.00002Z" stroke="currentColor" strokeWidth={1.5}/>
            </svg>
          )},
        ] as const).map(item => {
          const isActive = item.key === 'prompt' ? isPromptWindowOpen : activeTool === (item.key as SideToolbarProps['activeTool'])
          const activeClass = item.key === 'prompt' && isPromptWindowOpen
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
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>

        <button
          onClick={() => onSelectTool('settings')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTool === 'settings' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
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


