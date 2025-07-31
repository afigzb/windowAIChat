// 文件树面板组件

import { FileTreeNode } from './FileTreeNode'
import { InlineEdit } from './InlineEdit'
import { ContextMenu, type MenuItem } from './ContextMenu'
import { useFileTree } from './useFileTree'
import type { FileSystemNode } from '../../storage/file-system'

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

  // 生成右键菜单项
  const getMenuItems = (node: FileSystemNode): MenuItem[] => {
    const items: MenuItem[] = []
    
    if (node.isDirectory) {
      items.push(
        { label: '新建文件', icon: '📝', onClick: () => handleCreateFile(node.path) },
        { label: '新建文件夹', icon: '📁', onClick: () => handleCreateDirectory(node.path) }
      )
    }
    
    if (node.id !== 'root') {
      if (items.length > 0) items.push({ divider: true } as MenuItem)
      items.push(
        { label: '重命名', icon: '✏️', onClick: () => handleRename(node) },
        { label: '删除', icon: '🗑️', onClick: () => handleDelete(node), variant: 'danger' }
      )
    }
    
    return items
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
          // 如果点击的不是文件节点，则在空白区域显示根目录菜单
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
      <ContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        items={contextMenu.node ? getMenuItems(contextMenu.node) : []}
        onClose={handleCloseContextMenu}
      />
    </div>
  )
}