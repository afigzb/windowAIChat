import { useState, useCallback } from 'react'
import type { CorpusItem, CorpusType, CorpusConfig } from '../data/types'
import {
  createCorpusItem,
  updateCorpusItem,
  deleteCorpusItem,
  validateCorpusName,
  validateCorpusContent,
  exportCorpusConfig
} from '../data/corpus-utils'

interface CorpusManagerProps {
  config: CorpusConfig
  onConfigChange: (config: CorpusConfig) => void
  onClose: () => void
}

interface EditingCorpus {
  id?: string
  name: string
  content: string
  type: CorpusType
}

export function CorpusManager({ config, onConfigChange, onClose }: CorpusManagerProps) {
  const [activeTab, setActiveTab] = useState<CorpusType>('initial')
  const [editingCorpus, setEditingCorpus] = useState<EditingCorpus | null>(null)
  const [error, setError] = useState<string>('')
  const [showMobileEdit, setShowMobileEdit] = useState(false) // 移动端编辑状态

  const currentCorpus = activeTab === 'initial' ? config.initialCorpus : config.emphasisCorpus

  // 获取已存在的名称列表
  const existingNames = currentCorpus
    .filter(item => item.id !== editingCorpus?.id)
    .map(item => item.name)

  // 开始编辑语料
  const startEdit = useCallback((corpus?: CorpusItem) => {
    if (corpus) {
      setEditingCorpus({
        id: corpus.id,
        name: corpus.name,
        content: corpus.content,
        type: corpus.type
      })
    } else {
      setEditingCorpus({
        name: '',
        content: '',
        type: activeTab
      })
    }
    setError('')
    setShowMobileEdit(true) // 移动端显示编辑界面
  }, [activeTab])

  // 取消编辑
  const cancelEdit = useCallback(() => {
    setEditingCorpus(null)
    setError('')
    setShowMobileEdit(false)
  }, [])

  // 保存语料
  const saveCorpus = useCallback(() => {
    if (!editingCorpus) return

    // 验证名称
    const nameValidation = validateCorpusName(editingCorpus.name, existingNames)
    if (!nameValidation.valid) {
      setError(nameValidation.error!)
      return
    }

    // 验证内容
    const contentValidation = validateCorpusContent(editingCorpus.content)
    if (!contentValidation.valid) {
      setError(contentValidation.error!)
      return
    }

    const newConfig = { ...config }
    const targetCorpus = activeTab === 'initial' ? newConfig.initialCorpus : newConfig.emphasisCorpus

    if (editingCorpus.id) {
      // 更新现有语料
      const updatedCorpus = updateCorpusItem(targetCorpus, editingCorpus.id, {
        name: editingCorpus.name,
        content: editingCorpus.content
      })
      if (activeTab === 'initial') {
        newConfig.initialCorpus = updatedCorpus
      } else {
        newConfig.emphasisCorpus = updatedCorpus
      }
    } else {
      // 创建新语料
      const newCorpusItem = createCorpusItem(
        editingCorpus.name,
        editingCorpus.type,
        editingCorpus.content
      )
      if (activeTab === 'initial') {
        newConfig.initialCorpus = [...newConfig.initialCorpus, newCorpusItem]
      } else {
        newConfig.emphasisCorpus = [...newConfig.emphasisCorpus, newCorpusItem]
      }
    }

    onConfigChange(newConfig)
    setEditingCorpus(null)
    setError('')
    setShowMobileEdit(false)
  }, [editingCorpus, config, onConfigChange, activeTab, existingNames])

  // 删除语料
  const deleteCorpus = useCallback((id: string) => {
    if (!confirm('确定要删除这个语料吗？')) return

    const newConfig = { ...config }
    if (activeTab === 'initial') {
      newConfig.initialCorpus = deleteCorpusItem(newConfig.initialCorpus, id)
    } else {
      newConfig.emphasisCorpus = deleteCorpusItem(newConfig.emphasisCorpus, id)
    }
    onConfigChange(newConfig)
  }, [config, onConfigChange, activeTab])

  // 切换语料启用状态
  const toggleCorpusEnabled = useCallback((id: string) => {
    const newConfig = { ...config }
    const targetCorpus = activeTab === 'initial' ? config.initialCorpus : config.emphasisCorpus
    const corpus = targetCorpus.find(item => item.id === id)
    
    if (corpus) {
      const updatedCorpus = updateCorpusItem(targetCorpus, id, { enabled: !corpus.enabled })
      if (activeTab === 'initial') {
        newConfig.initialCorpus = updatedCorpus
      } else {
        newConfig.emphasisCorpus = updatedCorpus
      }
      onConfigChange(newConfig)
    }
  }, [config, onConfigChange, activeTab])

  // 导出配置
  const handleExport = useCallback(() => {
    const exportData = exportCorpusConfig(config)
    navigator.clipboard.writeText(exportData).then(() => {
      alert('配置已复制到剪贴板！请手动粘贴到 src/chat/data/data.json 文件中的 corpus 字段')
    }).catch(() => {
      // 如果复制失败，创建一个临时文本区域
      const textarea = document.createElement('textarea')
      textarea.value = exportData
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      alert('配置已复制到剪贴板！请手动粘贴到 src/chat/data/data.json 文件中的 corpus 字段')
    })
  }, [config])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      {/* 响应式容器 */}
      <div className="bg-white rounded-lg shadow-lg w-full max-w-7xl h-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* 头部 - 响应式布局 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-0">语料管理</h2>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={handleExport}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-md transition-colors hover:bg-blue-700 font-medium"
            >
              导出配置
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gray-600 text-white rounded-md transition-colors hover:bg-gray-700 font-medium"
            >
              关闭
            </button>
          </div>
        </div>

        {/* 使用说明 - 响应式文字 */}
        <div className="px-3 sm:px-6 py-2 sm:py-3 bg-blue-50 border-b border-blue-100">
          <div className="text-xs sm:text-sm text-blue-800">
            <div className="font-medium mb-1">配置说明</div>
            <div className="hidden sm:block">
              语料配置从 <code className="bg-blue-100 px-1 rounded text-xs">data.json</code> 加载，修改后导出并粘贴到文件中，刷新页面生效
            </div>
            <div className="sm:hidden">
              配置从 data.json 加载，修改后需导出并粘贴到文件
            </div>
          </div>
        </div>

        {/* 主内容区 - 响应式布局 */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* 桌面端：左侧面板，移动端：全屏列表或编辑 */}
          <div className={`
            w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col bg-gray-50
            ${showMobileEdit ? 'hidden lg:flex' : 'flex'}
          `}>
            {/* 标签页 - 响应式 */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('initial')}
                className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'initial'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="hidden sm:inline">首发语料</span>
                <span className="sm:hidden">首发</span>
                <span className="ml-1">({config.initialCorpus.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('emphasis')}
                className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'emphasis'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="hidden sm:inline">强调语料</span>
                <span className="sm:hidden">强调</span>
                <span className="ml-1">({config.emphasisCorpus.length})</span>
              </button>
            </div>

            {/* 添加按钮 */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <button
                onClick={() => startEdit()}
                className="w-full py-2.5 px-4 bg-blue-600 text-white text-xs sm:text-sm rounded-md transition-colors hover:bg-blue-700 font-medium"
              >
                添加{activeTab === 'initial' ? '首发' : '强调'}语料
              </button>
            </div>

            {/* 语料列表 - 响应式卡片 */}
            <div className="flex-1 overflow-y-auto">
              {currentCorpus.length === 0 ? (
                <div className="p-4 sm:p-6 text-center text-gray-500 text-xs sm:text-sm">
                  暂无{activeTab === 'initial' ? '首发' : '强调'}语料
                </div>
              ) : (
                currentCorpus.map((corpus) => (
                  <div
                    key={corpus.id}
                    className={`p-3 sm:p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                      editingCorpus?.id === corpus.id ? 'bg-blue-50' : 'hover:bg-white'
                    }`}
                    onClick={() => startEdit(corpus)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={corpus.enabled}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleCorpusEnabled(corpus.id)
                          }}
                          className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:ring-2 flex-shrink-0"
                        />
                        <span className={`text-xs sm:text-sm font-medium truncate ${!corpus.enabled ? 'text-gray-400' : 'text-gray-900'}`}>
                          {corpus.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteCorpus(corpus.id)
                        }}
                        className="text-xs text-gray-400 hover:text-red-600 transition-colors ml-2 px-1 py-1 rounded hover:bg-red-50 flex-shrink-0"
                      >
                        删除
                      </button>
                    </div>
                    <div className={`text-xs ${!corpus.enabled ? 'text-gray-300' : 'text-gray-500'} leading-relaxed`}>
                      {corpus.content.length > (window.innerWidth < 640 ? 40 : 60) 
                        ? corpus.content.substring(0, window.innerWidth < 640 ? 40 : 60) + '...' 
                        : corpus.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 右侧编辑区域 - 响应式 */}
          <div className={`
            flex-1 flex flex-col
            ${showMobileEdit ? 'flex' : 'hidden lg:flex'}
          `}>
            {/* 移动端返回按钮 */}
            {showMobileEdit && (
              <div className="lg:hidden flex items-center px-3 py-2 bg-gray-50 border-b border-gray-200">
                <button
                  onClick={() => setShowMobileEdit(false)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm">返回列表</span>
                </button>
              </div>
            )}

            {editingCorpus ? (
              <div className="flex-1 flex flex-col p-3 sm:p-6">
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-3">
                    {editingCorpus.id ? '编辑' : '添加'}{activeTab === 'initial' ? '首发' : '强调'}语料
                  </h3>
                  
                  {activeTab === 'initial' && (
                    <div className="text-xs sm:text-sm text-gray-600 p-2 sm:p-3 bg-gray-50 border-l-4 border-blue-500 rounded-r">
                      首发语料会在每次新对话开始时自动发送给AI，用于设定角色、背景或特殊指令
                    </div>
                  )}
                  
                  {activeTab === 'emphasis' && (
                    <div className="text-xs sm:text-sm text-gray-600 p-2 sm:p-3 bg-gray-50 border-l-4 border-orange-500 rounded-r">
                      强调语料会在每次发送消息时夹带，在用户界面不可见，但AI可以看到
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 text-red-700 text-xs sm:text-sm rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                <div className="mb-4 sm:mb-6">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">语料名称</label>
                  <input
                    type="text"
                    value={editingCorpus.name}
                    onChange={(e) => setEditingCorpus({ ...editingCorpus, name: e.target.value })}
                    placeholder="给语料起个名字..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">语料内容</label>
                  <textarea
                    value={editingCorpus.content}
                    onChange={(e) => setEditingCorpus({ ...editingCorpus, content: e.target.value })}
                    placeholder={
                      activeTab === 'initial'
                        ? '输入首发语料内容，如角色设定、背景信息等...'
                        : '输入强调语料内容，每次对话都会包含...'
                    }
                    className="flex-1 min-h-[120px] sm:min-h-[200px] px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="text-xs text-gray-500 mt-1 sm:mt-2 text-right">
                    {editingCorpus.content.length} 字符
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
                  <button
                    onClick={saveCorpus}
                    disabled={!editingCorpus.name.trim() || !editingCorpus.content.trim()}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-md transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    保存
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-gray-200 text-gray-700 text-xs sm:text-sm rounded-md transition-colors hover:bg-gray-300 font-medium"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center text-gray-500">
                  <div className="text-sm sm:text-lg mb-2">选择左侧语料进行编辑</div>
                  <div className="text-xs sm:text-sm">或点击"添加语料"创建新的语料</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 