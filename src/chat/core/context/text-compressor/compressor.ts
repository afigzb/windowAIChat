/**
 * 文本压缩器主类
 */

import type { TextCompressionOptions, CompressionStats } from './types'
import { DEFAULT_COMPRESSION_OPTIONS } from './types'
import * as Basic from './basic-compression'

/**
 * 文本压缩器类
 */
export class TextCompressor {
  private options: Required<TextCompressionOptions>

  constructor(options: TextCompressionOptions = {}) {
    this.options = {
      // 基础空白处理
      removeExtraWhitespace: options.removeExtraWhitespace ?? DEFAULT_COMPRESSION_OPTIONS.removeExtraWhitespace!,
      compressNewlines: options.compressNewlines ?? DEFAULT_COMPRESSION_OPTIONS.compressNewlines!,
      trimLines: options.trimLines ?? DEFAULT_COMPRESSION_OPTIONS.trimLines!,
      removeEmptyLines: options.removeEmptyLines ?? DEFAULT_COMPRESSION_OPTIONS.removeEmptyLines!,
      
      // Markdown/格式处理
      removeMarkdownStyling: options.removeMarkdownStyling ?? DEFAULT_COMPRESSION_OPTIONS.removeMarkdownStyling!,
      compressTables: options.compressTables ?? DEFAULT_COMPRESSION_OPTIONS.compressTables!,
      
      // 标点和符号处理
      removePunctuationSpaces: options.removePunctuationSpaces ?? DEFAULT_COMPRESSION_OPTIONS.removePunctuationSpaces!,
      removeFullWidthBrackets: options.removeFullWidthBrackets ?? DEFAULT_COMPRESSION_OPTIONS.removeFullWidthBrackets!,
      normalizePunctuation: options.normalizePunctuation ?? DEFAULT_COMPRESSION_OPTIONS.normalizePunctuation!,
      mergeRepeatedSymbols: options.mergeRepeatedSymbols ?? DEFAULT_COMPRESSION_OPTIONS.mergeRepeatedSymbols!,
      
      // 特殊内容处理
      removeEmojis: options.removeEmojis ?? DEFAULT_COMPRESSION_OPTIONS.removeEmojis!
    }
  }

  /**
   * 压缩文本
   * @param text 原始文本
   * @returns 压缩后的文本
   */
  compress(text: string): string {
    if (!text) return text

    let result = text

    // ===== 阶段1: 预处理 - 移除和转换内容 =====
    
    // 移除Emoji
    if (this.options.removeEmojis) {
      result = Basic.removeEmojis(result)
    }

    // ===== 阶段2: Markdown和格式处理 =====
    
    // 压缩表格
    if (this.options.compressTables) {
      result = Basic.compressTables(result)
    }

    // 移除Markdown样式标记
    if (this.options.removeMarkdownStyling) {
      result = Basic.removeMarkdownStyling(result)
    }

    // ===== 阶段3: 符号和标点处理 =====
    
    // 移除全角括号
    if (this.options.removeFullWidthBrackets) {
      result = Basic.removeFullWidthBrackets(result)
    }

    // 规范化标点
    if (this.options.normalizePunctuation) {
      result = Basic.normalizePunctuation(result)
    }

    // 合并重复符号
    if (this.options.mergeRepeatedSymbols) {
      result = Basic.mergeRepeatedSymbols(result)
    }

    // ===== 阶段4: 空白处理 =====
    
    // 移除行首行尾空格
    if (this.options.trimLines) {
      result = result.split('\n').map(line => line.trim()).join('\n')
    }

    // 移除多余空白字符
    if (this.options.removeExtraWhitespace) {
      result = Basic.removeExtraWhitespace(result)
    }

    // 移除标点后的多余空格
    if (this.options.removePunctuationSpaces) {
      result = Basic.removePunctuationSpaces(result)
    }

    // 压缩连续换行
    if (this.options.compressNewlines !== undefined && this.options.compressNewlines >= 0) {
      const maxNewlines = this.options.compressNewlines
      if (maxNewlines === 0) {
        result = result.replace(/\n+/g, ' ')
      } else {
        const pattern = new RegExp(`\n{${maxNewlines + 1},}`, 'g')
        result = result.replace(pattern, '\n'.repeat(maxNewlines))
      }
    }

    // 移除空行
    if (this.options.removeEmptyLines) {
      result = result.split('\n').filter(line => line.trim().length > 0).join('\n')
    }

    return result.trim()
  }

  /**
   * 获取压缩率统计
   * @param original 原始文本
   * @param compressed 压缩后的文本
   * @returns 压缩统计信息
   */
  static getCompressionStats(original: string, compressed: string): CompressionStats {
    const originalSize = original.length
    const compressedSize = compressed.length
    const savedBytes = originalSize - compressedSize
    const compressionRatio = originalSize > 0 ? (savedBytes / originalSize) * 100 : 0

    return {
      originalSize,
      compressedSize,
      savedBytes,
      compressionRatio: compressionRatio.toFixed(2) + '%'
    }
  }
}

