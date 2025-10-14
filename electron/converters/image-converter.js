const fs = require('fs').promises
const path = require('path')
const BaseConverter = require('./base-converter')

/**
 * 图片文件转换器
 * 负责读取图片文件并转换为base64格式
 */
class ImageConverter extends BaseConverter {
  getSupportedExtensions() {
    return ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'ico', 'svg']
  }

  /**
   * MIME类型映射表
   */
  static MIME_TYPES = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
  }

  /**
   * 读取图片文件并转换为base64格式
   * @param {string} filePath - 图片文件路径
   * @returns {Promise<object>} 图片信息对象
   */
  async read(filePath) {
    try {
      // 检查文件是否存在
      const stats = await fs.stat(filePath)
      if (stats.size === 0) {
        throw new Error('图片文件为空')
      }

      // 读取文件为buffer
      const buffer = await fs.readFile(filePath)
      
      // 获取文件扩展名来确定MIME类型
      const ext = path.extname(filePath).toLowerCase()
      const mimeType = ImageConverter.MIME_TYPES[ext] || 'image/png'
      
      // 转换为base64格式
      const base64Data = buffer.toString('base64')
      const dataUrl = `data:${mimeType};base64,${base64Data}`
      
      return {
        dataUrl,
        mimeType,
        size: stats.size,
        extension: ext
      }
    } catch (error) {
      console.error('读取图片文件失败:', error)
      throw error
    }
  }

  /**
   * 图片不支持保存功能
   */
  async save(filePath, content) {
    throw new Error('图片转换器不支持保存功能')
  }

  /**
   * 注册IPC处理程序
   * @param {object} ipcMain - Electron的ipcMain对象
   */
  registerIpcHandlers(ipcMain) {
    // 读取图片文件并转换为base64格式
    ipcMain.handle('read-image-as-base64', async (event, filePath) => {
      return await this.read(filePath)
    })
  }
}

module.exports = ImageConverter

