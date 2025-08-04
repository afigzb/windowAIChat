// 文件类型检测工具

export interface FileTypeInfo {
  isSupported: boolean // 是否支持编辑
  isSafeToRead: boolean // 是否安全读取（不会卡顿）
  readMethod: 'html' | 'text' | 'image' | 'none' // 读取方式
  reason?: string // 不支持的原因
}

// 明确支持的文档格式
const DOCUMENT_FORMATS = new Set([
  'docx', 'doc'
])

// 支持的图片格式
const IMAGE_FORMATS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'ico', 'svg'
])

// 明确的二进制
const UNSAFE_FORMATS = new Set([
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz',
  'exe', 'msi', 'dmg', 'deb', 'rpm', 'app',
  'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma',
  'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm',
  'pdf', 'xls', 'xlsx', 'ppt', 'pptx',
  'bin', 'dat', 'db', 'sqlite', 'dll', 'so', 'dylib','TTF'
])

/**
 * 检测文件类型并确定如何处理
 * @param filePath 文件路径
 * @returns 文件类型信息
 */
export function detectFileType(filePath: string): FileTypeInfo {
  const fileName = filePath.toLowerCase()
  const lastDotIndex = fileName.lastIndexOf('.')
  
  // 获取文件扩展名，如果没有扩展名则为空字符串
  const extension = lastDotIndex >= 0 ? fileName.slice(lastDotIndex + 1) : ''
  
  // 1. 检查是否是文档格式（需要特殊处理）
  if (extension && DOCUMENT_FORMATS.has(extension)) {
    return {
      isSupported: true,
      isSafeToRead: true,
      readMethod: 'html'
    }
  }
  
  // 2. 检查是否是图片格式
  if (extension && IMAGE_FORMATS.has(extension)) {
    return {
      isSupported: true,
      isSafeToRead: true,
      readMethod: 'image'
    }
  }
  
  // 3. 检查是否是明确的二进制/危险格式
  if (extension && UNSAFE_FORMATS.has(extension)) {
    return {
      isSupported: false,
      isSafeToRead: false,
      readMethod: 'none',
      reason: `不支持的二进制文件格式: .${extension}`
    }
  }
  
  // 4. 其他情况都尝试作为文本读取
  // 包括：常见文本格式、配置文件、代码文件、无扩展名文件等
  return {
    isSupported: true,
    isSafeToRead: true,
    readMethod: 'text'
  }
}

/**
 * 获取支持的文件格式列表（用于显示给用户）
 */
export function getSupportedFormats(): string[] {
  return [
    // 文档格式
    'docx', 'doc',
    // 图片格式
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'ico', 'svg',
    // 常见文本格式
    'txt', 'md', 'html', 'css', 'js', 'ts', 'json', 'xml',
    // 其他文本格式（除了明确的二进制格式外都支持）
    '以及其他非二进制格式'
  ]
}

/**
 * 检查文件是否可能包含中文内容
 * @param fileName 文件名
 * @returns 是否可能包含中文
 */
export function mayContainChinese(fileName: string): boolean {
  // 检查文件名是否包含中文字符
  return /[\u4e00-\u9fa5]/.test(fileName)
}

/**
 * 获取文件的安全性级别描述
 * @param filePath 文件路径
 * @returns 安全性描述
 */
export function getFileSafetyInfo(filePath: string): string {
  const fileTypeInfo = detectFileType(filePath)
  
  if (!fileTypeInfo.isSupported) {
    return '不支持：' + (fileTypeInfo.reason || '二进制文件')
  }
  
  if (fileTypeInfo.readMethod === 'html') {
    return '支持：Office文档格式'
  }
  
  if (fileTypeInfo.readMethod === 'image') {
    return '支持：图片格式'
  }
  
  if (fileTypeInfo.readMethod === 'text') {
    return '支持：文本格式'
  }
  
  return '未知状态'
}
