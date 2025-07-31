// 文件树面板组件

import { useEffect } from 'react'
import { FileTreeNode } from './FileTreeNode'
import { InlineEdit } from './InlineEdit'
import { useFileTree } from './useFileTree'
import type { FileSystemNode } from '../../storage/file-system'

// 右键菜单项类型
interface MenuAction {
  label: string
  icon: string
  onClick: () => void
  variant?: 'normal' | 'danger'
}

export function FileTreePanel() {
  const {
    workspace,
    fileTree,
    isLoading,
    contextMenu,
    inlineEdit,
    handleSelectWorkspace,
    handleFileClick,
    handleCreateFile,
    handleCreateDirectory,
    handleRename,
    handleDelete,
    handleContextMenu,
    handleCloseContextMenu,
    handleInlineEditConfirm,
    handleInlineEditCancel
  } = useFileTree()

  // 监听全局点击事件，关闭右键菜单
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu.isOpen) {
        handleCloseContextMenu()
      }
    }

    if (contextMenu.isOpen) {
      document.addEventListener('click', handleGlobalClick)
      return () => document.removeEventListener('click', handleGlobalClick)
    }
  }, [contextMenu.isOpen, handleCloseContextMenu])

  // 生成右键菜单项
  const getMenuActions = (node: FileSystemNode): MenuAction[] => {
    const actions: MenuAction[] = []
    
    if (node.isDirectory) {
      actions.push(
        {
          label: '新建文件',
          icon: '📝',
          onClick: () => handleCreateFile(node.path)
        },
        {
          label: '新建文件夹',
          icon: '📁',
          onClick: () => handleCreateDirectory(node.path)
        }
      )
    }
    
    if (node.id !== 'root') {
      actions.push(
        {
          label: '重命名',
          icon: '✏️',
          onClick: () => handleRename(node)
        },
        {
          label: '删除',
          icon: '🗑️',
          onClick: () => handleDelete(node),
          variant: 'danger'
        }
      )
    }
    
    return actions
  }

  if (!workspace) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-700">
          <p className="mb-3">选择项目工作目录开始使用文件管理功能</p>
        </div>
        <button
          onClick={handleSelectWorkspace}
          disabled={isLoading}
          className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? '正在加载...' : '📁 选择工作目录'}
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* 工作区信息 */}
      <div className="text-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-slate-900">📁 {workspace.name}</span>
          <button
            onClick={handleSelectWorkspace}
            className="text-xs text-slate-500 hover:text-indigo-600"
            title="更换工作目录"
          >
            更换
          </button>
        </div>
        <div className="text-xs text-slate-600 truncate" title={workspace.rootPath}>
          {workspace.rootPath}
        </div>
      </div>

      {/* 文件树 */}
      <div 
        className="border border-gray-300 rounded overflow-y-auto flex-1"
        style={{ minHeight: '400px' }}
        onContextMenu={(e) => {
          const target = e.target as HTMLElement
          if (!target.closest('[data-file-node]')) {
            handleContextMenu(e)
          }
        }}
      >
        <div className="p-1 min-h-full">
          {fileTree.map((node) => (
            <FileTreeNode
              key={node.id}
              node={node}
              onFileClick={handleFileClick}
              onCreateFile={handleCreateFile}
              onCreateDirectory={handleCreateDirectory}
              onContextMenu={handleContextMenu}
              inlineEdit={inlineEdit}
              onInlineEditConfirm={handleInlineEditConfirm}
              onInlineEditCancel={handleInlineEditCancel}
            />
          ))}
          {inlineEdit.isActive && inlineEdit.mode === 'create' && inlineEdit.parentPath === (workspace?.rootPath || '') && (
            <InlineEdit
              type={inlineEdit.type}
              level={0}
              defaultValue={inlineEdit.defaultValue}
              onConfirm={handleInlineEditConfirm}
              onCancel={handleInlineEditCancel}
            />
          )}
          {fileTree.length === 0 && (
            <div className="p-2 text-center text-gray-500 text-sm">
              空文件夹 - 右键可新建文件或文件夹
            </div>
          )}
        </div>
      </div>

      {/* 右键菜单 */}
      {contextMenu.isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={handleCloseContextMenu}
          />
          <div 
            className="fixed bg-white rounded border border-gray-300 py-1 z-50 min-w-28 shadow"
            style={{ 
              left: contextMenu.x, 
              top: contextMenu.y,
              transform: 'translate(-50%, 0)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.node && getMenuActions(contextMenu.node).map((action, index, array) => (
              <div key={action.label}>
                {index === 2 && array.length > 2 && (
                  <div className="border-t border-gray-200 my-1" />
                )}
                <button
                  onClick={action.onClick}
                  className={`w-full text-left px-2 py-1 text-sm ${
                    action.variant === 'danger' 
                      ? 'text-red-600 hover:bg-red-50' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {action.icon} {action.label}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}