const { app, Menu, ipcMain } = require('electron')
const WindowManager = require('./window')
const StorageManager = require('./storage')
const FileSystemManager = require('./file-system')
const GlobalContextMenuManager = require('./GlobalContextMenu')
const fileConverter = require('./converters')

/**
 * 应用主入口
 * 负责整合各个模块并管理应用生命周期
 */
class Application {
  constructor() {
    this.windowManager = new WindowManager()
    this.storageManager = new StorageManager()
    this.fileSystemManager = null
    this.contextMenuManager = null
    this.fileConverter = fileConverter
  }

  /**
   * 初始化应用
   */
  async initialize() {
    // 创建主窗口
    const mainWindow = this.windowManager.createWindow()

    // 初始化文件系统管理器
    this.fileSystemManager = new FileSystemManager(mainWindow)

    // 初始化上下文菜单管理器
    this.contextMenuManager = new GlobalContextMenuManager(mainWindow)
    this.windowManager.setContextMenuManager(this.contextMenuManager)

    // 注册所有IPC处理器
    this._registerIpcHandlers()

    // 移除顶部菜单栏
    Menu.setApplicationMenu(null)
  }

  /**
   * 注册所有IPC处理器
   */
  _registerIpcHandlers() {
    // 存储管理
    this.storageManager.registerIpcHandlers(ipcMain)

    // 文件系统管理
    this.fileSystemManager.registerIpcHandlers(ipcMain)

    // 文件转换API
    this._registerFileConverterHandlers()

    // 右键菜单
    this._registerContextMenuHandlers()
  }

  /**
   * 注册文件转换API处理器
   * 简化的三个核心接口：read / save / getInfo
   */
  _registerFileConverterHandlers() {
    // 读取文件
    ipcMain.handle('file:read', async (event, filePath) => {
      return await this.fileConverter.readFile(filePath)
    })

    // 保存文件
    ipcMain.handle('file:save', async (event, filePath, content) => {
      return await this.fileConverter.saveFile(filePath, content)
    })

    // 读取文件为纯文本
    ipcMain.handle('file:readAsText', async (event, filePath) => {
      return await this.fileConverter.readFileAsText(filePath)
    })

    // 获取文件信息
    ipcMain.handle('file:getInfo', async (event, filePath) => {
      return this.fileConverter.getFileInfo(filePath)
    })

    // 获取支持的格式信息
    ipcMain.handle('file:getSupportedFormats', async () => {
      return this.fileConverter.getSupportedFormatsInfo()
    })

    // 从HTML提取纯文本
    ipcMain.handle('file:extractText', async (event, html) => {
      return this.fileConverter.extractTextFromHtml(html)
    })
  }

  /**
   * 注册右键菜单相关的IPC处理器
   */
  _registerContextMenuHandlers() {
    ipcMain.handle('set-workspace-path', async (event, workspacePath) => {
      if (this.contextMenuManager) {
        this.contextMenuManager.setWorkspacePath(workspacePath)
      }
      // 同时设置文件系统监听
      if (this.fileSystemManager) {
        this.fileSystemManager.setWorkspacePath(workspacePath)
      }
    })

    ipcMain.handle('show-file-context-menu', async (event, fileInfo) => {
      if (this.contextMenuManager) {
        this.contextMenuManager.showFileMenu(fileInfo)
      }
    })

    ipcMain.handle('show-directory-context-menu', async (event, dirPath) => {
      if (this.contextMenuManager) {
        this.contextMenuManager.showDirectoryMenu(dirPath)
      }
    })

    // ========== 通用子窗口管理 IPC ==========

    // 获取子窗口管理器的辅助函数
    const getChildWindowManager = () => {
      return this.windowManager?.getChildWindowManager()
    }

    // 打开指定子窗口
    ipcMain.handle('open-child-window', async (event, windowId) => {
      const manager = getChildWindowManager()
      if (manager) {
        manager.createOrShow(windowId)
      }
    })

    // 查询子窗口是否打开
    ipcMain.handle('is-child-window-open', async (event, windowId) => {
      const manager = getChildWindowManager()
      return manager ? manager.isOpen(windowId) : false
    })

    // 关闭指定子窗口
    ipcMain.handle('close-child-window', async (event, windowId) => {
      const manager = getChildWindowManager()
      if (manager) {
        manager.close(windowId)
      }
    })

    // 聚焦指定子窗口
    ipcMain.handle('focus-child-window', async (event, windowId) => {
      const manager = getChildWindowManager()
      if (manager) {
        manager.focus(windowId)
      }
    })

    // 切换子窗口置顶状态
    ipcMain.handle('toggle-child-window-always-on-top', async (event, windowId) => {
      const manager = getChildWindowManager()
      return manager ? manager.toggleAlwaysOnTop(windowId) : false
    })

    // 获取子窗口置顶状态
    ipcMain.handle('get-child-window-always-on-top', async (event, windowId) => {
      const manager = getChildWindowManager()
      return manager ? manager.getAlwaysOnTop(windowId) : false
    })

    // ========== 业务专用 IPC ==========

    // 处理提示词卡片更新通知（窗口间同步）
    // 使用通用的 broadcast 方法，业务逻辑与窗口管理解耦
    ipcMain.on('prompt-cards-changed', () => {
      const manager = getChildWindowManager()
      if (manager) {
        manager.broadcast('prompt-cards-changed')
      }
    })
  }
}

// 创建应用实例
const application = new Application()

// 当Electron完成初始化并准备创建浏览器窗口时调用
app.whenReady().then(() => {
  application.initialize()

  app.on('activate', () => {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，重新创建窗口
    if (require('electron').BrowserWindow.getAllWindows().length === 0) {
      application.initialize()
    }
  })
})

// 当所有窗口都被关闭时退出应用
app.on('window-all-closed', () => {
  // 清理文件系统监听器
  if (application.fileSystemManager) {
    application.fileSystemManager.cleanup()
  }
  
  // 在macOS上，应用程序通常保持活动状态直到用户明确退出
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 在应用退出前清理资源
app.on('before-quit', () => {
  if (application.fileSystemManager) {
    application.fileSystemManager.cleanup()
  }
})
