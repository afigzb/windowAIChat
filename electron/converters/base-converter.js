/**
 * 文件转换器基类
 * 定义所有转换器的通用接口
 */
class BaseConverter {
  /**
   * 获取转换器支持的文件扩展名
   * @returns {string[]} 支持的扩展名数组
   */
  getSupportedExtensions() {
    throw new Error('子类必须实现 getSupportedExtensions 方法')
  }

  /**
   * 检查是否支持指定的文件
   * @param {string} filePath - 文件路径
   * @returns {boolean} 是否支持
   */
  supports(filePath) {
    const ext = this._getExtension(filePath)
    return this.getSupportedExtensions().includes(ext)
  }

  /**
   * 读取文件内容
   * @param {string} filePath - 文件路径
   * @returns {Promise<any>} 文件内容
   */
  async read(filePath) {
    throw new Error('子类必须实现 read 方法')
  }

  /**
   * 保存内容到文件
   * @param {string} filePath - 文件路径
   * @param {any} content - 要保存的内容
   * @returns {Promise<boolean>} 是否成功
   */
  async save(filePath, content) {
    throw new Error('子类必须实现 save 方法')
  }

  /**
   * 获取文件扩展名
   * @param {string} filePath - 文件路径
   * @returns {string} 扩展名（小写，不含点）
   * @private
   */
  _getExtension(filePath) {
    const ext = filePath.split('.').pop()
    return ext ? ext.toLowerCase() : ''
  }

  /**
   * 注册IPC处理程序
   * @param {object} ipcMain - Electron的ipcMain对象
   */
  registerIpcHandlers(ipcMain) {
    // 子类可以选择性实现
  }
}

module.exports = BaseConverter

