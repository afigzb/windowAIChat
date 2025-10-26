const { BrowserWindow, shell } = require('electron')
const path = require('path')

/**
 * 子窗口配置类型
 * @typedef {Object} ChildWindowConfig
 * @property {string} id - 窗口唯一标识符
 * @property {string} title - 窗口标题
 * @property {number} [width=900] - 窗口宽度
 * @property {number} [height=700] - 窗口高度
 * @property {number} [minWidth=600] - 最小宽度
 * @property {number} [minHeight=500] - 最小高度
 * @property {string} [urlParam] - URL参数（例如：'page=prompt'）
 * @property {string} [route] - 路由路径（例如：'/prompt'）
 * @property {boolean} [modal=false] - 是否为模态窗口
 * @property {string} [backgroundColor='#ffffff'] - 背景色
 * @property {boolean} [resizable=true] - 是否可调整大小
 * @property {Object} [extraOptions] - 额外的 BrowserWindow 选项
 */

/**
 * 通用子窗口类
 * 封装了子窗口的创建、管理和生命周期
 */
class ChildWindow {
  /**
   * @param {ChildWindowConfig} config - 窗口配置
   * @param {BrowserWindow} mainWindow - 主窗口引用
   */
  constructor(config, mainWindow) {
    this.config = {
      width: 900,
      height: 700,
      minWidth: 600,
      minHeight: 500,
      modal: false,
      backgroundColor: '#ffffff',
      resizable: true,
      ...config
    }
    this.mainWindow = mainWindow
    this.window = null
    this.eventHandlers = new Map()
  }

  /**
   * 创建或显示窗口
   * @returns {BrowserWindow}
   */
  createOrShow() {
    // 如果窗口已存在，则恢复并聚焦
    if (this.window && !this.window.isDestroyed()) {
      if (this.window.isMinimized()) {
        this.window.restore()
      }
      this.window.focus()
      return this.window
    }

    // 创建新窗口
    this.window = new BrowserWindow({
      width: this.config.width,
      height: this.config.height,
      minWidth: this.config.minWidth,
      minHeight: this.config.minHeight,
      modal: this.config.modal,
      resizable: this.config.resizable,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '../public/A.ico'),
      autoHideMenuBar: true,
      title: this.config.title,
      backgroundColor: this.config.backgroundColor,
      show: false, // 等待页面加载完成后再显示
      ...this.config.extraOptions
    })

    this._loadContent()
    this._setupEventHandlers()

    return this.window
  }

  /**
   * 加载窗口内容
   * @private
   */
  _loadContent() {
    const isDev = process.env.NODE_ENV === 'development' || !require('electron').app.isPackaged
    
    if (isDev) {
      // 开发环境：使用Vite开发服务器
      let url = 'http://localhost:5173'
      if (this.config.urlParam) {
        url += `?${this.config.urlParam}`
      } else if (this.config.route) {
        url += `#${this.config.route}`
      }
      this.window.loadURL(url)
      this.window.webContents.openDevTools()
    } else {
      // 生产环境：加载构建后的文件
      const indexHtmlPath = path.join(__dirname, '../build/web/index.html')
      const options = {}
      if (this.config.urlParam) {
        options.search = this.config.urlParam
      } else if (this.config.route) {
        options.hash = this.config.route
      }
      this.window.loadFile(indexHtmlPath, options)
    }
  }

  /**
   * 设置事件处理器
   * @private
   */
  _setupEventHandlers() {
    // 窗口准备好后显示
    this.window.once('ready-to-show', () => {
      this.window.show()
      this._notifyMainWindow('state-changed', true)
      this._emitEvent('ready')
    })

    // 窗口关闭时清理
    this.window.on('closed', () => {
      this._notifyMainWindow('state-changed', false)
      this._emitEvent('closed')
      this.window = null
    })

    // 处理外部链接
    this.window.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    // 阻止导航到外部URL
    this.window.webContents.on('will-navigate', (event, navigationUrl) => {
      try {
        const parsedUrl = new URL(navigationUrl)
        if (parsedUrl.protocol !== 'file:') {
          event.preventDefault()
        }
      } catch (_) {
        event.preventDefault()
      }
    })
  }

  /**
   * 通知主窗口状态变化
   * @private
   */
  _notifyMainWindow(eventName, ...args) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      const fullEventName = `${this.config.id}-${eventName}`
      this.mainWindow.webContents.send(fullEventName, ...args)
    }
  }

  /**
   * 触发内部事件
   * @private
   */
  _emitEvent(eventName, ...args) {
    const handlers = this.eventHandlers.get(eventName) || []
    handlers.forEach(handler => handler(...args))
  }

  /**
   * 注册事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 处理函数
   */
  on(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, [])
    }
    this.eventHandlers.get(eventName).push(handler)
  }

  /**
   * 检查窗口是否打开
   * @returns {boolean}
   */
  isOpen() {
    return this.window && !this.window.isDestroyed()
  }

  /**
   * 获取窗口实例
   * @returns {BrowserWindow|null}
   */
  getWindow() {
    return this.window
  }

  /**
   * 聚焦窗口
   */
  focus() {
    if (this.isOpen()) {
      if (this.window.isMinimized()) {
        this.window.restore()
      }
      this.window.focus()
    }
  }

  /**
   * 关闭窗口
   */
  close() {
    if (this.isOpen()) {
      this.window.close()
    }
  }

  /**
   * 切换窗口置顶状态
   * @returns {boolean} 新的置顶状态
   */
  toggleAlwaysOnTop() {
    if (this.isOpen()) {
      const currentState = this.window.isAlwaysOnTop()
      this.window.setAlwaysOnTop(!currentState)
      return !currentState
    }
    return false
  }

  /**
   * 获取窗口置顶状态
   * @returns {boolean}
   */
  getAlwaysOnTop() {
    if (this.isOpen()) {
      return this.window.isAlwaysOnTop()
    }
    return false
  }

  /**
   * 向窗口发送消息
   * @param {string} channel - 消息通道
   * @param {...any} args - 消息参数
   */
  sendMessage(channel, ...args) {
    if (this.isOpen()) {
      this.window.webContents.send(channel, ...args)
    }
  }

  /**
   * 最小化窗口
   */
  minimize() {
    if (this.isOpen()) {
      this.window.minimize()
    }
  }

  /**
   * 最大化/还原窗口
   */
  toggleMaximize() {
    if (this.isOpen()) {
      if (this.window.isMaximized()) {
        this.window.unmaximize()
      } else {
        this.window.maximize()
      }
    }
  }

  /**
   * 检查窗口是否最大化
   * @returns {boolean}
   */
  isMaximized() {
    if (this.isOpen()) {
      return this.window.isMaximized()
    }
    return false
  }
}

module.exports = ChildWindow

