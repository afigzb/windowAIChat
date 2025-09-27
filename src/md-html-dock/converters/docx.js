const fs = require('fs').promises
const path = require('path')
const mammoth = require('mammoth')
const HTMLtoDOCX = require('html-to-docx')

/**
 * DOCX处理模块
 * 支持基础样式的DOCX文件读取、转换和保存功能
 */
class DocxHandler {
  /**
   * 读取DOCX文件并转换为HTML
   * @param {string} filePath - DOCX文件路径
   * @returns {Promise<string>} HTML内容
   */
  async readDocxAsHtml(filePath) {
    try {
      // 检查文件是否为空
      const stats = await fs.stat(filePath)
      if (stats.size === 0) {
        return '<p></p>'
      }

      // 配置mammoth选项 - 只支持基础样式
      const options = {
        // 基础样式映射
        styleMap: [
          // 基本标题样式
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh", 
          "p[style-name='Heading 3'] => h3:fresh",
          
          // 基本字符样式
          "b => strong",
          "i => em",
          
          // 基本列表样式
          "p:unordered-list(1) => ul > li:fresh",
          "p:ordered-list(1) => ol > li:fresh"
        ],
        
        // 保留空段落
        ignoreEmptyParagraphs: false
      }

      const result = await mammoth.convertToHtml({ path: filePath }, options)
      let htmlContent = result.value
      
      // 输出警告信息（如果有的话）
      if (result.messages && result.messages.length > 0) {
        console.log('DOCX转换警告:', result.messages)
      }
      
      // 简单的HTML后处理
      htmlContent = this.postProcessHtml(htmlContent)
      
      // 如果内容为空，返回空段落
      return htmlContent || '<p></p>'
    } catch (error) {
      console.error('读取DOCX文件失败:', error)
      throw error
    }
  }

  /**
   * HTML后处理函数，添加基础样式支持
   * @param {string} html - 原始HTML内容
   * @returns {string} 处理后的HTML内容
   */
  postProcessHtml(html) {
    // 包裹统一主题类，便于在渲染层应用一致样式
    return `<div class="content-theme">${html}</div>`
  }


  /**
   * 清理HTML内容以用于DOCX保存
   * @param {string} html - 原始HTML内容
   * @returns {string} 清理后的HTML内容
   */
  sanitizeHtmlForDocx(html) {
    if (!html) return ''
    // 去除样式标签
    return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  }

  /**
   * 将HTML内容保存为DOCX文件
   * @param {string} filePath - 保存路径
   * @param {string} htmlContent - HTML内容
   * @returns {Promise<boolean>} 是否成功
   */
  async saveHtmlAsDocx(filePath, htmlContent) {
    try {
      // 清理HTML内容
      const cleanedHtmlContent = this.sanitizeHtmlForDocx(htmlContent)

      // 创建基本的HTML文档结构
      const fullHtml = `
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Document</title>
          </head>
          <body>
            ${cleanedHtmlContent}
          </body>
        </html>
      `
      
      // 转换HTML为DOCX
      const docxBuffer = await HTMLtoDOCX(fullHtml, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      })
      
      // 保存文件
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
