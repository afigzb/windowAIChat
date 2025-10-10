import { useState, useEffect } from 'react'
import { promptCardManager } from './prompt-manager'
import type { PromptCard, PromptCardPlacement } from './types'
import { ConfirmDialog } from '../components/ConfirmDialog'

/**
 * 提示词模板页面
 */
export function PromptTemplatePage() {
  const [cards, setCards] = useState<PromptCard[]>([])
  const [editingCard, setEditingCard] = useState<PromptCard | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string; isOpen: boolean }>({
    id: '',
    title: '',
    isOpen: false
  })

  // 加载卡片
  const loadCards = () => {
    setCards(promptCardManager.getAllCards())
  }

  useEffect(() => {
    loadCards()

    // 监听其他窗口的数据更新
    const handleCardsChanged = () => {
      console.log('[PromptTemplatePage] 收到数据更新通知，刷新UI')
      loadCards()
    }

    // 注册监听器
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onPromptCardsChanged) {
      (window as any).electronAPI.onPromptCardsChanged(handleCardsChanged)
    }

    // 清理函数（如果需要的话，Electron IPC 通常不需要手动清理）
  }, [])

  // 创建新卡片
  const handleCreate = () => {
    setIsCreating(true)
    setEditingCard({
      id: '',
      title: '',
      content: '',
      placement: 'system',
      enabled: true,
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  }

  // 保存卡片
  const handleSave = () => {
    if (!editingCard) return

    if (isCreating) {
      promptCardManager.createCard({
        title: editingCard.title,
        content: editingCard.content,
        placement: editingCard.placement,
        enabled: editingCard.enabled
      })
    } else {
      promptCardManager.updateCard(editingCard.id, {
        title: editingCard.title,
        content: editingCard.content,
        placement: editingCard.placement,
        enabled: editingCard.enabled
      })
    }

    setEditingCard(null)
    setIsCreating(false)
    loadCards()
  }

  // 取消编辑
  const handleCancel = () => {
    setEditingCard(null)
    setIsCreating(false)
  }

  // 编辑卡片
  const handleEdit = (card: PromptCard) => {
    setEditingCard({ ...card })
    setIsCreating(false)
  }

  // 删除卡片 - 显示确认对话框
  const handleDeleteClick = (card: PromptCard) => {
    setDeleteConfirm({ id: card.id, title: card.title, isOpen: true })
  }

  // 确认删除
  const handleConfirmDelete = () => {
    if (deleteConfirm.id) {
      promptCardManager.deleteCard(deleteConfirm.id)
      loadCards()
    }
    setDeleteConfirm({ id: '', title: '', isOpen: false })
  }

  // 取消删除
  const handleCancelDelete = () => {
    setDeleteConfirm({ id: '', title: '', isOpen: false })
  }

  // 切换启用状态
  const handleToggle = (id: string) => {
    promptCardManager.toggleCard(id)
    loadCards()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">提示词管理</h1>
              <p className="text-gray-600 text-sm">创建和管理AI提示词卡片，多卡片可叠加生效</p>
            </div>
            <button
              onClick={handleCreate}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              新建卡片
            </button>
          </div>
        </div>

        {/* 卡片列表 */}
        {cards.length === 0 && !editingCard ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-gray-500">还没有提示词卡片，点击上方按钮创建一个</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <PromptCardItem
                key={card.id}
                card={card}
                onEdit={() => handleEdit(card)}
                onDelete={() => handleDeleteClick(card)}
                onToggle={() => handleToggle(card.id)}
              />
            ))}
          </div>
        )}

        {/* 编辑对话框 */}
        {editingCard && (
          <PromptCardEditor
            card={editingCard}
            isCreating={isCreating}
            onChange={setEditingCard}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}

        {/* 删除确认对话框 */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="删除提示词卡片"
          message={`确定要删除卡片"${deleteConfirm.title}"吗？删除后将无法恢复。`}
          confirmText="确定删除"
          cancelText="取消"
          type="danger"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      </div>
    </div>
  )
}

// 卡片项组件
interface PromptCardItemProps {
  card: PromptCard
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}

function PromptCardItem({ card, onEdit, onDelete, onToggle }: PromptCardItemProps) {
  const placementLabels: Record<PromptCardPlacement, string> = {
    system: 'System',
    after_system: 'System后',
    user_end: 'User末尾'
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${!card.enabled ? 'opacity-50' : ''}`}>
      {/* 头部：标题和操作 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={onToggle}
            className={`flex-shrink-0 w-9 h-5 rounded-full transition-colors ${
              card.enabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                card.enabled ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
              }`}
            />
          </button>
          <h3 className="font-medium text-gray-900 truncate">{card.title}</h3>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="编辑"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="删除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 内容 */}
      <p className="text-sm text-gray-600 whitespace-pre-wrap break-words line-clamp-3 mb-3">{card.content}</p>

      {/* 底部标签 */}
      <div className="flex items-center">
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
          {placementLabels[card.placement]}
        </span>
      </div>
    </div>
  )
}

// 卡片编辑器组件
interface PromptCardEditorProps {
  card: PromptCard
  isCreating: boolean
  onChange: (card: PromptCard) => void
  onSave: () => void
  onCancel: () => void
}

function PromptCardEditor({ card, isCreating, onChange, onSave, onCancel }: PromptCardEditorProps) {
  const placements: Array<{ value: PromptCardPlacement; label: string; desc: string }> = [
    { value: 'system', label: 'System消息', desc: '追加到现有system消息中' },
    { value: 'after_system', label: 'System后', desc: '在所有system消息之后独立插入' },
    { value: 'user_end', label: 'User消息末尾', desc: '追加到最后一条user消息末尾' }
  ]

  const canSave = card.title.trim() && card.content.trim()

  return (
    <div 
      className="fixed inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-[9999] p-4"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto border border-gray-200">
        {/* 头部 */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {isCreating ? '创建新卡片' : '编辑卡片'}
          </h2>
        </div>

        {/* 表单 */}
        <div className="p-6 space-y-5">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              卡片标题
            </label>
            <input
              type="text"
              value={card.title}
              onChange={e => onChange({ ...card, title: e.target.value })}
              placeholder="例如：角色设定"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              autoFocus
            />
          </div>

          {/* 内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              提示词内容
            </label>
            <textarea
              value={card.content}
              onChange={e => onChange({ ...card, content: e.target.value })}
              placeholder="输入提示词内容..."
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm leading-relaxed"
            />
          </div>

          {/* 插入位置 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              插入位置
            </label>
            <div className="space-y-2">
              {placements.map(option => (
                <label
                  key={option.value}
                  className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    card.placement === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    value={option.value}
                    checked={card.placement === option.value}
                    onChange={e => onChange({ ...card, placement: e.target.value as PromptCardPlacement })}
                    className="mt-0.5 mr-3 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{option.label}</div>
                    <div className="text-xs text-gray-600">{option.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 启用开关 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={card.enabled}
              onChange={e => onChange({ ...card, enabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700">
              创建后立即启用
            </label>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
