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
    this.promptWindow = null
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

  /**
   * 创建提示词功能窗口
   */
  createPromptTemplateWindow() {
    // 如果窗口已存在，则聚焦并返回
    if (this.promptWindow && !this.promptWindow.isDestroyed()) {
      this.promptWindow.focus()
      return this.promptWindow
    }

    this.promptWindow = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 600,
      minHeight: 500,
      // 移除 parent 属性，让窗口可以独立切换层级
      // parent: this.mainWindow,
      modal: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '../public/app-icon-nebula-256.ico'),
      autoHideMenuBar: true,
      title: '提示词功能',
      backgroundColor: '#ffffff',
      show: false // 等待页面加载完成后再显示
    })

    // 加载提示词功能页面，使用 URL 参数区分页面
    const isDev = process.env.NODE_ENV === 'development' || !require('electron').app.isPackaged
    
    if (isDev) {
      // 开发环境：使用Vite开发服务器 + URL 参数
      this.promptWindow.loadURL('http://localhost:5173?page=prompt')
      this.promptWindow.webContents.openDevTools()
    } else {
      // 生产环境：加载构建后的文件 + URL 参数
      const indexHtmlPath = path.join(__dirname, '../build/web/index.html')
      this.promptWindow.loadFile(indexHtmlPath, { search: 'page=prompt' })
    }

    // 窗口准备好后显示
    this.promptWindow.once('ready-to-show', () => {
      this.promptWindow.show()
      // 通知主窗口状态变化
      this._notifyPromptWindowState(true)
    })

    // 窗口关闭时通知主窗口
    this.promptWindow.on('closed', () => {
      this._notifyPromptWindowState(false)
      this.promptWindow = null
    })

    // 处理外部链接
    this.promptWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    // 阻止导航到外部URL
    this.promptWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      try {
        const parsedUrl = new URL(navigationUrl)
        if (parsedUrl.protocol !== 'file:') {
          event.preventDefault()
        }
      } catch (_) {
        event.preventDefault()
      }
    })

    return this.promptWindow
  }

  /**
   * 通知主窗口提示词窗口状态变化
   */
  _notifyPromptWindowState(isOpen) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('prompt-window-state-changed', isOpen)
    }
  }

  /**
   * 检查提示词窗口是否打开
   */
  isPromptWindowOpen() {
    return this.promptWindow && !this.promptWindow.isDestroyed()
  }

  /**
   * 广播提示词卡片更新事件给所有窗口
   */
  broadcastPromptCardsChanged() {
    // 通知主窗口
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('prompt-cards-changed')
    }
    // 通知提示词窗口（如果打开的话）
    if (this.promptWindow && !this.promptWindow.isDestroyed()) {
      this.promptWindow.webContents.send('prompt-cards-changed')
    }
  }
}

module.exports = WindowManager

