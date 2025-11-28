// 文件树节点组件

import { useState, useEffect } from 'react'
import { InlineEdit } from './InlineEdit'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'
import { Icon } from '../../components'
import type { FileSystemNode } from '../../storage/file-system'
import { fileSystemManager } from '../../storage/file-system'
import { getParentDir } from '../utils/pathHelper'
import { extractDraggedPaths, setDragData, batchMoveFiles, handleExternalFilesDrop } from '../utils/dragDropHelper'

interface InlineEditState {
  isActive: boolean
  mode: 'create' | 'rename'
  type: 'file' | 'directory'
  parentPath: string
  defaultValue?: string
  selectStart?: number
  selectEnd?: number
}

interface FileTreeNodeProps {
  node: FileSystemNode
  level?: number
  selectedFile?: string | null
  focusedFiles?: Set<string>
  onFileClick?: (node: FileSystemNode, e?: React.MouseEvent) => void
  onContextMenu?: (e: React.MouseEvent, node: FileSystemNode) => void
  inlineEdit?: InlineEditState
  onInlineEditConfirm?: (name: string) => void
  onInlineEditCancel?: () => void
  // 新增：文件选择相关
  selectedFiles?: string[]
  onFileSelect?: (filePath: string, selected: boolean) => void
  loadingFiles?: Set<string>
  // 新增：路径更新回调
  onUpdateFocusedFilesPaths?: (pathMappings: Array<{ oldPath: string; newPath: string }>) => void
}

function FileIcon({ node }: { node: FileSystemNode }) {
  if (node.isDirectory) {
    return <Icon name="folder" className="w-5 h-5 text-blue-600 flex-shrink-0" />
  }
  return <Icon name="file" className="w-5 h-5 text-gray-600 flex-shrink-0" />
}

export function FileTreeNode({ 
  node, 
  level = 0, 
  selectedFile,
  focusedFiles,
  onFileClick,
  onContextMenu,
  inlineEdit,
  onInlineEditConfirm,
  onInlineEditCancel,
  selectedFiles,
  onFileSelect,
  loadingFiles,
  onUpdateFocusedFilesPaths
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(() => 
    node.isDirectory ? fileSystemManager.isFolderExpanded(node.path, level) : false
  )
  const [isDragOver, setIsDragOver] = useState(false)
  const { confirm, confirmProps } = useConfirm()

  // 当节点路径变化时，更新展开状态
  useEffect(() => {
    if (node.isDirectory) {
      setIsExpanded(fileSystemManager.isFolderExpanded(node.path, level))
    }
  }, [node.path, node.isDirectory, level])

  const handleClick = (e: React.MouseEvent) => {
    if (node.isDirectory) {
      // 如果按住了 Ctrl/Meta 或 Shift，不展开/收起，而是作为选中处理
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        onFileClick?.(node, e)
        return
      }

      // 普通点击目录：只展开/收起，不改变选中状态
      const newExpanded = !isExpanded
      setIsExpanded(newExpanded)
      // 更新文件系统管理器中的展开状态
      fileSystemManager.setFolderExpanded(node.path, newExpanded)
    } else {
      // 文件的点击总是触发选中
      onFileClick?.(node, e)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu?.(e, node)
  }

  const isRenaming = inlineEdit?.isActive && 
                    inlineEdit.mode === 'rename' && 
                    inlineEdit.parentPath === node.path
  
  const isSelected = (focusedFiles?.has(node.path)) || (selectedFile === node.path)
  const isFileSelected = selectedFiles?.includes(node.path) || false
  const isLoading = loadingFiles?.has(node.path) || false

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation() // 防止触发文件点击
    onFileSelect?.(node.path, e.target.checked)
  }

  // 原生拖拽处理
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    try {
      e.stopPropagation()
      e.dataTransfer.effectAllowed = 'move'
      
      // 如果当前节点是被选中的，检查是否有其他选中节点
      if (focusedFiles?.has(node.path) && focusedFiles.size > 1) {
        const files = Array.from(focusedFiles)
        setDragData(e.dataTransfer, files)
      } else {
        setDragData(e.dataTransfer, node.path, node.isDirectory)
      }
    } catch {}
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // 允许拖放到任何节点（目录或文件）
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    // 确定目标目录
    const targetDirPath = node.isDirectory ? node.path : getParentDir(node.path)

    // 检查是否是外部文件拖入（从桌面或其他应用）
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      console.log('📁 检测到外部文件拖入')
      try {
        const result = await handleExternalFilesDrop(e.dataTransfer.files, targetDirPath)
        if (result.failed > 0) {
          await confirm({
            title: '部分文件复制失败',
            message: `成功: ${result.success}, 失败: ${result.failed}\n\n${result.errors.map(e => e.message).join('\n')}`,
            confirmText: '确定',
            type: 'danger'
          })
        } else {
          console.log(`✅ 成功复制 ${result.success} 个文件`)
        }
      } catch (err) {
        console.error('❌ 复制文件失败:', err)
        await confirm({
          title: '复制失败',
          message: `无法复制文件或文件夹：${err}`,
          confirmText: '确定',
          type: 'danger'
        })
      }
      return
    }

    // 处理内部文件拖动 - 移动文件
    const draggedData = extractDraggedPaths(e.dataTransfer)
    
    if (draggedData.type === 'none') {
      console.log('⚠️ 没有找到源路径')
      return
    }

    // 排除自身
    const pathsToMove = draggedData.paths.filter(p => p !== node.path && p !== targetDirPath)
    
    if (pathsToMove.length === 0) {
      return
    }

    try {
      const result = await batchMoveFiles(pathsToMove, targetDirPath)
      
      // 更新选中文件的路径
      if (result.pathMappings.length > 0 && onUpdateFocusedFilesPaths) {
        onUpdateFocusedFilesPaths(result.pathMappings)
      }
      
      if (result.failed > 0) {
        await confirm({
          title: '部分文件移动失败',
          message: `成功: ${result.success}, 失败: ${result.failed}`,
          confirmText: '确定',
          type: 'danger'
        })
      } else {
        console.log(`✅ 成功移动 ${result.success} 个文件`)
      }
    } catch (err) {
      console.error('❌ 移动失败:', err)
      await confirm({
        title: '移动失败',
        message: `无法移动文件或文件夹：${err}`,
        confirmText: '确定',
        type: 'danger'
      })
    }
  }

  // 移除重命名时的提前返回，改为在下方渲染

  return (
    <>
      <ConfirmDialog {...confirmProps} />
      <div>
        {isRenaming ? (
          <InlineEdit
            type={inlineEdit.type}
            level={level}
            defaultValue={inlineEdit.defaultValue}
            selectStart={inlineEdit.selectStart}
            selectEnd={inlineEdit.selectEnd}
            onConfirm={onInlineEditConfirm!}
            onCancel={onInlineEditCancel!}
          />
        ) : (
          <div 
            data-file-node
            className={`group flex items-center gap-2 py-2 px-3 cursor-pointer transition-all duration-100 ${
              isSelected 
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50  ' 
                : `${isDragOver ? 'bg-blue-50/70 ring-2 ring-blue-300' : 'hover:bg-gray-50'}`
            }`}
            style={{ marginLeft: level * 20 }}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {node.isDirectory && (
              <div className={`transition-transform duration-300 ${isExpanded ? '' : '-rotate-90'}`}>
                <Icon name="chevronDown" className="w-4 h-4 text-gray-500" />
              </div>
            )}
            {!node.isDirectory && (
              <div className="relative group/checkbox flex items-center">
                <input
                  type="checkbox"
                  checked={isFileSelected}
                  onChange={handleCheckboxChange}
                  onClick={(e) => e.stopPropagation()} // 防止触发父元素的点击事件
                  disabled={isLoading}
                  className={`w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-400 focus:ring-2 focus:ring-offset-1 transition-all duration-200 ${isLoading ? 'opacity-50' : 'hover:border-blue-400 hover:shadow-sm'} ${isFileSelected ? 'scale-110 border-blue-500' : ''}`}
                  title={isLoading ? '文件内容加载中...' : '选择此文件用于AI对话'}
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {/* 选中状态指示器 */}
                {isFileSelected && !isLoading && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileIcon node={node} />
              <span className="text-sm font-medium truncate">{node.name}</span>
            </div>
          </div>
        )}
      
      {node.isDirectory && isExpanded && (
        <div>
          {node.children?.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedFile={selectedFile}
              focusedFiles={focusedFiles}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
              inlineEdit={inlineEdit}
              onInlineEditConfirm={onInlineEditConfirm}
              onInlineEditCancel={onInlineEditCancel}
              selectedFiles={selectedFiles}
              onFileSelect={onFileSelect}
              loadingFiles={loadingFiles}
              onUpdateFocusedFilesPaths={onUpdateFocusedFilesPaths}
            />
          ))}
          {inlineEdit?.isActive && 
           inlineEdit.mode === 'create' && 
           inlineEdit.parentPath === node.path && (
            <InlineEdit
              type={inlineEdit.type}
              level={level + 1}
              defaultValue={inlineEdit.defaultValue}
              selectStart={inlineEdit.selectStart}
              selectEnd={inlineEdit.selectEnd}
              onConfirm={onInlineEditConfirm!}
              onCancel={onInlineEditCancel!}
            />
          )}
        </div>
      )}
      </div>
    </>
  )
}