/**
 * 后端文件处理API的类型定义
 * 对应 electron/converters/converter-manager.js 的返回值
 * 
 * 架构说明：
 * - readFileAuto: 读取文件并返回HTML格式（用于编辑器）
 * - readFileAsText: 读取文件并返回纯文本（用于AI对话等场景）
 * - saveFileAuto: 保存文件（自动处理格式转换）
 */

/**
 * 支持的文件格式信息
 */
export interface SupportedFormatsInfo {
  documents: string[]
  images: string[]
  texts: string[]
  all: string[]
}

/**
 * 文件格式信息
 */
export interface FileFormatInfo {
  isSupported: boolean
  type?: 'document' | 'image' | 'text' | 'unsupported'
  extension?: string
  converterName?: string
  reason?: string
}

/**
 * 图片数据（从后端返回）
 */
export interface ImageDataFromBackend {
  dataUrl: string
  mimeType: string
  size: number
  extension?: string
}

/**
 * 文件读取结果
 */
export interface FileReadResult {
  success: boolean
  content?: string | ImageDataFromBackend
  type?: 'document' | 'image' | 'text'
  extension?: string
  error?: string
  supportedFormats?: string[]
}

/**
 * 文件保存结果
 */
export interface FileSaveResult {
  success: boolean
  error?: string
}

/**
 * 文件读取为纯文本的结果
 * 用于AI对话等不需要HTML格式的场景
 */
export interface FileReadAsTextResult {
  success: boolean
  content?: string  // 纯文本内容
  type?: 'document' | 'image' | 'text'
  extension?: string
  error?: string
}

/**
 * 扩展 window.electronAPI 的类型定义
 */
declare global {
  interface Window {
    electronAPI: {
      // === 统一的文件处理API ===
      getSupportedFormatsInfo: () => Promise<SupportedFormatsInfo>
      getFileFormatInfo: (filePath: string) => Promise<FileFormatInfo>
      
      // 读取文件为HTML格式（用于编辑器）
      readFileAuto: (filePath: string) => Promise<FileReadResult>
      
      // 保存文件（自动处理格式转换）
      saveFileAuto: (filePath: string, content: string) => Promise<FileSaveResult>
      
      // 读取文件为纯文本（用于AI对话等场景，避免前端重复实现HTML转换）
      readFileAsText: (filePath: string) => Promise<FileReadAsTextResult>
      
      // === 文件系统管理 ===
      selectDirectory: () => Promise<any>
      isValidDirectory: (path: string) => Promise<boolean>
      getDirectoryTree: (path: string) => Promise<any>
      
      // === 基础文件操作 ===
      readFile: (filePath: string) => Promise<string>
      writeFile: (filePath: string, content: string) => Promise<void>
      createFile: (dirPath: string, fileName: string) => Promise<string>
      createDirectory: (parentPath: string, dirName: string) => Promise<string>
      deleteFileOrDirectory: (path: string) => Promise<void>
      rename: (oldPath: string, newName: string) => Promise<string>
      movePath: (sourcePath: string, targetDirPath: string, newName?: string) => Promise<string>
      getFileStats: (path: string) => Promise<any>
      
      // === 存储 ===
      initStorageDir: () => Promise<void>
      kvGet: (key: string) => Promise<any>
      kvSet: (key: string, value: any) => Promise<void>
      kvRemove: (key: string) => Promise<void>
      kvGetSync: (key: string) => any
      kvSetSync: (key: string, value: any) => void
      kvRemoveSync: (key: string) => void
      
      // === 右键菜单 ===
      setWorkspacePath: (workspacePath: string) => Promise<void>
      showFileContextMenu: (fileInfo: any) => Promise<void>
      showDirectoryContextMenu: (dirPath: string) => Promise<void>
      onFileSystemChanged: (callback: (data: any) => void) => void
      onTriggerInlineEdit: (callback: (data: any) => void) => void
      
      // === 通用子窗口管理 ===
      openChildWindow: (windowId: string) => Promise<void>
      isChildWindowOpen: (windowId: string) => Promise<boolean>
      closeChildWindow: (windowId: string) => Promise<void>
      focusChildWindow: (windowId: string) => Promise<void>
      toggleChildWindowAlwaysOnTop: (windowId: string) => Promise<boolean>
      getChildWindowAlwaysOnTop: (windowId: string) => Promise<boolean>
      onChildWindowStateChanged: (windowId: string, callback: (isOpen: boolean) => void) => void
      
      // === 业务专用 API ===
      notifyPromptCardsChanged: () => void
      onPromptCardsChanged: (callback: () => void) => void
    }
  }
}

export {}

