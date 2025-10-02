/**
 * 文本压缩选项接口
 */
export interface TextCompressionOptions {
  // ===== 基础空白处理 =====
  /** 移除多余空白字符 */
  removeExtraWhitespace?: boolean
  /** 压缩连续换行（保留最多n个连续换行） */
  compressNewlines?: number
  /** 移除行首行尾空格 */
  trimLines?: boolean
  /** 移除空行 */
  removeEmptyLines?: boolean
  
  // ===== Markdown/格式处理 =====
  /** 移除所有 Markdown 样式标记 */
  removeMarkdownStyling?: boolean
  /** 压缩表格为紧凑格式 */
  compressTables?: boolean
  
  // ===== 标点和符号处理 =====
  /** 移除标点符号后的多余空格 */
  removePunctuationSpaces?: boolean
  /** 移除全角括号，替换为半角 */
  removeFullWidthBrackets?: boolean
  /** 规范化标点符号（统一使用英文标点） */
  normalizePunctuation?: boolean
  /** 合并连续的重复符号（如：！！！！→！，？？？→？） */
  mergeRepeatedSymbols?: boolean
  
  // ===== 特殊内容处理 =====
  /** 移除Emoji表情（如😀🎉等表情符号，AI理解不需要这些装饰） */
  removeEmojis?: boolean
}

/**
 * 默认压缩选项
 */
export const DEFAULT_COMPRESSION_OPTIONS: TextCompressionOptions = {
  // 基础空白处理
  removeExtraWhitespace: true,
  compressNewlines: 1,
  trimLines: true,
  removeEmptyLines: false,
  
  // Markdown/格式处理
  removeMarkdownStyling: true,
  compressTables: false,
  
  // 标点和符号处理
  removePunctuationSpaces: true,
  removeFullWidthBrackets: true,
  normalizePunctuation: false,
  mergeRepeatedSymbols: false,
  
  // 特殊内容处理
  removeEmojis: false
}

/**
 * 压缩统计信息
 */
export interface CompressionStats {
  /** 原始文本大小（字符数） */
  originalSize: number
  /** 压缩后文本大小（字符数） */
  compressedSize: number
  /** 节省的字符数 */
  savedBytes: number
  /** 压缩率（百分比） */
  compressionRatio: string
}

