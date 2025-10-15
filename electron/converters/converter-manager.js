const DocxConverter = require('./docx-converter')
const ImageConverter = require('./image-converter')
const TextConverter = require('./text-converter')
const HtmlProcessor = require('../utils/html-processor')

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

  /**
   * 获取所有支持的文件格式信息（按类型分类）
   * @returns {Object} 文件格式信息
   */
  getSupportedFormatsInfo() {
    const info = {
      documents: [],
      images: [],
      texts: [],
      all: []
    }

    this.converters.forEach(converter => {
      const extensions = converter.getSupportedExtensions()
      const typeName = converter.constructor.name

      if (typeName === 'DocxConverter') {
        info.documents.push(...extensions)
      } else if (typeName === 'ImageConverter') {
        info.images.push(...extensions)
      } else if (typeName === 'TextConverter') {
        info.texts.push(...extensions)
      }

      info.all.push(...extensions)
    })

    return info
  }

  /**
   * 获取文件格式信息
   * @param {string} filePath - 文件路径
   * @returns {Object} 文件格式信息
   */
  getFileFormatInfo(filePath) {
    const converter = this.getConverter(filePath)
    
    if (!converter) {
      // 检查是否是明确不支持的二进制格式
      const unsupportedFormats = [
        'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz',
        'exe', 'msi', 'dmg', 'deb', 'rpm', 'app',
        'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma',
        'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm',
        'pdf', 'xls', 'xlsx', 'ppt', 'pptx',
        'bin', 'dat', 'db', 'sqlite', 'dll', 'so', 'dylib'
      ]

      const ext = this._getExtension(filePath)
      const isUnsupported = unsupportedFormats.includes(ext)

      return {
        isSupported: false,
        reason: isUnsupported 
          ? `不支持的二进制文件格式: .${ext}` 
          : '未找到支持该文件格式的转换器',
        extension: ext,
        type: 'unsupported'
      }
    }

    const typeName = converter.constructor.name
    let type = 'text'
    if (typeName === 'DocxConverter') type = 'document'
    else if (typeName === 'ImageConverter') type = 'image'
    else if (typeName === 'TextConverter') type = 'text'

    return {
      isSupported: true,
      type,
      extension: this._getExtension(filePath),
      converterName: typeName
    }
  }

  /**
   * 统一的文件读取接口（自动选择合适的转换器）
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 读取结果
   */
  async readFileAuto(filePath) {
    const formatInfo = this.getFileFormatInfo(filePath)
    
    if (!formatInfo.isSupported) {
      return {
        success: false,
        error: formatInfo.reason,
        supportedFormats: this.getAllSupportedExtensions()
      }
    }

    try {
      const content = await this.readFile(filePath)
      return {
        success: true,
        content,
        type: formatInfo.type,
        extension: formatInfo.extension
      }
    } catch (error) {
      console.error('读取文件失败:', error)
      return {
        success: false,
        error: `读取文件失败: ${error.message}`
      }
    }
  }

  /**
   * 统一的文件保存接口（自动选择合适的转换器）
   * @param {string} filePath - 文件路径
   * @param {any} content - 文件内容
   * @returns {Promise<Object>} 保存结果
   */
  async saveFileAuto(filePath, content) {
    const formatInfo = this.getFileFormatInfo(filePath)
    
    if (!formatInfo.isSupported) {
      return {
        success: false,
        error: formatInfo.reason
      }
    }

    try {
      await this.saveFile(filePath, content)
      return {
        success: true
      }
    } catch (error) {
      console.error('保存文件失败:', error)
      return {
        success: false,
        error: `保存文件失败: ${error.message}`
      }
    }
  }

  /**
   * 读取文件并直接返回纯文本（用于AI对话等场景）
   * 避免前端重复实现HTML到文本的转换
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 读取结果
   */
  async readFileAsText(filePath) {
    const formatInfo = this.getFileFormatInfo(filePath)
    
    if (!formatInfo.isSupported) {
      return {
        success: false,
        error: formatInfo.reason,
        supportedFormats: this.getAllSupportedExtensions()
      }
    }

    try {
      const content = await this.readFile(filePath)
      
      // 根据文件类型处理
      if (formatInfo.type === 'image') {
        // 图片类型：返回图片信息描述
        const fileName = filePath.split(/[/\\]/).pop() || filePath
        const sizeKB = Math.round(content.size / 1024)
        const textDescription = `[图片文件: ${fileName}]\n类型: ${content.mimeType}\n大小: ${sizeKB} KB`
        
        return {
          success: true,
          content: textDescription,
          type: 'image',
          extension: formatInfo.extension
        }
      } else {
        // 文档/文本类型：提取纯文本（统一使用HtmlProcessor）
        const textContent = HtmlProcessor.extractText(content)
        
        return {
          success: true,
          content: textContent,
          type: formatInfo.type,
          extension: formatInfo.extension
        }
      }
    } catch (error) {
      console.error('读取文件失败:', error)
      return {
        success: false,
        error: `读取文件失败: ${error.message}`
      }
    }
  }

  /**
   * 获取文件扩展名（内部方法）
   * @param {string} filePath - 文件路径
   * @returns {string} 扩展名（小写，不含点）
   * @private
   */
  _getExtension(filePath) {
    const ext = filePath.split('.').pop()
    return ext ? ext.toLowerCase() : ''
  }
}

module.exports = ConverterManager

