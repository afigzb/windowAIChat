const { app, Menu, ipcMain } = require('electron')
const WindowManager = require('./window')
const StorageManager = require('./storage')
const FileSystemManager = require('./file-system')
const GlobalContextMenuManager = require('./GlobalContextMenu')
const { converterManager } = require('./converters')

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
    this.converterManager = converterManager
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

    // 文件转换器（DOCX、图片、文本等）
    this.converterManager.registerAllIpcHandlers(ipcMain)

    // 右键菜单
    this._registerContextMenuHandlers()
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

    // 打开提示词功能窗口
    ipcMain.handle('open-prompt-template-window', async () => {
      if (this.windowManager) {
        this.windowManager.createPromptTemplateWindow()
      }
    })

    // 查询提示词窗口是否打开
    ipcMain.handle('is-prompt-window-open', async () => {
      if (this.windowManager) {
        return this.windowManager.isPromptWindowOpen()
      }
      return false
    })

    // 处理提示词卡片更新通知（窗口间同步）
    ipcMain.on('prompt-cards-changed', () => {
      // 广播给所有窗口
      if (this.windowManager) {
        this.windowManager.broadcastPromptCardsChanged()
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
