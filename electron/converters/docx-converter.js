const fs = require('fs').promises
const mammoth = require('mammoth')
const HTMLtoDOCX = require('html-to-docx')
const BaseConverter = require('./base-converter')
const HtmlProcessor = require('../utils/html-processor')

/**
 * DOCX文件转换器
 * 负责DOCX文件与HTML之间的双向转换
 */
class DocxConverter extends BaseConverter {
  getSupportedExtensions() {
    return ['docx', 'doc']
  }

  /**
   * 读取DOCX文件并转换为HTML
   * @param {string} filePath - DOCX文件路径
   * @returns {Promise<string>} HTML内容
   */
  async read(filePath) {
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
      
      return HtmlProcessor.normalizeHtml(result.value) || '<p></p>'
    } catch (error) {
      console.error('读取DOCX文件失败:', error)
      throw error
    }
  }

  /**
   * 将HTML内容保存为DOCX文件
   * @param {string} filePath - 保存路径
   * @param {string} htmlContent - HTML内容
   * @returns {Promise<boolean>} 是否成功
   */
  async save(filePath, htmlContent) {
    try {
      const cleanedContent = HtmlProcessor.sanitizeHtmlForDocx(htmlContent)
      const fullHtml = HtmlProcessor.wrapAsDocument(cleanedContent)
      
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
   * 注册IPC处理程序
   * @param {object} ipcMain - Electron的ipcMain对象
   */
  registerIpcHandlers(ipcMain) {
    // 读取DOCX文件并转换为HTML
    ipcMain.handle('read-docx-as-html', async (event, filePath) => {
      return await this.read(filePath)
    })

    // 将HTML内容保存为DOCX文件
    ipcMain.handle('save-html-as-docx', async (event, filePath, htmlContent) => {
      return await this.save(filePath, htmlContent)
    })
  }
}

module.exports = DocxConverter

