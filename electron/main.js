const { app, Menu, ipcMain, shell } = require('electron')
const WindowManager = require('./window')
const StorageManager = require('./storage')
const FileSystemManager = require('./file-system')
const GlobalContextMenuManager = require('./GlobalContextMenu')
const fileConverter = require('./converters')
const path = require('path')
const fs = require('fs')

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
    this.mainWindow = null
  }

  /**
   * 初始化应用
   */
  async initialize() {
    // 创建主窗口
    this.mainWindow = this.windowManager.createWindow()

    // 初始化文件系统管理器
    this.fileSystemManager = new FileSystemManager(this.mainWindow)

    // 初始化上下文菜单管理器
    this.contextMenuManager = new GlobalContextMenuManager(this.mainWindow)
    this.windowManager.setContextMenuManager(this.contextMenuManager)

    // 注册所有IPC处理器
    this._registerIpcHandlers()

    // 移除顶部菜单栏
    Menu.setApplicationMenu(null)

    // 处理启动时的命令行参数（拖拽到图标打开的文件）
    this._handleStartupFiles()
  }

  /**
   * 处理启动时通过拖拽打开的文件
   */
  _handleStartupFiles() {
    // 获取命令行参数中的文件路径
    // process.argv[0] 是 electron 可执行文件
    // process.argv[1] 是 main.js
    // process.argv[2] 开始才是用户拖拽的文件
    const filePaths = this._extractFilePathsFromArgs(process.argv)
    
    if (filePaths.length > 0) {
      // 延迟发送，确保渲染进程已经准备好接收
      setTimeout(() => {
        this._sendDroppedFilesToRenderer(filePaths)
      }, 1000)
    }
  }

  /**
   * 从命令行参数中提取文件路径
   */
  _extractFilePathsFromArgs(argv) {
    // 跳过前两个参数（electron 和 main.js）
    const args = process.env.NODE_ENV === 'development' ? argv.slice(2) : argv.slice(1)
    
    return args.filter(arg => {
      // 过滤掉非文件路径的参数（例如 --开头的选项）
      if (arg.startsWith('--') || arg.startsWith('-')) {
        return false
      }
      
      // 检查路径是否存在
      try {
        return fs.existsSync(arg)
      } catch (error) {
        return false
      }
    }).map(filePath => {
      // 转换为绝对路径
      return path.resolve(filePath)
    })
  }

  /**
   * 将拖拽的文件路径发送到渲染进程
   */
  _sendDroppedFilesToRenderer(filePaths) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('files-dropped-on-app-icon', filePaths)
    }
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

    // 用系统默认程序打开文件
    ipcMain.handle('file:openWithDefault', async (event, filePath) => {
      try {
        const result = await shell.openPath(filePath)
        if (result) {
          // result是错误信息字符串
          return { success: false, error: result }
        }
        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
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

    ipcMain.handle('show-multiple-files-context-menu', async (event, filePaths) => {
      if (this.contextMenuManager) {
        this.contextMenuManager.showMultipleFilesMenu(filePaths)
      }
    })

    ipcMain.handle('delete-multiple-files', async (event, filePaths) => {
      if (this.contextMenuManager) {
        await this.contextMenuManager.deleteMultipleFiles(filePaths)
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

// 单实例锁：确保只有一个应用实例在运行
// 在Windows中，当文件拖到已运行的应用图标上时，会触发 second-instance 事件
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // 如果获取锁失败，说明已有实例在运行，直接退出
  app.quit()
} else {
  // 监听第二个实例启动（比如拖拽文件到图标）
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 如果用户尝试打开第二个实例，聚焦主窗口
    if (application.mainWindow) {
      if (application.mainWindow.isMinimized()) {
        application.mainWindow.restore()
      }
      application.mainWindow.focus()
      
      // 处理新拖拽的文件
      const filePaths = application._extractFilePathsFromArgs(commandLine)
      if (filePaths.length > 0) {
        application._sendDroppedFilesToRenderer(filePaths)
      }
    }
  })

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
}

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
