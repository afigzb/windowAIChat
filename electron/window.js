const { BrowserWindow, shell } = require('electron')
const path = require('path')
const ChildWindowManager = require('./child-window-manager')

/**
 * 窗口管理模块
 * 负责创建和管理应用主窗口和子窗口
 */
class WindowManager {
  constructor() {
    this.mainWindow = null
    this.contextMenuManager = null
    this.childWindowManager = null
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
      icon: path.join(__dirname, '../public/A.ico'),
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      autoHideMenuBar: true,
      show: false
    })

    this._loadContent()
    this._setupEventHandlers()
    this._initializeChildWindows()
    
    return this.mainWindow
  }

  /**
   * 初始化子窗口管理器并注册所有子窗口配置
   * @private
   */
  _initializeChildWindows() {
    this.childWindowManager = new ChildWindowManager(this.mainWindow)

    // 注册提示词功能窗口
    this.childWindowManager.register({
      id: 'prompt-window',
      title: '提示词功能',
      width: 900,
      height: 700,
      minWidth: 0,
      minHeight: 0,
      urlParam: 'page=prompt',
      modal: false,
      backgroundColor: '#ffffff'
    })

    // 注册空白文本编辑器窗口
    this.childWindowManager.register({
      id: 'text-editor-window',
      title: '空白文本',
      width: 800,
      height: 600,
      minWidth: 0,
      minHeight: 0,
      urlParam: 'page=text-editor',
      modal: false,
      backgroundColor: '#ffffff'
    })

    // 未来可以在这里注册更多子窗口
    // this.childWindowManager.register({
    //   id: 'settings-window',
    //   title: '设置',
    //   width: 800,
    //   height: 600,
    //   urlParam: 'page=settings'
    // })
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
   * 获取主窗口
   */
  getWindow() {
    return this.mainWindow
  }

  /**
   * 获取子窗口管理器
   * @returns {ChildWindowManager|null}
   */
  getChildWindowManager() {
    return this.childWindowManager
  }
}

module.exports = WindowManager

