/**
 * 文本压缩工具
 * 提供多种文本压缩策略，用于减少发送到AI API的文本长度
 */

// 导出类型和配置
export type { TextCompressionOptions, CompressionStats } from './types'
export {
  DEFAULT_COMPRESSION_OPTIONS
} from './types'

// 导出压缩器类
export { TextCompressor } from './compressor'

// 导出基础压缩方法（用户可以单独使用）
export {
  removeExtraWhitespace,
  removeFullWidthBrackets,
  removePunctuationSpaces,
  normalizePunctuation,
  removeMarkdownStyling,
  compressTables,
  removeEmojis,
  mergeRepeatedSymbols
} from './basic-compression'

// 便捷函数
import { TextCompressor } from './compressor'
import { DEFAULT_COMPRESSION_OPTIONS } from './types'
import type { TextCompressionOptions } from './types'

/**
 * 创建默认文本压缩器实例
 */
export const defaultTextCompressor = new TextCompressor(DEFAULT_COMPRESSION_OPTIONS)

/**
 * 便捷函数：使用默认设置压缩文本
 * @param text 原始文本
 * @param options 可选的压缩选项
 * @returns 压缩后的文本
 */
export function compressText(text: string, options?: TextCompressionOptions): string {
  if (!options) {
    return defaultTextCompressor.compress(text)
  }
  const compressor = new TextCompressor(options)
  return compressor.compress(text)
}

