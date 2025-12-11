/**
 * 文件转换API - 简化版
 * 统一的文件读取/保存接口，移除所有冗余抽象
 */

const { 
  getConverter, 
  getFileInfo, 
  getAllSupportedExtensions,
  extractTextFromHtml 
} = require('./file-converters')

/**
 * 读取文件
 * @param {string} filePath - 文件路径
 * @returns {Promise<{success: boolean, content?: any, type?: string, extension?: string, error?: string}>}
 */
async function readFile(filePath) {
  try {
    const fileInfo = getFileInfo(filePath)
    
    if (!fileInfo.supported) {
      return {
        success: false,
        error: `不支持的文件格式: .${fileInfo.extension}`,
        supportedFormats: getAllSupportedExtensions()
      }
    }

    const converter = getConverter(filePath)
    const content = await converter.read(filePath)
    
    return {
      success: true,
      content,
      type: fileInfo.type,
      extension: fileInfo.extension
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
 * 保存文件
 * @param {string} filePath - 文件路径
 * @param {any} content - 文件内容
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function saveFile(filePath, content) {
  try {
    const fileInfo = getFileInfo(filePath)
    
    if (!fileInfo.supported) {
      return {
        success: false,
        error: `不支持的文件格式: .${fileInfo.extension}`
      }
    }

    if (!fileInfo.canSave) {
      return {
        success: false,
        error: `该文件类型不支持保存: .${fileInfo.extension}`
      }
    }

    const converter = getConverter(filePath)
    await converter.save(filePath, content)
    
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
 * 读取文件为纯文本
 * 用于AI对话等场景
 */
async function readFileAsText(filePath) {
  try {
    const result = await readFile(filePath)
    
    if (!result.success) {
      return result
    }

    let textContent = ''
    
    if (result.type === 'image') {
      // 图片返回描述信息
      const fileName = filePath.split(/[/\\]/).pop() || filePath
      const sizeKB = Math.round(result.content.size / 1024)
      textContent = `[图片文件: ${fileName}]\n类型: ${result.content.mimeType}\n大小: ${sizeKB} KB`
    } else if (result.type === 'excel') {
      // Excel文件已经是纯文本格式
      textContent = result.content
    } else {
      // 文档和文本提取纯文本
      textContent = extractTextFromHtml(result.content)
    }
    
    return {
      success: true,
      content: textContent,
      type: result.type,
      extension: result.extension
    }
  } catch (error) {
    return {
      success: false,
      error: `读取文件失败: ${error.message}`
    }
  }
}

/**
 * 获取所有支持的文件格式信息
 */
function getSupportedFormatsInfo() {
  const extensions = getAllSupportedExtensions()
  const info = {
    documents: [],
    images: [],
    texts: [],
    all: extensions
  }

  extensions.forEach(ext => {
    const fileInfo = getFileInfo(`dummy.${ext}`)
    if (fileInfo.supported) {
      if (fileInfo.type === 'document') {
        info.documents.push(ext)
      } else if (fileInfo.type === 'image') {
        info.images.push(ext)
      } else if (fileInfo.type === 'text') {
        info.texts.push(ext)
      }
    }
  })

  return info
}

module.exports = {
  // 核心API
  readFile,
  saveFile,
  readFileAsText,
  
  // 信息查询
  getFileInfo,
  getSupportedFormatsInfo,
  
  // 文本提取
  extractTextFromHtml
}
