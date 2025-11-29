/**
 * 聊天输入区域组件
 * 
 * 功能：
 * - 支持多行文本输入，自动高度调整
 * - 集成 API 提供方切换器
 * - 支持 Enter 发送、Shift+Enter 换行
 * - 发送/停止按钮切换
 */

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import type { AIConfig } from '../types'
import { Icon } from '../../components'
import { ApiProviderToggle } from './components.tsx'
import {
  type FileBlockData,
  getInsertionPoint,
  createFileBlockElement,
  insertNodeWithSpace,
  parseEditorContent,
  removeBlockNode
} from './fileBlockUtils'

// 聊天输入区域
export const ChatInputArea = forwardRef<
  { focus: () => void; getValue: () => string; clear: () => void },
  {
    onSend: (content: string) => void
    isLoading: boolean
    onAbort: () => void
    config: AIConfig
    onProviderChange: (providerId: string) => void
  }
>(({ 
  onSend, 
  isLoading, 
  onAbort, 
  config,
  onProviderChange 
}, ref) => {
  // 使用局部状态管理输入内容，避免全局状态更新导致的性能问题
  const [fileBlocks, setFileBlocks] = useState<FileBlockData[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const dragOverRafRef = useRef<number | null>(null)

  // 提取编辑器内容（纯文本）
  const getEditorTextContent = (): string => {
    if (!editorRef.current) return ''
    return editorRef.current.innerText || ''
  }

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    focus: () => {
      editorRef.current?.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      if (editorRef.current && sel) {
        range.selectNodeContents(editorRef.current)
        range.collapse(false)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    },
    getValue: () => editorRef.current ? parseEditorContent(editorRef.current, fileBlocks) : '',
    clear: () => {
      if (editorRef.current) {
        editorRef.current.innerHTML = ''
      }
      setFileBlocks([])
    }
  }), [fileBlocks])

  // 处理从文件树拖入文件或内部块拖动
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const isBlockDrag = e.dataTransfer.types.includes('application/file-block-id')
    const hasFileData = e.dataTransfer.types.includes('application/file-path')
    
    if (isBlockDrag || hasFileData) {
      setIsDragOver(true)
      
      // 使用 requestAnimationFrame 节流光标更新
      if (dragOverRafRef.current !== null) return
      
      dragOverRafRef.current = requestAnimationFrame(() => {
        dragOverRafRef.current = null
        const point = getInsertionPoint(e.clientX, e.clientY, editorRef.current)
        if (point) {
          const range = document.createRange()
          range.setStart(point.node, point.offset)
          range.collapse(true)
          const selection = window.getSelection()
          if (selection) {
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 只有当鼠标真正离开 dropZone 时才清除状态
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
      // 清理待处理的 raf
      if (dragOverRafRef.current !== null) {
        cancelAnimationFrame(dragOverRafRef.current)
        dragOverRafRef.current = null
      }
    }
  }

  // 处理内部块拖动重排
  const handleBlockReorder = (blockId: string, e: React.DragEvent) => {
    if (!editorRef.current) return
    
    const draggedElement = editorRef.current.querySelector(`[data-file-id="${blockId}"]`) as HTMLElement
    if (!draggedElement) return
    
    const point = getInsertionPoint(e.clientX, e.clientY, editorRef.current)
    if (!point) return
    
    // 如果目标就是被拖动的元素自己，不做任何操作
    if (point.node === draggedElement || draggedElement.contains(point.node)) {
      return
    }
    
    try {
      removeBlockNode(draggedElement)
      insertNodeWithSpace(draggedElement, point.node, point.offset)
    } catch (err) {
      console.warn('块移动失败:', err)
    }
  }

  // 处理外部文件拖入
  const handleFileDrop = (filePath: string, fileName: string, fileContent: string, e: React.DragEvent) => {
    const newBlock: FileBlockData = {
      id: `${Date.now()}-${Math.random()}`,
      filePath,
      fileName,
      content: fileContent,
      size: new Blob([fileContent]).size
    }
    setFileBlocks(prev => [...prev, newBlock])
    
    if (!editorRef.current) return
    editorRef.current.focus()
    
    const blockElement = createFileBlockElement(newBlock)
    const point = getInsertionPoint(e.clientX, e.clientY, editorRef.current)
    
    if (point) {
      insertNodeWithSpace(blockElement, point.node, point.offset)
    } else {
      // 添加到末尾
      editorRef.current.appendChild(blockElement)
      editorRef.current.appendChild(document.createTextNode(' '))
      
      const range = document.createRange()
      const selection = window.getSelection()
      if (selection) {
        range.selectNodeContents(editorRef.current)
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    if (dragOverRafRef.current !== null) {
      cancelAnimationFrame(dragOverRafRef.current)
      dragOverRafRef.current = null
    }

    const blockId = e.dataTransfer.getData('application/file-block-id')
    
    // 情况1: 内部块拖动重排
    if (blockId && draggingBlockId) {
      handleBlockReorder(blockId, e)
      return
    }
    
    // 情况2: 外部文件拖入
    const filePath = e.dataTransfer.getData('application/file-path')
    const fileName = e.dataTransfer.getData('application/file-name')
    const fileContent = e.dataTransfer.getData('application/file-content')

    if (filePath && fileName && fileContent) {
      handleFileDrop(filePath, fileName, fileContent, e)
    }
  }

  // 处理块的删除
  const handleRemoveBlock = (id: string) => {
    setFileBlocks(prev => prev.filter(block => block.id !== id))
    if (editorRef.current) {
      const blockElement = editorRef.current.querySelector(`[data-file-id="${id}"]`) as HTMLElement
      if (blockElement) {
        removeBlockNode(blockElement)
      }
    }
  }

  // 监听编辑器内的块相关事件
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const removeButton = target.closest('.file-block-remove')
      if (removeButton) {
        e.preventDefault()
        e.stopPropagation()
        const fileId = (removeButton as HTMLElement).dataset.fileId
        if (fileId) handleRemoveBlock(fileId)
      }
    }

    const handleBlockDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement
      if (target.dataset.fileId) {
        e.stopPropagation()
        setDraggingBlockId(target.dataset.fileId)
        e.dataTransfer!.effectAllowed = 'move'
        e.dataTransfer!.setData('application/file-block-id', target.dataset.fileId)
        target.style.opacity = '0.4'
      }
    }

    const handleBlockDragEnd = (e: DragEvent) => {
      const target = e.target as HTMLElement
      if (target.dataset.fileId) {
        e.stopPropagation()
        setDraggingBlockId(null)
        target.style.opacity = '1'
        if (dragOverRafRef.current !== null) {
          cancelAnimationFrame(dragOverRafRef.current)
          dragOverRafRef.current = null
        }
      }
    }

    editor.addEventListener('click', handleClick)
    editor.addEventListener('dragstart', handleBlockDragStart)
    editor.addEventListener('dragend', handleBlockDragEnd)
    
    return () => {
      editor.removeEventListener('click', handleClick)
      editor.removeEventListener('dragstart', handleBlockDragStart)
      editor.removeEventListener('dragend', handleBlockDragEnd)
      if (dragOverRafRef.current !== null) {
        cancelAnimationFrame(dragOverRafRef.current)
        dragOverRafRef.current = null
      }
    }
  }, [fileBlocks])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isLoading) {
        onAbort()
      } else {
        const textContent = getEditorTextContent().trim()
        if (textContent || fileBlocks.length > 0) {
          handleSend()
        }
      }
    }
  }

  const handleSend = () => {
    if (!editorRef.current) return
    
    const finalContent = parseEditorContent(editorRef.current, fileBlocks)
    
    if (finalContent) {
      onSend(finalContent)
      editorRef.current.innerHTML = ''
      setFileBlocks([])
    }
  }

  // 检查是否可以发送
  const [canSend, setCanSend] = useState(false)
  
  useEffect(() => {
    const checkCanSend = () => {
      if (isLoading) {
        setCanSend(false)
        return
      }
      if (!editorRef.current) {
        setCanSend(false)
        return
      }
      const text = getEditorTextContent().trim()
      const hasFileBlocks = editorRef.current.querySelector('[data-file-id]') !== null
      setCanSend(text.length > 0 || hasFileBlocks)
    }
    
    checkCanSend()
    
    // 监听编辑器输入事件
    const editor = editorRef.current
    if (editor) {
      editor.addEventListener('input', checkCanSend)
      return () => {
        editor.removeEventListener('input', checkCanSend)
      }
    }
  }, [isLoading, fileBlocks])

  return (
    <div className="sticky bottom-0">
      <div className="max-w-4xl mx-auto px-8 pb-6 min-w-[20rem]">
        <div 
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 rounded-2xl bg-white focus-within:border-blue-400 focus-within:shadow-xl transition-all duration-300 shadow-md hover:shadow-lg min-w-[20rem] ${
            isDragOver ? 'border-blue-500 border-dashed bg-blue-50/50 scale-[1.02]' : 'border-gray-200'
          }`}
        >

          <div className="p-5">
            <div
              ref={editorRef}
              contentEditable={true}
              onKeyDown={handleKeyDown}
              suppressContentEditableWarning
              data-placeholder={isLoading ? "AI正在回复中，可以预输入下一条消息..." : "发送消息给 Assistant... (可拖入文件)"}
              className="w-full bg-transparent border-none focus:outline-none resize-none text-gray-900 text-base leading-relaxed min-h-[60px] max-h-[150px] overflow-y-auto min-w-0 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            />
          </div>

          <div className="flex items-center justify-between px-5 py-4 rounded-b-2xl min-w-[20rem]">
            <div className="flex items-center gap-4 flex-shrink">
              <ApiProviderToggle config={config} onProviderChange={onProviderChange} disabled={isLoading} />
              
              {isLoading && (
                <div className="flex items-center gap-2">
                  {/* Loading indicator if needed */}
                </div>
              )}
            </div>

            <button
              onClick={isLoading ? onAbort : handleSend}
              disabled={!isLoading && !canSend}
              className={`px-6 py-3 rounded-xl transition-all duration-300 text-sm font-semibold flex items-center gap-2.5 shadow-md hover:shadow-xl transform whitespace-nowrap ${
                isLoading 
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 hover:scale-105'
                  : canSend
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:scale-105'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Icon name={isLoading ? 'stop' : 'send'} />
              <span className="whitespace-nowrap">{isLoading ? '停止' : '发送'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

ChatInputArea.displayName = 'ChatInputArea'
