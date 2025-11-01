/**
 * 文件转换器集合 - 简化版
 * 移除过度的OOP抽象，使用简单的函数映射
 * 
 * 架构原则：
 * 1. 后端只负责：文件IO + 基础格式转换（如DOCX→HTML）
 * 2. 后端不做HTML标准化（这是前端编辑器的职责）
 * 3. 每个converter只是一组纯函数，不需要类继承
 */

const fs = require('fs').promises
const path = require('path')
const mammoth = require('mammoth')
const HTMLtoDOCX = require('html-to-docx')

// ==================== DOCX 转换器 ====================

/**
 * 读取DOCX文件并转换为HTML
 * 注意：返回的是原始HTML，不做任何标准化处理
 */
async function readDocx(filePath) {
  const stats = await fs.stat(filePath)
  if (stats.size === 0) {
    return '<p></p>'
  }

  const options = {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "b => strong",
      "i => em",
      "p:unordered-list(1) => ul > li:fresh",
      "p:ordered-list(1) => ol > li:fresh"
    ],
    ignoreEmptyParagraphs: false
  }

  const result = await mammoth.convertToHtml({ path: filePath }, options)
  
  if (result.messages?.length > 0) {
    console.log('DOCX转换警告:', result.messages)
  }
  
  let html = result.value || '<p></p>'
  
  // 只清理开头的编辑器标记和空段落（保留用户主动创建的空行）
  html = html
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '<p></p>')  // 统一 trailing break 为空段落
    .replace(/^(\s*<p>\s*<\/p>\s*)+/, '')  // 只移除开头的空段落
  
  // 如果清理后为空，返回一个空段落
  return html.trim() || '<p></p>'
}

/**
 * 将HTML内容保存为DOCX文件
 * 只做最基础的清理，确保能正确保存
 */
async function saveDocx(filePath, htmlContent) {
  // 基础清理：移除编辑器特有属性
  let cleaned = htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\s*class="[^"]*"/gi, '')
    .replace(/\s*contenteditable="[^"]*"/gi, '')
    .replace(/\s*data-[a-z-]+="[^"]*"/gi, '')
  
  // 只清理开头的空段落和带 br 的空段落（编辑器的 trailing break）
  cleaned = cleaned
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '<p></p>')  // 先把 <p><br></p> 转为 <p></p>
    .replace(/^(\s*<p>\s*<\/p>\s*)+/, '')  // 只移除开头的空段落

  // 包装为完整HTML文档
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Document</title>
</head>
<body>
${cleaned}
</body>
</html>`
  
  const docxBuffer = await HTMLtoDOCX(fullHtml, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true
  })
  
  await fs.writeFile(filePath, docxBuffer)
}

// ==================== 文本文件转换器 ====================

/**
 * 读取文本文件并转换为HTML
 * 化繁为简：每行一个段落，空行保留为空段落
 */
async function readText(filePath) {
  const content = await fs.readFile(filePath, 'utf-8')
  
  if (!content) {
    return '<p></p>'
  }

  // 将每行转换为HTML段落，不trim（保持原样）
  const lines = content.split(/\r?\n/)
  const htmlLines = lines.map(line => {
    if (!line) {
      return '<p></p>'
    }
    // 转义HTML特殊字符
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    return `<p>${escaped}</p>`
  })

  let html = htmlLines.join('')
  
  // 只清理开头的编辑器标记（保留用户的空行）
  html = html
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '<p></p>')
    .replace(/^(\s*<p>\s*<\/p>\s*)+/, '')
  
  return html || '<p></p>'
}

/**
 * 将HTML内容保存为文本文件
 * 化繁为简：反向转换，每个段落一行
 */
async function saveText(filePath, htmlContent) {
  // 简单直接的转换：段落 -> 行
  const text = htmlContent
    // 先处理 </p> 为换行
    .replace(/<\/p>/gi, '\n')
    // 处理 <br> 为换行
    .replace(/<br\s*\/?>/gi, '\n')
    // 移除所有HTML标签
    .replace(/<[^>]+>/g, '')
    // 解码HTML实体（必须按顺序，&amp; 最后）
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    // 只移除开头的空行（保留用户的空行）
    .replace(/^\n+/, '')
    // 移除结尾多余的换行
    .replace(/\n+$/, '')
  
  await fs.writeFile(filePath, text, 'utf-8')
}

/**
 * 从HTML中提取纯文本
 * 用于AI对话等场景
 */
function extractTextFromHtml(html) {
  if (!html || !html.trim()) {
    return ''
  }
  
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .join('\n')
}

// ==================== 图片转换器 ====================

/**
 * 读取图片文件
 * 返回base64编码的数据
 */
async function readImage(filePath) {
  const buffer = await fs.readFile(filePath)
  const ext = path.extname(filePath).toLowerCase().slice(1)
  
  // 映射文件扩展名到MIME类型
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml'
  }
  
  const mimeType = mimeTypes[ext] || 'image/png'
  const base64 = buffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`
  
  return {
    dataUrl,
    mimeType,
    size: buffer.length,
    extension: ext
  }
}

// 图片不支持保存功能
// 如果需要保存图片，应该使用文件系统的writeFile

// ==================== 转换器注册表 ====================

/**
 * 文件扩展名到转换器的映射
 * 简单的对象映射，不需要复杂的类继承
 */
const CONVERTER_REGISTRY = {
  // 文档类型
  'docx': { type: 'document', read: readDocx, save: saveDocx },
  'doc': { type: 'document', read: readDocx, save: saveDocx },
  
  // 文本类型
  'txt': { type: 'text', read: readText, save: saveText },
  'md': { type: 'text', read: readText, save: saveText },
  'markdown': { type: 'text', read: readText, save: saveText },
  'log': { type: 'text', read: readText, save: saveText },
  'gaikuo': { type: 'text', read: readText, save: saveText },
  'json': { type: 'text', read: readText, save: saveText },
  'xml': { type: 'text', read: readText, save: saveText },
  'csv': { type: 'text', read: readText, save: saveText },
  'html': { type: 'text', read: readText, save: saveText },
  'css': { type: 'text', read: readText, save: saveText },
  'js': { type: 'text', read: readText, save: saveText },
  'ts': { type: 'text', read: readText, save: saveText },
  'jsx': { type: 'text', read: readText, save: saveText },
  'tsx': { type: 'text', read: readText, save: saveText },
  'py': { type: 'text', read: readText, save: saveText },
  'java': { type: 'text', read: readText, save: saveText },
  'c': { type: 'text', read: readText, save: saveText },
  'cpp': { type: 'text', read: readText, save: saveText },
  'h': { type: 'text', read: readText, save: saveText },
  'go': { type: 'text', read: readText, save: saveText },
  'rs': { type: 'text', read: readText, save: saveText },
  'php': { type: 'text', read: readText, save: saveText },
  'rb': { type: 'text', read: readText, save: saveText },
  'sh': { type: 'text', read: readText, save: saveText },
  'bat': { type: 'text', read: readText, save: saveText },
  'yml': { type: 'text', read: readText, save: saveText },
  'yaml': { type: 'text', read: readText, save: saveText },
  
  // 图片类型
  'jpg': { type: 'image', read: readImage, save: null },
  'jpeg': { type: 'image', read: readImage, save: null },
  'png': { type: 'image', read: readImage, save: null },
  'gif': { type: 'image', read: readImage, save: null },
  'bmp': { type: 'image', read: readImage, save: null },
  'webp': { type: 'image', read: readImage, save: null },
  'svg': { type: 'image', read: readImage, save: null }
}

/**
 * 获取文件扩展名
 */
function getExtension(filePath) {
  const ext = filePath.split('.').pop()
  return ext ? ext.toLowerCase() : ''
}

/**
 * 获取转换器
 */
function getConverter(filePath) {
  const ext = getExtension(filePath)
  return CONVERTER_REGISTRY[ext] || null
}

/**
 * 获取所有支持的扩展名
 */
function getAllSupportedExtensions() {
  return Object.keys(CONVERTER_REGISTRY).sort()
}

/**
 * 获取文件信息
 */
function getFileInfo(filePath) {
  const ext = getExtension(filePath)
  const converter = CONVERTER_REGISTRY[ext]
  
  if (!converter) {
    return {
      supported: false,
      type: 'unsupported',
      extension: ext
    }
  }
  
  return {
    supported: true,
    type: converter.type,
    extension: ext,
    canSave: converter.save !== null
  }
}

module.exports = {
  getConverter,
  getFileInfo,
  getAllSupportedExtensions,
  extractTextFromHtml
}

