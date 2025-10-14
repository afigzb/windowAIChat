/**
 * HTML处理工具
 * 提供HTML标准化、清理等通用功能
 */
class HtmlProcessor {
  /**
   * 统一的 HTML 标准化函数
   * 确保 HTML 格式与 Tiptap 编辑器保持一致
   * @param {string} html - 原始HTML内容
   * @returns {string} 标准化后的HTML
   */
  static normalizeHtml(html) {
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
  static sanitizeHtmlForDocx(html) {
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
   * 将内容包装为完整的HTML文档
   * @param {string} content - 内容
   * @param {string} title - 文档标题
   * @returns {string} 完整的HTML文档
   */
  static wrapAsDocument(content, title = 'Document') {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body>
${content}
</body>
</html>`
  }
}

module.exports = HtmlProcessor

