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

// 文件夹展开状态类型
export interface FolderExpansionState {
  [filePath: string]: boolean // 文件夹路径 -> 是否展开
}

// 文件系统管理器  
export class FileSystemManager {
  private currentWorkspace: Workspace | null = null
  private fileTree: FileSystemNode[] = []
  private expansionState: FolderExpansionState = {}
  private defaultExpansionLevel = 2 // 默认展开层级

  /**
   * 初始化文件系统管理器
   */
  async init(): Promise<void> {
    try {
      // 加载最近使用的工作区
      const recentWorkspace = this.loadRecentWorkspace()
      if (recentWorkspace && (await this.isValidWorkspace(recentWorkspace.rootPath))) {
        await this.setWorkspace(recentWorkspace)
      } else {
        // 如果没有工作区，也要加载默认的展开状态
        this.loadExpansionState()
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
    
    // 加载对应工作区的展开状态
    this.loadExpansionState()
    
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
   * 执行文件系统操作并自动刷新文件树
   */
  private async executeWithRefresh<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      const result = await operation()
      await this.loadFileTree()
      return result
    } catch (error) {
      console.error(errorMessage, error)
      throw error
    }
  }

  /**
   * 写入文件内容
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    return this.executeWithRefresh(
      () => (window as any).electronAPI.writeFile(filePath, content),
      `写入文件失败: ${filePath}`
    )
  }

  /**
   * 创建新文件
   */
  async createFile(dirPath: string, fileName: string): Promise<string> {
    return this.executeWithRefresh(
      () => (window as any).electronAPI.createFile(dirPath, fileName),
      '创建文件失败:'
    )
  }

  /**
   * 创建新文件夹
   */
  async createDirectory(parentPath: string, dirName: string): Promise<string> {
    return this.executeWithRefresh(
      () => (window as any).electronAPI.createDirectory(parentPath, dirName),
      '创建文件夹失败:'
    )
  }

  /**
   * 删除文件或文件夹
   */
  async delete(path: string): Promise<void> {
    return this.executeWithRefresh(
      () => (window as any).electronAPI.deleteFileOrDirectory(path),
      '删除失败:'
    )
  }

  /**
   * 重命名文件或文件夹
   */
  async rename(oldPath: string, newName: string): Promise<string> {
    return this.executeWithRefresh(
      () => (window as any).electronAPI.rename(oldPath, newName),
      '重命名失败:'
    )
  }

  /**
   * 移动文件或文件夹到目标目录
   */
  async move(sourcePath: string, targetDirPath: string, newName?: string): Promise<string> {
    return this.executeWithRefresh(
      () => (window as any).electronAPI.movePath(sourcePath, targetDirPath, newName),
      '移动失败:'
    )
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

  /**
   * 获取文件夹是否应该展开
   */
  isFolderExpanded(folderPath: string, level: number = 0): boolean {
    // 如果已经有存储的状态，优先使用存储的状态
    if (this.expansionState.hasOwnProperty(folderPath)) {
      return this.expansionState[folderPath]
    }
    // 否则根据默认层级判断
    return level < this.defaultExpansionLevel
  }

  /**
   * 设置文件夹展开状态
   */
  setFolderExpanded(folderPath: string, expanded: boolean): void {
    this.expansionState[folderPath] = expanded
    this.saveExpansionState()
  }

  /**
   * 获取完整的展开状态
   */
  getExpansionState(): FolderExpansionState {
    return { ...this.expansionState }
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

  private getExpansionStateKey(): string {
    return this.currentWorkspace ? `expansion_state_${this.currentWorkspace.id}` : 'expansion_state_default'
  }

  private loadExpansionState(): void {
    try {
      const key = this.getExpansionStateKey()
      this.expansionState = storage.loadGenericData<FolderExpansionState>(key, {})
    } catch (error) {
      console.warn('加载展开状态失败:', error)
      this.expansionState = {}
    }
  }

  private saveExpansionState(): void {
    try {
      const key = this.getExpansionStateKey()
      storage.saveGenericData(key, this.expansionState)
    } catch (error) {
      console.error('保存展开状态失败:', error)
    }
  }
}

// 导出实例
export const fileSystemManager = new FileSystemManager()
export default fileSystemManager