const ChildWindow = require('./child-window')

/**
 * 子窗口管理器
 * 统一管理所有子窗口实例
 */
class ChildWindowManager {
  /**
   * @param {BrowserWindow} mainWindow - 主窗口引用
   */
  constructor(mainWindow) {
    this.mainWindow = mainWindow
    this.windows = new Map() // id -> ChildWindow
  }

  /**
   * 注册子窗口配置
   * @param {ChildWindowConfig} config - 窗口配置
   * @returns {ChildWindow}
   */
  register(config) {
    if (!config.id) {
      throw new Error('窗口配置必须包含 id 字段')
    }

    if (this.windows.has(config.id)) {
      console.warn(`窗口 ${config.id} 已注册，将覆盖原有配置`)
    }

    const childWindow = new ChildWindow(config, this.mainWindow)
    this.windows.set(config.id, childWindow)
    return childWindow
  }

  /**
   * 创建或显示指定窗口
   * @param {string} windowId - 窗口ID
   * @returns {BrowserWindow|null}
   */
  createOrShow(windowId) {
    const childWindow = this.windows.get(windowId)
    if (!childWindow) {
      console.error(`窗口 ${windowId} 未注册`)
      return null
    }
    return childWindow.createOrShow()
  }

  /**
   * 获取子窗口实例
   * @param {string} windowId - 窗口ID
   * @returns {ChildWindow|null}
   */
  get(windowId) {
    return this.windows.get(windowId) || null
  }

  /**
   * 检查窗口是否打开
   * @param {string} windowId - 窗口ID
   * @returns {boolean}
   */
  isOpen(windowId) {
    const childWindow = this.windows.get(windowId)
    return childWindow ? childWindow.isOpen() : false
  }

  /**
   * 关闭指定窗口
   * @param {string} windowId - 窗口ID
   */
  close(windowId) {
    const childWindow = this.windows.get(windowId)
    if (childWindow) {
      childWindow.close()
    }
  }

  /**
   * 关闭所有子窗口
   */
  closeAll() {
    this.windows.forEach(childWindow => {
      childWindow.close()
    })
  }

  /**
   * 聚焦指定窗口
   * @param {string} windowId - 窗口ID
   */
  focus(windowId) {
    const childWindow = this.windows.get(windowId)
    if (childWindow) {
      childWindow.focus()
    }
  }

  /**
   * 切换窗口置顶状态
   * @param {string} windowId - 窗口ID
   * @returns {boolean} 新的置顶状态
   */
  toggleAlwaysOnTop(windowId) {
    const childWindow = this.windows.get(windowId)
    return childWindow ? childWindow.toggleAlwaysOnTop() : false
  }

  /**
   * 获取窗口置顶状态
   * @param {string} windowId - 窗口ID
   * @returns {boolean}
   */
  getAlwaysOnTop(windowId) {
    const childWindow = this.windows.get(windowId)
    return childWindow ? childWindow.getAlwaysOnTop() : false
  }

  /**
   * 向所有打开的窗口广播消息
   * @param {string} channel - 消息通道
   * @param {...any} args - 消息参数
   */
  broadcast(channel, ...args) {
    // 广播给主窗口
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args)
    }

    // 广播给所有打开的子窗口
    this.windows.forEach(childWindow => {
      if (childWindow.isOpen()) {
        childWindow.sendMessage(channel, ...args)
      }
    })
  }

  /**
   * 向指定窗口发送消息
   * @param {string} windowId - 窗口ID
   * @param {string} channel - 消息通道
   * @param {...any} args - 消息参数
   */
  sendTo(windowId, channel, ...args) {
    const childWindow = this.windows.get(windowId)
    if (childWindow) {
      childWindow.sendMessage(channel, ...args)
    }
  }

  /**
   * 获取所有注册的窗口ID列表
   * @returns {string[]}
   */
  getWindowIds() {
    return Array.from(this.windows.keys())
  }

  /**
   * 获取所有打开的窗口ID列表
   * @returns {string[]}
   */
  getOpenWindowIds() {
    return Array.from(this.windows.entries())
      .filter(([_, childWindow]) => childWindow.isOpen())
      .map(([id, _]) => id)
  }

  /**
   * 注销窗口配置
   * @param {string} windowId - 窗口ID
   */
  unregister(windowId) {
    const childWindow = this.windows.get(windowId)
    if (childWindow) {
      childWindow.close()
      this.windows.delete(windowId)
    }
  }

  /**
   * 清理所有窗口
   */
  cleanup() {
    this.closeAll()
    this.windows.clear()
  }
}

module.exports = ChildWindowManager

