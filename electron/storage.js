const fs = require('fs').promises
const fsRaw = require('fs')
const path = require('path')
const { app } = require('electron')

/**
 * 键值存储模块
 * 提供应用数据的持久化存储功能
 */
class StorageManager {
  constructor() {
    this.storageDir = null
    this._initStorageDir()
  }

  /**
   * 初始化存储目录
   */
  _initStorageDir() {
    this.storageDir = this._resolveStorageDir()
  }

  /**
   * 确保目录存在（同步）
   */
  _ensureDirSync(dirPath) {
    try {
      if (!fsRaw.existsSync(dirPath)) {
        fsRaw.mkdirSync(dirPath, { recursive: true })
      }
    } catch (e) {
      console.error('创建存储目录失败:', e)
    }
  }

  /**
   * 将键转换为安全的文件名
   */
  _keyToFilename(key) {
    const safe = String(key).replace(/[^a-zA-Z0-9-_\.]/g, '_')
    return `${safe}.json`
  }

  /**
   * 获取键对应的文件路径
   */
  _getKeyFilePath(key) {
    return path.join(this.storageDir, this._keyToFilename(key))
  }

  /**
   * 解析存储目录路径
   */
  _resolveStorageDir() {
    try {
      // 优先使用可执行文件所在目录
      const executableDir = path.dirname(process.execPath)
      const primary = path.join(executableDir, 'app_data')
      this._ensureDirSync(primary)
      
      // 测试写入权限
      const probeFile = path.join(primary, '.writable_probe')
      fsRaw.writeFileSync(probeFile, 'ok')
      fsRaw.unlinkSync(probeFile)
      return primary
    } catch (e) {
      try {
        // 回退到用户数据目录
        const fallback = path.join(app.getPath('userData'), 'app_data')
        this._ensureDirSync(fallback)
        
        const probeFile = path.join(fallback, '.writable_probe')
        fsRaw.writeFileSync(probeFile, 'ok')
        fsRaw.unlinkSync(probeFile)
        return fallback
      } catch (e2) {
        console.error('无法初始化任何存储目录:', e2)
        return null
      }
    }
  }

  /**
   * 获取存储目录路径
   */
  getStorageDir() {
    return this.storageDir
  }

  // ===== 异步API =====

  /**
   * 异步读取键值
   */
  async get(key) {
    try {
      const filePath = this._getKeyFilePath(key)
      const exists = fsRaw.existsSync(filePath)
      if (!exists) return null
      
      const text = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(text)
    } catch (error) {
      console.error('kv-get 失败:', error)
      return null
    }
  }

  /**
   * 异步写入键值
   */
  async set(key, value) {
    try {
      this._ensureDirSync(this.storageDir)
      const filePath = this._getKeyFilePath(key)
      await fs.writeFile(filePath, JSON.stringify(value), 'utf-8')
      return true
    } catch (error) {
      console.error('kv-set 失败:', error)
      throw error
    }
  }

  /**
   * 异步删除键值
   */
  async remove(key) {
    try {
      const filePath = this._getKeyFilePath(key)
      if (fsRaw.existsSync(filePath)) {
        await fs.unlink(filePath)
      }
      return true
    } catch (error) {
      console.error('kv-remove 失败:', error)
      throw error
    }
  }

  // ===== 同步API =====

  /**
   * 同步读取键值
   */
  getSync(key) {
    try {
      const filePath = this._getKeyFilePath(key)
      if (!fsRaw.existsSync(filePath)) {
        return null
      }
      const text = fsRaw.readFileSync(filePath, 'utf-8')
      return JSON.parse(text)
    } catch (error) {
      console.error('kv-get-sync 失败:', error)
      return null
    }
  }

  /**
   * 同步写入键值
   */
  setSync(key, value) {
    try {
      this._ensureDirSync(this.storageDir)
      const filePath = this._getKeyFilePath(key)
      fsRaw.writeFileSync(filePath, JSON.stringify(value), 'utf-8')
      return true
    } catch (error) {
      console.error('kv-set-sync 失败:', error)
      return false
    }
  }

  /**
   * 同步删除键值
   */
  removeSync(key) {
    try {
      const filePath = this._getKeyFilePath(key)
      if (fsRaw.existsSync(filePath)) {
        fsRaw.unlinkSync(filePath)
      }
      return true
    } catch (error) {
      console.error('kv-remove-sync 失败:', error)
      return false
    }
  }

  /**
   * 注册IPC处理器
   */
  registerIpcHandlers(ipcMain) {
    // 初始化存储目录
    ipcMain.handle('init-storage-dir', async () => {
      return this.getStorageDir()
    })

    // 异步API
    ipcMain.handle('kv-get', async (event, key) => {
      return await this.get(key)
    })

    ipcMain.handle('kv-set', async (event, key, value) => {
      return await this.set(key, value)
    })

    ipcMain.handle('kv-remove', async (event, key) => {
      return await this.remove(key)
    })

    // 同步API
    ipcMain.on('kv-get-sync', (event, key) => {
      event.returnValue = this.getSync(key)
    })

    ipcMain.on('kv-set-sync', (event, key, value) => {
      event.returnValue = this.setSync(key, value)
    })

    ipcMain.on('kv-remove-sync', (event, key) => {
      event.returnValue = this.removeSync(key)
    })
  }
}

module.exports = StorageManager

