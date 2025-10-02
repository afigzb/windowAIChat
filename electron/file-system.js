const { dialog } = require('electron')
const fs = require('fs').promises
const path = require('path')

/**
 * 文件系统管理模块
 * 提供文件和目录操作的API
 */
class FileSystemManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow
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
   * 写入文件内容
   */
  async writeFile(filePath, content) {
    try {
      await fs.writeFile(filePath, content, 'utf-8')
      return true
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
   * 删除文件或目录
   */
  async deleteFileOrDirectory(targetPath) {
    try {
      const stats = await fs.stat(targetPath)
      if (stats.isDirectory()) {
        await fs.rmdir(targetPath, { recursive: true })
      } else {
        await fs.unlink(targetPath)
      }
      return true
    } catch (error) {
      console.error('删除失败:', error)
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
}

module.exports = FileSystemManager

