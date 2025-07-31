// 文件系统管理模块
// 提供类似VSCode的文件管理功能

import storage from './index'

// 文件系统节点类型
export interface FileSystemNode {
  id: string
  name: string
  path: string
  isDirectory: boolean
  parentId?: string
  children?: FileSystemNode[]
  size?: number
  modified?: Date
  extension?: string
}

// 项目工作区类型
export interface Workspace {
  id: string
  name: string
  rootPath: string
  createdAt: Date
  lastAccessed: Date
}

// 文件系统管理器
export class FileSystemManager {
  private static instance: FileSystemManager
  private currentWorkspace: Workspace | null = null
  private fileTree: FileSystemNode[] = []

  private constructor() {}

  static getInstance(): FileSystemManager {
    if (!FileSystemManager.instance) {
      FileSystemManager.instance = new FileSystemManager()
    }
    return FileSystemManager.instance
  }

  /**
   * 初始化文件系统管理器
   */
  async init(): Promise<void> {
    try {
      // 加载最近使用的工作区
      const recentWorkspace = this.loadRecentWorkspace()
      if (recentWorkspace && (await this.isValidWorkspace(recentWorkspace.rootPath))) {
        await this.setWorkspace(recentWorkspace)
      }
    } catch (error) {
      console.warn('初始化文件系统失败:', error)
    }
  }

  /**
   * 选择并设置工作目录
   */
  async selectWorkspace(): Promise<Workspace | null> {
    try {
      // 调用Electron API选择文件夹
      const result = await (window as any).electronAPI.selectDirectory()
      if (result.canceled || !result.filePaths.length) {
        return null
      }

      const rootPath = result.filePaths[0]
      const workspace: Workspace = {
        id: this.generateId(),
        name: this.getDirectoryName(rootPath),
        rootPath,
        createdAt: new Date(),
        lastAccessed: new Date()
      }

      await this.setWorkspace(workspace)
      return workspace
    } catch (error) {
      console.error('选择工作目录失败:', error)
      return null
    }
  }

  /**
   * 设置当前工作区
   */
  async setWorkspace(workspace: Workspace): Promise<void> {
    this.currentWorkspace = workspace
    workspace.lastAccessed = new Date()
    
    // 保存到本地存储
    this.saveRecentWorkspace(workspace)
    
    // 加载文件树
    await this.loadFileTree()
  }

  /**
   * 获取当前工作区
   */
  getCurrentWorkspace(): Workspace | null {
    return this.currentWorkspace
  }

  /**
   * 加载文件树
   */
  async loadFileTree(): Promise<FileSystemNode[]> {
    if (!this.currentWorkspace) {
      return []
    }

    try {
      this.fileTree = await (window as any).electronAPI.getDirectoryTree(this.currentWorkspace.rootPath)
      return this.fileTree
    } catch (error) {
      console.error('加载文件树失败:', error)
      return []
    }
  }

  /**
   * 获取文件树
   */
  getFileTree(): FileSystemNode[] {
    return this.fileTree
  }

  /**
   * 读取文件内容
   */
  async readFile(filePath: string): Promise<string> {
    try {
      return await (window as any).electronAPI.readFile(filePath)
    } catch (error) {
      console.error('读取文件失败:', error, filePath)
      throw error
    }
  }

  /**
   * 写入文件内容
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await (window as any).electronAPI.writeFile(filePath, content)
      // 重新加载文件树以反映变化
      await this.loadFileTree()
    } catch (error) {
      console.error('写入文件失败:', error, filePath)
      throw error
    }
  }

  /**
   * 创建新文件
   */
  async createFile(dirPath: string, fileName: string): Promise<string> {
    try {
      const filePath = await (window as any).electronAPI.createFile(dirPath, fileName)
      await this.loadFileTree()
      return filePath
    } catch (error) {
      console.error('创建文件失败:', error)
      throw error
    }
  }

  /**
   * 创建新文件夹
   */
  async createDirectory(parentPath: string, dirName: string): Promise<string> {
    try {
      const dirPath = await (window as any).electronAPI.createDirectory(parentPath, dirName)
      await this.loadFileTree()
      return dirPath
    } catch (error) {
      console.error('创建文件夹失败:', error)
      throw error
    }
  }

  /**
   * 删除文件或文件夹
   */
  async delete(path: string): Promise<void> {
    try {
      await (window as any).electronAPI.deleteFileOrDirectory(path)
      await this.loadFileTree()
    } catch (error) {
      console.error('删除失败:', error)
      throw error
    }
  }

  /**
   * 重命名文件或文件夹
   */
  async rename(oldPath: string, newName: string): Promise<string> {
    try {
      const newPath = await (window as any).electronAPI.rename(oldPath, newName)
      await this.loadFileTree()
      return newPath
    } catch (error) {
      console.error('重命名失败:', error)
      throw error
    }
  }

  /**
   * 根据路径查找文件节点
   */
  findNodeByPath(path: string): FileSystemNode | null {
    const findInNodes = (nodes: FileSystemNode[]): FileSystemNode | null => {
      for (const node of nodes) {
        if (node.path === path) {
          return node
        }
        if (node.children) {
          const found = findInNodes(node.children)
          if (found) return found
        }
      }
      return null
    }
    
    return findInNodes(this.fileTree)
  }

  // 私有方法

  private async isValidWorkspace(path: string): Promise<boolean> {
    try {
      return await (window as any).electronAPI.isValidDirectory(path)
    } catch {
      return false
    }
  }

  private loadRecentWorkspace(): Workspace | null {
    try {
      const stored = storage.loadGenericData<any>('recent_workspace', null)
      if (!stored) return null
      
      return {
        id: stored.id,
        name: stored.name,
        rootPath: stored.rootPath,
        createdAt: new Date(stored.createdAt),
        lastAccessed: new Date(stored.lastAccessed)
      }
    } catch {
      return null
    }
  }

  private saveRecentWorkspace(workspace: Workspace): void {
    storage.saveGenericData('recent_workspace', workspace)
  }

  private getDirectoryName(path: string): string {
    return path.split(/[/\\]/).filter(Boolean).pop() || path
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

// 导出单例实例
export const fileSystemManager = FileSystemManager.getInstance()
export default fileSystemManager