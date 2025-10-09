const fs = require('fs').promises
const path = require('path')
const mammoth = require('mammoth')
const HTMLtoDOCX = require('html-to-docx')

/**
 * DOCX处理模块
 * 负责DOCX文件与HTML之间的双向转换
 */
class DocxHandler {
  /**
   * 读取DOCX文件并转换为HTML
   * @param {string} filePath - DOCX文件路径
   * @returns {Promise<string>} HTML内容
   */
  async readDocxAsHtml(filePath) {
    try {
      const stats = await fs.stat(filePath)
      if (stats.size === 0) {
        return '<p></p>'
      }

      const options = {
        styleMap: [
          // 标题样式
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh", 
          "p[style-name='Heading 3'] => h3:fresh",
          // 字符样式
          "b => strong",
          "i => em",
          // 列表样式
          "p:unordered-list(1) => ul > li:fresh",
          "p:ordered-list(1) => ol > li:fresh"
        ],
        ignoreEmptyParagraphs: false
      }

      const result = await mammoth.convertToHtml({ path: filePath }, options)
      
      if (result.messages?.length > 0) {
        console.log('DOCX转换警告:', result.messages)
      }
      
      return this.normalizeHtml(result.value) || '<p></p>'
    } catch (error) {
      console.error('读取DOCX文件失败:', error)
      throw error
    }
  }

  /**
   * 统一的 HTML 标准化函数
   * 确保 HTML 格式与 Tiptap 编辑器保持一致
   * @param {string} html - 原始HTML内容
   * @returns {string} 标准化后的HTML
   */
  normalizeHtml(html) {
    if (!html || !html.trim()) return '<p></p>'
    
    return html
      .trim()
      // 移除表格和列表的内联样式属性
      .replace(/<(table|ul|ol)[^>]*>/gi, '<$1>')
      // 统一空段落格式为 Tiptap 标准：<p><br></p>
      .replace(/<p>&nbsp;<\/p>/gi, '<p><br></p>')
      .replace(/<p>\s*<\/p>/gi, '<p><br></p>')
      // 移除开头和结尾的空段落
      .replace(/^(<p><br><\/p>)+/gi, '')
      .replace(/(<p><br><\/p>)+$/gi, '')
  }

  /**
   * 清理HTML以保存为DOCX
   * 移除编辑器相关属性，转换为 DOCX 兼容格式
   * @param {string} html - 原始HTML内容
   * @returns {string} 清理后的HTML
   */
  sanitizeHtmlForDocx(html) {
    if (!html) return ''
    
    return html
      .trim()
      // 移除样式和脚本标签
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // 移除编辑器特有的属性
      .replace(/\s*class="[^"]*"/gi, '')
      .replace(/\s*contenteditable="[^"]*"/gi, '')
      .replace(/\s*data-[a-z-]+="[^"]*"/gi, '')
      // 清理多余空白
      .replace(/\s+>/g, '>')
      .replace(/>\s+</g, '><')
      // 移除开头和结尾的空段落
      .replace(/^(<p><br><\/p>)+/gi, '')
      .replace(/(<p><br><\/p>)+$/gi, '')
      // 转换空段落为 DOCX 兼容格式：<p>&nbsp;</p>
      .replace(/<p><br><\/p>/gi, '<p>&nbsp;</p>')
  }

  /**
   * 将HTML内容保存为DOCX文件
   * @param {string} filePath - 保存路径
   * @param {string} htmlContent - HTML内容
   * @returns {Promise<boolean>} 是否成功
   */
  async saveHtmlAsDocx(filePath, htmlContent) {
    try {
      const cleanedContent = this.sanitizeHtmlForDocx(htmlContent)
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Document</title>
</head>
<body>
${cleanedContent}
</body>
</html>`
      
      const docxBuffer = await HTMLtoDOCX(fullHtml, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true
      })
      
      await fs.writeFile(filePath, docxBuffer)
      return true
    } catch (error) {
      console.error('保存DOCX文件失败:', error)
      throw error
    }
  }

  /**
   * 读取图片文件并转换为base64格式
   * @param {string} filePath - 图片文件路径
   * @returns {Promise<object>} 图片信息对象
   */
  async readImageAsBase64(filePath) {
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
      const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon',
        '.svg': 'image/svg+xml'
      }
      
      const mimeType = mimeTypes[ext] || 'image/png'
      
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
   * 注册所有DOCX相关的IPC处理程序
   * @param {object} ipcMain - Electron的ipcMain对象
   */
  registerIpcHandlers(ipcMain) {
    // 读取DOCX文件并转换为HTML
    ipcMain.handle('read-docx-as-html', async (event, filePath) => {
      return await this.readDocxAsHtml(filePath)
    })

    // 将HTML内容保存为DOCX文件
    ipcMain.handle('save-html-as-docx', async (event, filePath, htmlContent) => {
      return await this.saveHtmlAsDocx(filePath, htmlContent)
    })

    // 读取图片文件并转换为base64格式
    ipcMain.handle('read-image-as-base64', async (event, filePath) => {
      return await this.readImageAsBase64(filePath)
    })
  }
}

module.exports = DocxHandler
