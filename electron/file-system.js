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
   * 移动文件或目录到目标目录
   */
  async movePath(sourcePath, targetDirPath, newName = null) {
    try {
      const sourceStats = await fs.stat(sourcePath)
      const isSourceDirectory = sourceStats.isDirectory()

      // 计算目标路径
      const targetName = newName || path.basename(sourcePath)
      const destinationPath = path.join(targetDirPath, targetName)

      // 如果源路径和目标路径相同，直接返回成功
      // 使用 relative 检查路径是否相同（处理大小写和规范化）
      if (path.relative(sourcePath, destinationPath) === '') {
        return destinationPath
      }

      // 目标存在则报错，避免无提示覆盖
      if (fsSync.existsSync(destinationPath)) {
        throw new Error('目标位置已存在同名项目')
      }

      // 防止将目录移动到其自身或其子目录中
      const normalizedSource = path.resolve(sourcePath)
      const normalizedTargetDir = path.resolve(targetDirPath)
      if (normalizedTargetDir === normalizedSource) {
        throw new Error('不能将项目移动到其自身位置')
      }
      if (isSourceDirectory) {
        const relative = path.relative(normalizedSource, normalizedTargetDir)
        if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
          throw new Error('不能将文件夹移动到其子文件夹中')
        }
      }

      // 执行移动（重命名）
      await fs.rename(sourcePath, destinationPath)
      return destinationPath
    } catch (error) {
      console.error('移动文件/文件夹失败:', error)
      throw error
    }
  }

  /**
   * 递归复制文件或目录
   */
  async copyRecursive(sourcePath, destPath) {
    const stats = await fs.stat(sourcePath)
    
    if (stats.isDirectory()) {
      // 创建目标目录
      await fs.mkdir(destPath, { recursive: true })
      
      // 读取源目录内容
      const entries = await fs.readdir(sourcePath, { withFileTypes: true })
      
      // 递归复制每个条目
      for (const entry of entries) {
        const srcPath = path.join(sourcePath, entry.name)
        const dstPath = path.join(destPath, entry.name)
        await this.copyRecursive(srcPath, dstPath)
      }
    } else {
      // 复制文件
      await fs.copyFile(sourcePath, destPath)
    }
  }

  /**
   * 复制文件或目录到目标目录
   */
  async copyPath(sourcePath, targetDirPath, newName = null) {
    try {
      // 计算目标路径
      const targetName = newName || path.basename(sourcePath)
      const destinationPath = path.join(targetDirPath, targetName)

      // 目标存在则报错，避免无提示覆盖
      if (fsSync.existsSync(destinationPath)) {
        throw new Error('目标位置已存在同名项目')
      }

      // 执行复制
      await this.copyRecursive(sourcePath, destinationPath)
      return destinationPath
    } catch (error) {
      console.error('复制文件/文件夹失败:', error)
      throw error
    }
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
   * 检查文件是否存在
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * 确保目录存在（如果不存在则创建）
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true })
      return true
    } catch (error) {
      console.error('确保目录存在失败:', error)
      throw error
    }
  }

  /**
   * 获取概括缓存文件路径
   */
  getSummaryCachePath(originalFilePath) {
    try {
      const dir = path.dirname(originalFilePath)
      const filename = path.basename(originalFilePath)
      const cacheDir = path.join(dir, 'gaikuo')
      const cacheFileName = `${filename}.gaikuo`
      console.log('概括缓存文件路径:', cacheFileName)
      console.log('概括缓存目录:', dir)
      return {
        cacheDir,
        cachePath: path.join(cacheDir, cacheFileName)
      }
    } catch (error) {
      console.error('获取概括缓存路径失败:', error)
      throw error
    }
  }

  /**
   * 读取概括缓存
   * 注意：只要缓存存在就返回，不检查原文件是否被修改（由用户手动管理）
   */
  async readSummaryCache(originalFilePath) {
    try {
      const { cachePath } = this.getSummaryCachePath(originalFilePath)
      
      // 检查缓存文件是否存在
      const cacheExists = await this.fileExists(cachePath)
      if (!cacheExists) {
        return null
      }

      // 读取缓存内容
      const content = await fs.readFile(cachePath, 'utf-8')
      const cacheStats = await fs.stat(cachePath)
      
      return {
        content,
        cachedAt: cacheStats.mtime
      }
    } catch (error) {
      console.error('读取概括缓存失败:', error)
      return null
    }
  }

  /**
   * 写入概括缓存
   */
  async writeSummaryCache(originalFilePath, summaryContent) {
    try {
      const { cacheDir, cachePath } = this.getSummaryCachePath(originalFilePath)
      
      // 确保缓存目录存在
      await this.ensureDirectory(cacheDir)
      
      // 写入缓存文件
      await fs.writeFile(cachePath, summaryContent, 'utf-8')
      
      return cachePath
    } catch (error) {
      console.error('写入概括缓存失败:', error)
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

    ipcMain.handle('move-path', async (event, sourcePath, targetDirPath, newName) => {
      return await this.movePath(sourcePath, targetDirPath, newName)
    })

    ipcMain.handle('copy-path', async (event, sourcePath, targetDirPath, newName) => {
      return await this.copyPath(sourcePath, targetDirPath, newName)
    })

    ipcMain.handle('get-file-stats', async (event, filePath) => {
      return await this.getFileStats(filePath)
    })

    ipcMain.handle('file-exists', async (event, filePath) => {
      return await this.fileExists(filePath)
    })

    ipcMain.handle('ensure-directory', async (event, dirPath) => {
      return await this.ensureDirectory(dirPath)
    })

    ipcMain.handle('read-summary-cache', async (event, originalFilePath) => {
      return await this.readSummaryCache(originalFilePath)
    })

    ipcMain.handle('write-summary-cache', async (event, originalFilePath, summaryContent) => {
      return await this.writeSummaryCache(originalFilePath, summaryContent)
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

