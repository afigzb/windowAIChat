const { dialog, shell } = require('electron')
const fs = require('fs').promises
const fsSync = require('fs')
const path = require('path')
const os = require('os')

/**
 * 文件系统管理模块
 * 提供文件和目录操作的API
 */
class FileSystemManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow
    this.watcher = null // 文件系统监听器
    this.watchedPath = null // 当前监听的路径
    this.changeDebounceTimer = null // 防抖定时器
    this.changeDebounceDelay = 500 // 防抖延迟（毫秒）
  }

  /**
   * 选择工作目录
   */
  async selectDirectory() {
    try {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory'],
        title: '选择项目工作目录'
      })
      return result
    } catch (error) {
      console.error('选择目录失败:', error)
      throw error
    }
  }

  /**
   * 验证目录是否有效
   */
  async isValidDirectory(dirPath) {
    try {
      const stats = await fs.stat(dirPath)
      return stats.isDirectory()
    } catch {
      return false
    }
  }

  /**
   * 获取目录树结构
   */
  async getDirectoryTree(rootPath) {
    try {
      const buildTree = async (dirPath, parentId = null) => {
        const items = await fs.readdir(dirPath, { withFileTypes: true })
        const nodes = []
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item.name)
          const node = {
            id: Buffer.from(fullPath).toString('base64'),
            name: item.name,
            path: fullPath,
            isDirectory: item.isDirectory(),
            parentId
          }
          
          if (!item.isDirectory()) {
            // 文件：添加扩展名和大小信息
            const stats = await fs.stat(fullPath)
            node.size = stats.size
            node.modified = stats.mtime
            node.extension = path.extname(item.name)
          } else {
            // 目录：递归获取子项
            try {
              node.children = await buildTree(fullPath, node.id)
            } catch (error) {
              node.children = []
            }
          }
          
          nodes.push(node)
        }
        
        return nodes.sort((a, b) => {
          // 目录在前，文件在后，按名称排序
          if (a.isDirectory && !b.isDirectory) return -1
          if (!a.isDirectory && b.isDirectory) return 1
          return a.name.localeCompare(b.name)
        })
      }
      
      return await buildTree(rootPath)
    } catch (error) {
      console.error('获取目录树失败:', error)
      throw error
    }
  }

  /**
   * 读取文件内容
   */
  async readFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return content
    } catch (error) {
      console.error('读取文件失败:', error)
      throw error
    }
  }

  /**
   * 写入文件内容（使用原子写入，防止数据丢失）
   */
  async writeFile(filePath, content) {
    try {
      // 使用原子写入：先写入临时文件，然后重命名
      const dir = path.dirname(filePath)
      const ext = path.extname(filePath)
      const basename = path.basename(filePath, ext)
      
      // 创建临时文件路径
      const tempFilePath = path.join(dir, `.${basename}.tmp${ext}`)
      
      try {
        // 写入临时文件
        await fs.writeFile(tempFilePath, content, 'utf-8')
        
        // 确保数据写入磁盘
        const fd = fsSync.openSync(tempFilePath, 'r+')
        fsSync.fsyncSync(fd)
        fsSync.closeSync(fd)
        
        // 原子性地重命名临时文件为目标文件
        await fs.rename(tempFilePath, filePath)
        
        return true
      } catch (error) {
        // 如果失败，尝试清理临时文件
        try {
          if (fsSync.existsSync(tempFilePath)) {
            await fs.unlink(tempFilePath)
          }
        } catch (cleanupError) {
          console.warn('清理临时文件失败:', cleanupError)
        }
        throw error
      }
    } catch (error) {
      console.error('写入文件失败:', error)
      throw error
    }
  }

  /**
   * 创建文件
   */
  async createFile(dirPath, fileName) {
    try {
      const filePath = path.join(dirPath, fileName)
      await fs.writeFile(filePath, '', 'utf-8')
      return filePath
    } catch (error) {
      console.error('创建文件失败:', error)
      throw error
    }
  }

  /**
   * 创建目录
   */
  async createDirectory(parentPath, dirName) {
    try {
      const dirPath = path.join(parentPath, dirName)
      await fs.mkdir(dirPath, { recursive: true })
      return dirPath
    } catch (error) {
      console.error('创建目录失败:', error)
      throw error
    }
  }

  /**
   * 删除文件或目录（移动到回收站）
   */
  async deleteFileOrDirectory(targetPath) {
    try {
      // 使用 shell.trashItem 将文件移到回收站而不是直接删除
      await shell.trashItem(targetPath)
      return true
    } catch (error) {
      console.error('移动到回收站失败:', error)
      throw error
    }
  }

  /**
   * 重命名文件或目录
   */
  async rename(oldPath, newName) {
    try {
      const dir = path.dirname(oldPath)
      const newPath = path.join(dir, newName)
      await fs.rename(oldPath, newPath)
      return newPath
    } catch (error) {
      console.error('重命名失败:', error)
      throw error
    }
  }

  /**
   * 获取文件统计信息
   */
  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath)
      return {
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile()
      }
    } catch (error) {
      console.error('获取文件信息失败:', error)
      throw error
    }
  }

  /**
   * 开始监听目录变化
   */
  startWatching(dirPath) {
    // 如果已经在监听相同的路径，不需要重复监听
    if (this.watcher && this.watchedPath === dirPath) {
      console.log('已经在监听该目录:', dirPath)
      return
    }

    // 停止之前的监听
    this.stopWatching()

    try {
      console.log('开始监听目录变化:', dirPath)
      
      // 使用 fs.watch 监听目录变化（递归监听）
      this.watcher = fsSync.watch(dirPath, { recursive: true }, (eventType, filename) => {
        // 忽略临时文件和隐藏文件
        if (filename && (
          filename.startsWith('.') || 
          filename.includes('.tmp') ||
          filename.includes('~') ||
          filename.endsWith('.swp')
        )) {
          return
        }

        console.log(`文件系统变化: ${eventType} - ${filename}`)
        
        // 使用防抖机制，避免频繁触发
        if (this.changeDebounceTimer) {
          clearTimeout(this.changeDebounceTimer)
        }
        
        this.changeDebounceTimer = setTimeout(() => {
          this.notifyFileSystemChanged(eventType, filename)
        }, this.changeDebounceDelay)
      })

      this.watchedPath = dirPath

      // 监听错误
      this.watcher.on('error', (error) => {
        console.error('文件系统监听错误:', error)
        this.stopWatching()
      })

    } catch (error) {
      console.error('启动文件系统监听失败:', error)
    }
  }

  /**
   * 停止监听目录变化
   */
  stopWatching() {
    if (this.watcher) {
      console.log('停止监听目录变化:', this.watchedPath)
      this.watcher.close()
      this.watcher = null
      this.watchedPath = null
    }

    if (this.changeDebounceTimer) {
      clearTimeout(this.changeDebounceTimer)
      this.changeDebounceTimer = null
    }
  }

  /**
   * 通知渲染进程文件系统发生变化
   */
  notifyFileSystemChanged(eventType, filename) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('file-system-changed', {
        eventType,
        filename,
        timestamp: Date.now()
      })
      console.log('已通知渲染进程文件系统变化')
    }
  }

  /**
   * 注册IPC处理器
   */
  registerIpcHandlers(ipcMain) {
    ipcMain.handle('select-directory', async () => {
      return await this.selectDirectory()
    })

    ipcMain.handle('is-valid-directory', async (event, dirPath) => {
      return await this.isValidDirectory(dirPath)
    })

    ipcMain.handle('get-directory-tree', async (event, rootPath) => {
      return await this.getDirectoryTree(rootPath)
    })

    ipcMain.handle('read-file', async (event, filePath) => {
      return await this.readFile(filePath)
    })

    ipcMain.handle('write-file', async (event, filePath, content) => {
      return await this.writeFile(filePath, content)
    })

    ipcMain.handle('create-file', async (event, dirPath, fileName) => {
      return await this.createFile(dirPath, fileName)
    })

    ipcMain.handle('create-directory', async (event, parentPath, dirName) => {
      return await this.createDirectory(parentPath, dirName)
    })

    ipcMain.handle('delete-file-or-directory', async (event, targetPath) => {
      return await this.deleteFileOrDirectory(targetPath)
    })

    ipcMain.handle('rename', async (event, oldPath, newName) => {
      return await this.rename(oldPath, newName)
    })

    ipcMain.handle('get-file-stats', async (event, filePath) => {
      return await this.getFileStats(filePath)
    })
  }

  /**
   * 设置工作区路径并开始监听
   * 这个方法应该从 main.js 中调用
   */
  setWorkspacePath(workspacePath) {
    if (workspacePath) {
      this.startWatching(workspacePath)
    } else {
      this.stopWatching()
    }
  }

  /**
   * 清理资源（应用关闭时调用）
   */
  cleanup() {
    this.stopWatching()
  }
}

module.exports = FileSystemManager

