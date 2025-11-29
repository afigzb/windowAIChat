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
import { ApiProviderToggle } from './components'
import { FileBlock, type FileBlockData } from './components/FileBlock'

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
      // 将光标移动到末尾
      const range = document.createRange()
      const sel = window.getSelection()
      if (editorRef.current && sel) {
        range.selectNodeContents(editorRef.current)
        range.collapse(false)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    },
    getValue: () => {
      if (!editorRef.current) return ''
      
      // 解析编辑器内容，保持文本和文件块的顺序
      const editor = editorRef.current
      const parts: string[] = []
      
      const processNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || ''
          if (text.trim()) {
            parts.push(text)
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement
          if (element.dataset.fileId) {
            const fileId = element.dataset.fileId
            const block = fileBlocks.find(b => b.id === fileId)
            if (block) {
              parts.push(`\`\`\`${block.fileName}\n${block.content}\n\`\`\``)
            }
          } else {
            node.childNodes.forEach(processNode)
          }
        }
      }
      
      editor.childNodes.forEach(processNode)
      return parts.join(' ').trim()
    },
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
    
    // 检查是否是内部块拖动或外部文件拖入
    const isBlockDrag = e.dataTransfer.types.includes('application/file-block-id')
    const hasFileData = e.dataTransfer.types.includes('application/file-path')
    
    if (isBlockDrag || hasFileData) {
      setIsDragOver(true)
      
      // 使用 requestAnimationFrame 节流光标更新，避免性能问题
      if (dragOverRafRef.current !== null) {
        return
      }
      
      dragOverRafRef.current = requestAnimationFrame(() => {
        dragOverRafRef.current = null
        
        // 实时更新光标位置以提供视觉反馈
        if (editorRef.current && document.caretRangeFromPoint) {
          try {
            const range = document.caretRangeFromPoint(e.clientX, e.clientY)
            if (range && editorRef.current.contains(range.commonAncestorContainer)) {
              const selection = window.getSelection()
              if (selection) {
                selection.removeAllRanges()
                selection.addRange(range)
              }
            }
          } catch (err) {
            // 忽略错误，继续拖动
          }
        } else if (editorRef.current && (document as any).caretPositionFromPoint) {
          // Firefox 兼容
          try {
            const position = (document as any).caretPositionFromPoint(e.clientX, e.clientY)
            if (position && editorRef.current.contains(position.offsetNode)) {
              const range = document.createRange()
              range.setStart(position.offsetNode, position.offset)
              range.collapse(true)
              
              const selection = window.getSelection()
              if (selection) {
                selection.removeAllRanges()
                selection.addRange(range)
              }
            }
          } catch (err) {
            // 忽略错误，继续拖动
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    // 清理待处理的 raf
    if (dragOverRafRef.current !== null) {
      cancelAnimationFrame(dragOverRafRef.current)
      dragOverRafRef.current = null
    }

    // 检查是内部块拖动还是外部文件拖入
    const blockId = e.dataTransfer.getData('application/file-block-id')
    
    // 情况1: 内部块拖动重排
    if (blockId && draggingBlockId) {
      if (editorRef.current) {
        const draggedElement = editorRef.current.querySelector(`[data-file-id="${blockId}"]`) as HTMLElement
        if (!draggedElement) return
        
        // 获取鼠标位置对应的插入点（在移除节点之前）
        let targetNode: Node | null = null
        let targetOffset: number = 0
        
        try {
          if (document.caretRangeFromPoint) {
            const range = document.caretRangeFromPoint(e.clientX, e.clientY)
            if (range && editorRef.current.contains(range.commonAncestorContainer)) {
              targetNode = range.startContainer
              targetOffset = range.startOffset
            }
          } else if ((document as any).caretPositionFromPoint) {
            const position = (document as any).caretPositionFromPoint(e.clientX, e.clientY)
            if (position && editorRef.current.contains(position.offsetNode)) {
              targetNode = position.offsetNode
              targetOffset = position.offset
            }
          }
          
          // 如果获取到了有效的目标位置
          if (targetNode) {
            // 保存兄弟节点引用（用于后续清理）
            const nextSibling = draggedElement.nextSibling
            const prevSibling = draggedElement.previousSibling
            
            // 如果目标就是被拖动的元素自己，不做任何操作
            if (targetNode === draggedElement || draggedElement.contains(targetNode)) {
              return
            }
            
            // 移除原位置的块
            draggedElement.remove()
            
            // 清理可能留下的多余空格
            if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE && nextSibling.textContent === ' ') {
              nextSibling.remove()
            } else if (prevSibling && prevSibling.nodeType === Node.TEXT_NODE && prevSibling.textContent === ' ') {
              prevSibling.remove()
            }
            
            // 创建新的range在目标位置插入
            const newRange = document.createRange()
            newRange.setStart(targetNode, targetOffset)
            newRange.collapse(true)
            
            // 在新位置插入块
            newRange.insertNode(draggedElement)
            
            // 在块后添加空格
            const space = document.createTextNode(' ')
            newRange.setStartAfter(draggedElement)
            newRange.insertNode(space)
            newRange.setStartAfter(space)
            newRange.collapse(true)
            
            // 更新选区
            const selection = window.getSelection()
            if (selection) {
              selection.removeAllRanges()
              selection.addRange(newRange)
            }
          }
        } catch (err) {
          console.warn('块移动失败:', err)
        }
      }
      return
    }
    
    // 情况2: 外部文件拖入
    const filePath = e.dataTransfer.getData('application/file-path')
    const fileName = e.dataTransfer.getData('application/file-name')
    const fileContent = e.dataTransfer.getData('application/file-content')

    if (filePath && fileName && fileContent) {
      const newBlock: FileBlockData = {
        id: `${Date.now()}-${Math.random()}`,
        filePath,
        fileName,
        content: fileContent,
        size: new Blob([fileContent]).size
      }
      setFileBlocks(prev => [...prev, newBlock])
      
      // 插入文件块标记到鼠标位置或光标位置
      if (editorRef.current) {
        editorRef.current.focus()
        
        // 创建一个带有特殊属性的span元素作为文件块占位符
        const blockElement = document.createElement('span')
        blockElement.contentEditable = 'false'
        blockElement.draggable = true
        blockElement.className = 'inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 bg-blue-100 border border-blue-300 rounded text-blue-700 text-sm whitespace-nowrap hover:bg-blue-200 transition-colors cursor-move align-middle'
        blockElement.dataset.fileId = newBlock.id
        blockElement.title = `${filePath}\n${(newBlock.size / 1024).toFixed(1)}KB\n\n拖动可调整位置`
        
        // 构建内部HTML
        blockElement.innerHTML = `
          <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="font-medium max-w-[150px] truncate">${fileName}</span>
          <button class="ml-0.5 p-0.5 rounded hover:bg-blue-300 transition-colors file-block-remove" data-file-id="${newBlock.id}" title="删除">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        `
        
        // 根据鼠标位置获取插入位置
        let targetNode: Node | null = null
        let targetOffset: number = 0
        
        // 尝试使用鼠标位置获取插入点
        try {
          if (document.caretRangeFromPoint) {
            const range = document.caretRangeFromPoint(e.clientX, e.clientY)
            if (range && editorRef.current.contains(range.commonAncestorContainer)) {
              targetNode = range.startContainer
              targetOffset = range.startOffset
            }
          } else if ((document as any).caretPositionFromPoint) {
            const position = (document as any).caretPositionFromPoint(e.clientX, e.clientY)
            if (position && editorRef.current.contains(position.offsetNode)) {
              targetNode = position.offsetNode
              targetOffset = position.offset
            }
          }
        } catch (err) {
          console.warn('无法从鼠标位置获取插入点:', err)
        }
        
        // 如果没有从鼠标位置获取到有效位置，尝试使用当前选区
        if (!targetNode) {
          const selection = window.getSelection()
          if (selection && selection.rangeCount > 0) {
            const existingRange = selection.getRangeAt(0)
            if (editorRef.current.contains(existingRange.commonAncestorContainer)) {
              targetNode = existingRange.startContainer
              targetOffset = existingRange.startOffset
            }
          }
        }
        
        // 插入文件块
        if (targetNode) {
          const range = document.createRange()
          range.setStart(targetNode, targetOffset)
          range.collapse(true)
          
          range.deleteContents()
          range.insertNode(blockElement)
          
          // 在块后添加一个空格，方便继续输入
          const space = document.createTextNode(' ')
          range.setStartAfter(blockElement)
          range.insertNode(space)
          range.setStartAfter(space)
          range.collapse(true)
          
          // 更新选区
          const selection = window.getSelection()
          if (selection) {
            selection.removeAllRanges()
            selection.addRange(range)
          }
        } else {
          // 如果都没有，添加到末尾
          editorRef.current.appendChild(blockElement)
          editorRef.current.appendChild(document.createTextNode(' '))
          
          // 将光标移到末尾
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
    }
  }

  // 处理块的删除
  const handleRemoveBlock = (id: string) => {
    setFileBlocks(prev => prev.filter(block => block.id !== id))
    // 从编辑器中删除对应的DOM元素
    if (editorRef.current) {
      const blockElement = editorRef.current.querySelector(`[data-file-id="${id}"]`)
      if (blockElement) {
        blockElement.remove()
      }
    }
  }

  // 监听编辑器内的事件（删除按钮点击、块拖动）
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    // 处理删除按钮点击
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const removeButton = target.closest('.file-block-remove')
      if (removeButton) {
        e.preventDefault()
        e.stopPropagation()
        const fileId = (removeButton as HTMLElement).dataset.fileId
        if (fileId) {
          handleRemoveBlock(fileId)
        }
      }
    }

    // 处理块开始拖动
    const handleBlockDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement
      if (target.dataset.fileId) {
        e.stopPropagation()
        setDraggingBlockId(target.dataset.fileId)
        // 设置拖动数据类型，以便区分是块拖动还是外部文件拖动
        e.dataTransfer!.effectAllowed = 'move'
        e.dataTransfer!.setData('application/file-block-id', target.dataset.fileId)
        // 添加半透明效果
        target.style.opacity = '0.4'
      }
    }

    // 处理块拖动结束
    const handleBlockDragEnd = (e: DragEvent) => {
      const target = e.target as HTMLElement
      if (target.dataset.fileId) {
        e.stopPropagation()
        setDraggingBlockId(null)
        // 恢复透明度
        target.style.opacity = '1'
        // 清理待处理的 raf
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
      // 清理待处理的 raf
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
    
    // 获取编辑器内容，解析文本和文件块的顺序
    const editor = editorRef.current
    const parts: string[] = []
    
    // 遍历编辑器的所有子节点
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || ''
        if (text.trim()) {
          parts.push(text)
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement
        // 如果是文件块元素
        if (element.dataset.fileId) {
          const fileId = element.dataset.fileId
          const block = fileBlocks.find(b => b.id === fileId)
          if (block) {
            // 将文件内容以代码块形式添加
            parts.push(`\`\`\`${block.fileName}\n${block.content}\n\`\`\``)
          }
        } else {
          // 递归处理子节点
          node.childNodes.forEach(processNode)
        }
      }
    }
    
    editor.childNodes.forEach(processNode)
    
    const finalContent = parts.join(' ').trim()
    
    if (finalContent) {
      onSend(finalContent)
      editor.innerHTML = ''
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
