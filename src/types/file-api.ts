/**
 * 文件系统API类型定义 - 重构版
 * 
 * 架构说明：
 * 1. 使用TypeScript联合类型（Union Types）明确区分不同文件类型
 * 2. 后端负责文件IO和格式转换，前端负责展示
 * 3. 移除所有补丁逻辑和可选字段
 */

//  后端API返回类型 

/**
 * 图片数据
 */
export interface ImageData {
  dataUrl: string
  mimeType: string
  size: number
  extension: string
}

/**
 * 文件信息
 */
export interface FileInfo {
  supported: boolean
  type: 'document' | 'text' | 'image' | 'excel' | 'unsupported'
  extension: string
  canSave?: boolean
}

/**
 * 文件读取结果
 */
export interface FileReadResult {
  success: boolean
  content?: string | ImageData
  type?: 'document' | 'text' | 'image' | 'excel'
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
 * 纯文本读取结果
 */
export interface FileReadAsTextResult {
  success: boolean
  content?: string
  type?: 'document' | 'text' | 'image' | 'excel'
  extension?: string
  error?: string
}

/**
 * 支持的格式信息
 */
export interface SupportedFormatsInfo {
  documents: string[]
  images: string[]
  texts: string[]
  all: string[]
}

//  前端文件内容类型（联合类型） 

/**
 * 文档内容
 */
export interface DocumentContent {
  type: 'document'
  path: string
  name: string
  htmlContent: string
  isModified: boolean
}

/**
 * 文本内容
 */
export interface TextContent {
  type: 'text'
  path: string
  name: string
  htmlContent: string
  isModified: boolean
}

/**
 * 图片内容
 */
export interface ImageContent {
  type: 'image'
  path: string
  name: string
  imageData: ImageData
}

/**
 * Excel内容（只读）
 */
export interface ExcelContent {
  type: 'excel'
  path: string
  name: string
}

/**
 * 不支持的文件
 */
export interface UnsupportedContent {
  type: 'unsupported'
  path: string
  name: string
  reason?: string
}

/**
 * 文件内容 - 使用联合类型
 * TypeScript会根据type字段自动推导出正确的类型
 */
export type FileContent = 
  | DocumentContent 
  | TextContent 
  | ImageContent 
  | ExcelContent
  | UnsupportedContent

//  类型守卫函数 

export function isDocumentContent(content: FileContent): content is DocumentContent {
  return content.type === 'document'
}

export function isTextContent(content: FileContent): content is TextContent {
  return content.type === 'text'
}

export function isImageContent(content: FileContent): content is ImageContent {
  return content.type === 'image'
}

export function isExcelContent(content: FileContent): content is ExcelContent {
  return content.type === 'excel'
}

export function isUnsupportedContent(content: FileContent): content is UnsupportedContent {
  return content.type === 'unsupported'
}

export function isEditableContent(content: FileContent): content is DocumentContent | TextContent {
  return content.type === 'document' || content.type === 'text'
}

//  Electron API类型定义 

declare global {
  interface Window {
    electronAPI: {
      // 系统信息
      platform: string

      //  文件转换API 
      readFileAuto: (filePath: string) => Promise<FileReadResult>
      saveFileAuto: (filePath: string, content: string) => Promise<FileSaveResult>
      readFileAsText: (filePath: string) => Promise<FileReadAsTextResult>
      getFileFormatInfo: (filePath: string) => Promise<FileInfo>
      getSupportedFormatsInfo: () => Promise<SupportedFormatsInfo>
      extractTextFromHtml: (html: string) => Promise<string>
      openFileWithDefault: (filePath: string) => Promise<{ success: boolean; error?: string }>
      
      //  文件系统管理 
      selectDirectory: () => Promise<string | null>
      isValidDirectory: (path: string) => Promise<boolean>
      getDirectoryTree: (path: string) => Promise<any>
      
      //  基础文件操作 
      readFile: (filePath: string) => Promise<string>
      writeFile: (filePath: string, content: string) => Promise<void>
      createFile: (dirPath: string, fileName: string) => Promise<string>
      createDirectory: (parentPath: string, dirName: string) => Promise<string>
      deleteFileOrDirectory: (path: string) => Promise<void>
      rename: (oldPath: string, newName: string) => Promise<string>
      movePath: (sourcePath: string, targetDirPath: string, newName?: string) => Promise<string>
      getFileStats: (path: string) => Promise<any>
      
      //  存储
      initStorageDir: () => Promise<void>
      kvGet: (key: string) => Promise<any>
      kvSet: (key: string, value: any) => Promise<void>
      kvRemove: (key: string) => Promise<void>
      kvGetSync: (key: string) => any
      kvSetSync: (key: string, value: any) => void
      kvRemoveSync: (key: string) => void
      
      //  右键菜单 
      setWorkspacePath: (workspacePath: string) => Promise<void>
      showFileContextMenu: (fileInfo: any) => Promise<void>
      showDirectoryContextMenu: (dirPath: string) => Promise<void>
      onFileSystemChanged: (callback: (data: any) => void) => void
      onTriggerInlineEdit: (callback: (data: any) => void) => void
      
      //  子窗口管理 
      openChildWindow: (windowId: string) => Promise<void>
      isChildWindowOpen: (windowId: string) => Promise<boolean>
      closeChildWindow: (windowId: string) => Promise<void>
      focusChildWindow: (windowId: string) => Promise<void>
      toggleChildWindowAlwaysOnTop: (windowId: string) => Promise<boolean>
      getChildWindowAlwaysOnTop: (windowId: string) => Promise<boolean>
      onChildWindowStateChanged: (windowId: string, callback: (isOpen: boolean) => void) => void
      
      //  业务API 
      notifyPromptCardsChanged: () => void
      onPromptCardsChanged: (callback: () => void) => void
    }
  }
}

export {}
