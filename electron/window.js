const { BrowserWindow, shell } = require('electron')
const path = require('path')

/**
 * 窗口管理模块
 * 负责创建和管理应用主窗口
 */
class WindowManager {
  constructor() {
    this.mainWindow = null
    this.contextMenuManager = null
    this.docxHandler = null
  }

  /**
   * 创建主窗口
   */
  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '../public/app-icon-nebula-256.ico'),
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      autoHideMenuBar: true,
      show: false
    })

    this._loadContent()
    this._setupEventHandlers()
    
    return this.mainWindow
  }

  /**
   * 加载窗口内容
   */
  _loadContent() {
    const isDev = process.env.NODE_ENV === 'development' || !require('electron').app.isPackaged
    
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:5173')
      this.mainWindow.webContents.openDevTools()
    } else {
      const indexHtmlPath = path.join(__dirname, '../build/web/index.html')
      this.mainWindow.loadFile(indexHtmlPath)
    }
  }

  /**
   * 设置事件处理器
   */
  _setupEventHandlers() {
    // 窗口准备显示时显示窗口
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show()
    })

    // 窗口被关闭时清除引用
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })

    // 处理外部链接
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    // 阻止导航到外部URL
    this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      try {
        const parsedUrl = new URL(navigationUrl)
        if (parsedUrl.protocol !== 'file:') {
          event.preventDefault()
        }
      } catch (_) {
        event.preventDefault()
      }
    })

    // 处理右键菜单
    this.mainWindow.webContents.on('context-menu', (event, params) => {
      const { selectionText, isEditable, mediaType } = params
      
      if (mediaType === 'none' && (isEditable || selectionText)) {
        this.contextMenuManager?.showTextEditMenu(params)
      }
    })
  }

  /**
   * 设置上下文菜单管理器
   */
  setContextMenuManager(manager) {
    this.contextMenuManager = manager
  }

  /**
   * 设置DOCX处理器
   */
  setDocxHandler(handler) {
    this.docxHandler = handler
  }

  /**
   * 获取主窗口
   */
  getWindow() {
    return this.mainWindow
  }
}

module.exports = WindowManager

