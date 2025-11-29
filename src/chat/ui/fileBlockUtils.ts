/**
 * 文件块工具函数
 * 
 * 功能：
 * - 文件块数据类型定义
 * - 文件块 DOM 操作
 * - 插入点获取
 * - 内容解析
 */
// 类型定义


export interface FileBlockData {
  id: string
  filePath: string
  fileName: string
  content: string
  size: number
  type?: 'file' | 'text' // 新增：区分文件块和文本块
}


// DOM 操作函数


/**
 * 获取鼠标位置或光标位置的插入点
 */
export function getInsertionPoint(
  clientX?: number, 
  clientY?: number, 
  container?: HTMLElement | null
): { node: Node; offset: number } | null {
  // 1. 尝试从鼠标位置获取
  if (clientX !== undefined && clientY !== undefined) {
    try {
      if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(clientX, clientY)
        if (range && container?.contains(range.commonAncestorContainer)) {
          return { node: range.startContainer, offset: range.startOffset }
        }
      } else if ((document as any).caretPositionFromPoint) {
        const position = (document as any).caretPositionFromPoint(clientX, clientY)
        if (position && container?.contains(position.offsetNode)) {
          return { node: position.offsetNode, offset: position.offset }
        }
      }
    } catch (err) {
      // 忽略错误
    }
  }
  
  // 2. 尝试从当前选区获取
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    if (!container || container.contains(range.commonAncestorContainer)) {
      return { node: range.startContainer, offset: range.startOffset }
    }
  }
  
  return null
}

/**
 * 创建文件块DOM元素
 */
export function createFileBlockElement(block: FileBlockData): HTMLSpanElement {
  const blockElement = document.createElement('span')
  blockElement.contentEditable = 'false'
  blockElement.draggable = true
  blockElement.dataset.fileId = block.id
  
  const isTextBlock = block.type === 'text'
  
  // 确定显示内容：文本块显示内容预览，文件块显示文件名
  let displayText: string
  if (isTextBlock) {
    // 文本块：显示前30个字符的内容预览
    const preview = block.content.trim().replace(/\s+/g, ' ').slice(0, 30)
    displayText = preview + (block.content.length > 30 ? '...' : '')
  } else {
    // 文件块：显示文件名
    displayText = block.fileName
  }
  
  // 统一样式
  blockElement.className = 'inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 bg-blue-100 border border-blue-300 rounded text-blue-700 text-sm whitespace-nowrap hover:bg-blue-200 transition-colors cursor-move align-middle'
  blockElement.title = isTextBlock 
    ? `文本片段来自: ${block.fileName}\n${(block.size / 1024).toFixed(1)}KB\n\n${block.content.slice(0, 200)}${block.content.length > 200 ? '...' : ''}\n\n拖动可调整位置`
    : `${block.fileName}\n${(block.size / 1024).toFixed(1)}KB\n\n拖动可调整位置`
  
  // 统一图标
  const icon = `<svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
     </svg>`
  
  blockElement.innerHTML = `
    ${icon}
    <span class="font-medium max-w-[150px] truncate">${displayText}</span>
    <button class="ml-0.5 p-0.5 rounded hover:bg-blue-300 transition-colors file-block-remove" data-file-id="${block.id}" title="删除">
      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `
  
  return blockElement
}

/**
 * 在指定位置插入节点，并在后面添加空格
 */
export function insertNodeWithSpace(
  node: Node,
  targetNode: Node,
  targetOffset: number
): void {
  const range = document.createRange()
  range.setStart(targetNode, targetOffset)
  range.collapse(true)
  range.insertNode(node)
  
  // 在节点后添加空格
  const space = document.createTextNode(' ')
  range.setStartAfter(node)
  range.insertNode(space)
  range.setStartAfter(space)
  range.collapse(true)
  
  // 更新选区
  const selection = window.getSelection()
  if (selection) {
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

/**
 * 移除文件块节点及其相邻的空格
 */
export function removeBlockNode(element: HTMLElement): void {
  const nextSibling = element.nextSibling
  const prevSibling = element.previousSibling
  
  element.remove()
  
  // 清理相邻的空格节点
  if (nextSibling?.nodeType === Node.TEXT_NODE && nextSibling.textContent === ' ') {
    nextSibling.remove()
  } else if (prevSibling?.nodeType === Node.TEXT_NODE && prevSibling.textContent === ' ') {
    prevSibling.remove()
  }
}


// 内容解析函数


/**
 * 解析编辑器内容，返回文本和文件块的组合
 */
export function parseEditorContent(editor: HTMLElement, fileBlocks: FileBlockData[]): string {
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
        const block = fileBlocks.find(b => b.id === element.dataset.fileId)
        if (block) {
          // 直接添加内容，不包含格式标记
          parts.push(block.content)
        }
      } else {
        node.childNodes.forEach(processNode)
      }
    }
  }
  
  editor.childNodes.forEach(processNode)
  return parts.join(' ').trim()
}

