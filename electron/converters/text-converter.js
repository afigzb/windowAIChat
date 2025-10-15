const fs = require('fs').promises
const BaseConverter = require('./base-converter')
const HtmlProcessor = require('../utils/html-processor')

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
   * 读取文本文件并转换为HTML格式
   * @param {string} filePath - 文件路径
   * @returns {Promise<string>} HTML格式的文件内容
   */
  async read(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      // 将纯文本转换为HTML格式供编辑器使用
      return this._textToHtml(content)
    } catch (error) {
      console.error('读取文本文件失败:', error)
      throw error
    }
  }

  /**
   * 将纯文本转换为HTML格式
   * 每一行转换为一个<p>标签，空行保留为<p><br></p>
   * @param {string} text - 纯文本内容
   * @returns {string} HTML格式
   * @private
   */
  _textToHtml(text) {
    if (!text || !text.trim()) {
      return '<p><br></p>'
    }
    
    // 检测是否已经是HTML格式
    if (text.trim().startsWith('<') && text.includes('>')) {
      return text
    }
    
    // 按换行符分割，每行对应一个<p>标签
    const lines = text.split('\n')
    
    return lines
      .map(line => {
        // 空行或只有空白的行转换为 <p><br></p>
        // 有内容的行保留内容（转义HTML特殊字符）
        if (!line.trim()) {
          return '<p><br></p>'
        }
        // 转义HTML特殊字符
        const escapedLine = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        return `<p>${escapedLine}</p>`
      })
      .join('')
  }

  /**
   * 保存文本内容到文件
   * @param {string} filePath - 文件路径
   * @param {string} content - 文本内容（可能是HTML格式）
   * @returns {Promise<boolean>} 是否成功
   */
  async save(filePath, content) {
    try {
      // 如果内容是HTML格式，提取纯文本（使用统一的HtmlProcessor）
      let textContent = content
      if (this._isHtmlContent(content)) {
        textContent = HtmlProcessor.extractText(content)
      }
      
      await fs.writeFile(filePath, textContent, 'utf-8')
      return true
    } catch (error) {
      console.error('保存文本文件失败:', error)
      throw error
    }
  }

  /**
   * 检测内容是否为HTML格式
   * @param {string} content - 内容
   * @returns {boolean} 是否为HTML
   * @private
   */
  _isHtmlContent(content) {
    if (!content) return false
    const trimmed = content.trim()
    // 简单检测：如果包含HTML标签则认为是HTML
    return trimmed.startsWith('<') && (trimmed.includes('</p>') || trimmed.includes('</div>') || trimmed.includes('<br'))
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

