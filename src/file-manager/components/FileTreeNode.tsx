// 文件树节点组件

import { useState, useEffect } from 'react'
import { InlineEdit } from './InlineEdit'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useConfirm } from '../../components/useConfirm'
import { useDragDrop } from '../hooks/useDragDrop'
import { Icon } from '../../components'
import type { FileSystemNode } from '../../storage/file-system'
import { fileSystemManager } from '../../storage/file-system'
import { fileContentCache } from '../../storage/fileContentCache'

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
  const { confirm, confirmProps } = useConfirm()
  
  // 使用拖拽Hook
  const { isDragOver, dragHandlers } = useDragDrop({
    nodePath: node.path,
    isDirectory: node.isDirectory,
    focusedFiles,
    onError: async (error, message) => {
      await confirm({
        title: error.message,
        message,
        confirmText: '确定',
        type: 'danger'
      })
    },
    onUpdatePaths: onUpdateFocusedFilesPaths
  })

  // 预加载文件内容（在鼠标按下时）
  const handleMouseDown = (e: React.MouseEvent) => {
    // 只在左键按下且是文件时预加载
    if (e.button === 0 && !node.isDirectory) {
      // 异步预加载，不阻塞鼠标按下事件
      const preloadContent = async () => {
        try {
          // 如果已经有缓存，跳过
          if (fileContentCache.get(node.path) !== null) {
            return
          }
          
          // 预加载文件内容
          const result = await (window as any).electronAPI.readFileAsText(node.path)
          if (result.success) {
            fileContentCache.set(node.path, result.content)
          } else {
            // 如果不支持，尝试普通文本读取
            const content = await fileSystemManager.readFile(node.path)
            if (content) {
              fileContentCache.set(node.path, content)
            }
          }
        } catch (error) {
          console.error('预加载文件内容失败:', error)
        }
      }
      
      preloadContent()
    }
  }

  // 自定义拖拽开始处理器，为文件添加拖拽到输入框的支持
  const handleDragStart = (e: React.DragEvent) => {
    // 先调用原始的拖拽处理器（用于文件系统内移动）
    dragHandlers.onDragStart?.(e)

    // 如果是文件（非目录），添加额外的数据用于拖拽到输入框
    if (!node.isDirectory) {
      try {
        // 从缓存获取内容（应该已经被 handleMouseDown 预加载了）
        const content = fileContentCache.get(node.path)
        
        // 确保content不为null时才设置dataTransfer
        if (content) {
          // 设置文件信息到dataTransfer（用于拖拽到输入框）
          e.dataTransfer.setData('application/file-path', node.path)
          e.dataTransfer.setData('application/file-name', node.name)
          e.dataTransfer.setData('application/file-content', content)
        } else {
          // 如果缓存中没有内容，说明预加载还没完成或失败了
          console.warn('文件内容未就绪，拖拽可能失败:', node.path)
        }
      } catch (error) {
        console.error('设置拖拽数据失败:', error)
      }
    }
  }

  // 组合拖拽处理器
  const combinedDragHandlers = {
    ...dragHandlers,
    onDragStart: handleDragStart
  }

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

  // 收集文件夹内所有文件的路径
  const collectAllFilesInDirectory = (node: FileSystemNode): string[] => {
    const files: string[] = []
    
    const traverse = (currentNode: FileSystemNode) => {
      if (!currentNode.isDirectory) {
        files.push(currentNode.path)
      } else if (currentNode.children) {
        currentNode.children.forEach(child => traverse(child))
      }
    }
    
    traverse(node)
    return files
  }

  // 计算文件夹的选中状态
  const getDirectoryCheckState = () => {
    if (!node.isDirectory) {
      return { checked: isFileSelected, indeterminate: false }
    }
    
    const allFiles = collectAllFilesInDirectory(node)
    if (allFiles.length === 0) {
      return { checked: false, indeterminate: false }
    }
    
    const selectedCount = allFiles.filter(path => selectedFiles?.includes(path)).length
    
    if (selectedCount === 0) {
      return { checked: false, indeterminate: false }
    } else if (selectedCount === allFiles.length) {
      return { checked: true, indeterminate: false }
    } else {
      return { checked: false, indeterminate: true }
    }
  }

  const checkState = getDirectoryCheckState()
  const hasLoadingFiles = node.isDirectory && 
    collectAllFilesInDirectory(node).some(path => loadingFiles?.has(path))

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    
    if (node.isDirectory) {
      // 选择文件夹时，选择/取消选择所有子文件
      const allFiles = collectAllFilesInDirectory(node)
      const shouldSelect = e.target.checked
      
      // 批量处理所有文件
      allFiles.forEach(filePath => {
        onFileSelect?.(filePath, shouldSelect)
      })
    } else {
      // 选择单个文件
      onFileSelect?.(node.path, e.target.checked)
    }
  }

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
            onMouseDown={handleMouseDown}
            {...combinedDragHandlers}
          >
            {node.isDirectory && (
              <div className={`transition-transform duration-300 ${isExpanded ? '' : '-rotate-90'}`}>
                <Icon name="chevronDown" className="w-4 h-4 text-gray-500" />
              </div>
            )}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileIcon node={node} />
              <span className="text-sm font-medium truncate">{node.name}</span>
            </div>
            <div className="relative group/checkbox flex items-center">
              <input
                type="checkbox"
                checked={checkState.checked}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = checkState.indeterminate
                  }
                }}
                onChange={handleCheckboxChange}
                onClick={(e) => e.stopPropagation()} // 防止触发父元素的点击事件
                disabled={node.isDirectory ? hasLoadingFiles : isLoading}
                className={`w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-400 focus:ring-2 focus:ring-offset-1 transition-all duration-200 ${
                  (node.isDirectory ? hasLoadingFiles : isLoading) 
                    ? 'opacity-50' 
                    : 'hover:border-blue-400 hover:shadow-sm'
                } ${
                  checkState.checked || checkState.indeterminate 
                    ? 'scale-110 border-blue-500' 
                    : ''
                }`}
                title={
                  node.isDirectory
                    ? hasLoadingFiles 
                      ? '文件夹内有文件正在加载...' 
                      : '选择此文件夹内所有文件用于AI对话'
                    : isLoading 
                      ? '文件内容加载中...' 
                      : '选择此文件用于AI对话'
                }
              />
              {((node.isDirectory && hasLoadingFiles) || (!node.isDirectory && isLoading)) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {/* 选中状态指示器 */}
              {(checkState.checked || checkState.indeterminate) && 
               !(node.isDirectory ? hasLoadingFiles : isLoading) && (
                <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full shadow-lg ${
                  checkState.indeterminate 
                    ? 'bg-yellow-500 animate-pulse shadow-yellow-500/50' 
                    : 'bg-green-500 animate-pulse shadow-green-500/50'
                }`}></div>
              )}
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