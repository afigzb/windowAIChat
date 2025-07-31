/// <reference types="vite/client" />

// Electron API类型定义
declare global {
  interface Window {
    electronAPI: {
      // 系统信息
      platform: string
      
      // 应用版本信息
      getVersion: () => Promise<string>
      
      // 窗口控制
      minimizeWindow: () => Promise<void>
      maximizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
      
      // 文件操作（原有）
      openFile: () => Promise<any>
      saveFile: (data: any) => Promise<any>
      
      // 通知
      showNotification: (title: string, body: string) => Promise<void>

      // === 文件系统管理API ===
      
      // 选择工作目录
      selectDirectory: () => Promise<{
        canceled: boolean
        filePaths: string[]
      }>
      
      // 验证目录是否有效
      isValidDirectory: (path: string) => Promise<boolean>
      
      // 获取目录树结构
      getDirectoryTree: (path: string) => Promise<import('./storage/file-system').FileSystemNode[]>
      
      // 文件读取与写入
      readFile: (filePath: string) => Promise<string>
      writeFile: (filePath: string, content: string) => Promise<boolean>
      
      // 文件与目录操作
      createFile: (dirPath: string, fileName: string) => Promise<string>
      createDirectory: (parentPath: string, dirName: string) => Promise<string>
      deleteFileOrDirectory: (path: string) => Promise<boolean>
      rename: (oldPath: string, newName: string) => Promise<string>
      
      // 获取文件信息
      getFileStats: (path: string) => Promise<{
        size: number
        modified: Date
        created: Date
        isDirectory: boolean
        isFile: boolean
      }>
    }
  }
}
/// <reference types="react/jsx-runtime" />
