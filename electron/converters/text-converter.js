const fs = require('fs').promises
const BaseConverter = require('./base-converter')

/**
 * 文本文件转换器
 * 负责读取和保存纯文本文件
 */
class TextConverter extends BaseConverter {
  getSupportedExtensions() {
    // 支持常见的文本格式
    return [
      'txt', 'md', 'markdown',
      'json', 'xml', 'yaml', 'yml',
      'html', 'htm', 'css', 'scss', 'sass', 'less',
      'js', 'jsx', 'ts', 'tsx', 'vue',
      'py', 'java', 'c', 'cpp', 'h', 'hpp',
      'go', 'rs', 'rb', 'php',
      'sh', 'bash', 'zsh',
      'sql', 'csv',
      'ini', 'conf', 'config',
      'log'
    ]
  }

  /**
   * 读取文本文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<string>} 文件内容
   */
  async read(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return content
    } catch (error) {
      console.error('读取文本文件失败:', error)
      throw error
    }
  }

  /**
   * 保存文本内容到文件
   * @param {string} filePath - 文件路径
   * @param {string} content - 文本内容
   * @returns {Promise<boolean>} 是否成功
   */
  async save(filePath, content) {
    try {
      await fs.writeFile(filePath, content, 'utf-8')
      return true
    } catch (error) {
      console.error('保存文本文件失败:', error)
      throw error
    }
  }

  /**
   * 注册IPC处理程序
   * @param {object} ipcMain - Electron的ipcMain对象
   */
  registerIpcHandlers(ipcMain) {
    // 文本文件使用通用的 readFile 接口
    // 不需要单独的IPC处理程序
  }
}

module.exports = TextConverter

