const DocxConverter = require('./docx-converter')
const ImageConverter = require('./image-converter')
const TextConverter = require('./text-converter')

/**
 * 文件转换器管理器
 * 负责管理所有文件转换器，并提供统一的接口
 */
class ConverterManager {
  constructor() {
    // 初始化所有转换器
    this.converters = [
      new DocxConverter(),
      new ImageConverter(),
      new TextConverter()
    ]
  }

  /**
   * 根据文件路径获取合适的转换器
   * @param {string} filePath - 文件路径
   * @returns {BaseConverter|null} 转换器实例，如果没有找到则返回null
   */
  getConverter(filePath) {
    return this.converters.find(converter => converter.supports(filePath)) || null
  }

  /**
   * 读取文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<any>} 文件内容
   */
  async readFile(filePath) {
    const converter = this.getConverter(filePath)
    if (!converter) {
      throw new Error(`未找到支持该文件格式的转换器: ${filePath}`)
    }
    return await converter.read(filePath)
  }

  /**
   * 保存文件
   * @param {string} filePath - 文件路径
   * @param {any} content - 内容
   * @returns {Promise<boolean>} 是否成功
   */
  async saveFile(filePath, content) {
    const converter = this.getConverter(filePath)
    if (!converter) {
      throw new Error(`未找到支持该文件格式的转换器: ${filePath}`)
    }
    return await converter.save(filePath, content)
  }

  /**
   * 注册所有转换器的IPC处理程序
   * @param {object} ipcMain - Electron的ipcMain对象
   */
  registerAllIpcHandlers(ipcMain) {
    // 为每个转换器注册其IPC处理程序
    this.converters.forEach(converter => {
      converter.registerIpcHandlers(ipcMain)
    })

    console.log('所有文件转换器IPC处理程序已注册')
  }

  /**
   * 获取所有支持的文件扩展名
   * @returns {string[]} 扩展名数组
   */
  getAllSupportedExtensions() {
    const extensions = new Set()
    this.converters.forEach(converter => {
      converter.getSupportedExtensions().forEach(ext => extensions.add(ext))
    })
    return Array.from(extensions).sort()
  }

  /**
   * 检查是否支持指定的文件
   * @param {string} filePath - 文件路径
   * @returns {boolean} 是否支持
   */
  isSupported(filePath) {
    return this.getConverter(filePath) !== null
  }
}

module.exports = ConverterManager

