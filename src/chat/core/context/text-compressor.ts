/**
 * 文本压缩工具
 * 提供常见的文本压缩策略，用于减少发送到AI API的文本长度
 */

export interface TextCompressionOptions {
  /** 移除多余空白字符 */
  removeExtraWhitespace?: boolean
  /** 压缩连续换行（保留最多n个连续换行） */
  compressNewlines?: number
  /** 移除行首行尾空格 */
  trimLines?: boolean
  /** 移除空行 */
  removeEmptyLines?: boolean
  /** 压缩代码块中的空白 */
  compressCodeBlocks?: boolean
  /** 移除所有 Markdown 样式标记 */
  removeMarkdownStyling?: boolean
  /** 移除标点符号后的多余空格 */
  removePunctuationSpaces?: boolean
  /** 移除全角括号，替换为半角或删除 */
  removeFullWidthBrackets?: boolean
}

/**
 * 默认压缩选项
 */
export const DEFAULT_COMPRESSION_OPTIONS: TextCompressionOptions = {
  removeExtraWhitespace: true,
  compressNewlines: 1, // 段落之间最多保留1个换行
  trimLines: true,
  removeEmptyLines: false,
  compressCodeBlocks: false,
  removeMarkdownStyling: true,
  removePunctuationSpaces: true,
  removeFullWidthBrackets: true
}

/**
 * 文本压缩器类
 */
export class TextCompressor {
  private options: Required<TextCompressionOptions>

  constructor(options: TextCompressionOptions = {}) {
    this.options = {
      removeExtraWhitespace: options.removeExtraWhitespace ?? DEFAULT_COMPRESSION_OPTIONS.removeExtraWhitespace!,
      compressNewlines: options.compressNewlines ?? DEFAULT_COMPRESSION_OPTIONS.compressNewlines!,
      trimLines: options.trimLines ?? DEFAULT_COMPRESSION_OPTIONS.trimLines!,
      removeEmptyLines: options.removeEmptyLines ?? DEFAULT_COMPRESSION_OPTIONS.removeEmptyLines!,
      compressCodeBlocks: options.compressCodeBlocks ?? DEFAULT_COMPRESSION_OPTIONS.compressCodeBlocks!,
      removeMarkdownStyling: options.removeMarkdownStyling ?? DEFAULT_COMPRESSION_OPTIONS.removeMarkdownStyling!,
      removePunctuationSpaces: options.removePunctuationSpaces ?? DEFAULT_COMPRESSION_OPTIONS.removePunctuationSpaces!,
      removeFullWidthBrackets: options.removeFullWidthBrackets ?? DEFAULT_COMPRESSION_OPTIONS.removeFullWidthBrackets!
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

    // 1. 移除 Markdown 样式标记（在其他处理之前）
    if (this.options.removeMarkdownStyling) {
      result = this.removeMarkdownStyling(result)
    }

    // 2. 移除全角括号
    if (this.options.removeFullWidthBrackets) {
      result = this.removeFullWidthBrackets(result)
    }

    // 3. 移除行首行尾空格（包括缩进）
    if (this.options.trimLines) {
      result = result.split('\n').map(line => line.trim()).join('\n')
    }

    // 4. 移除多余空白字符（保留单个空格）
    if (this.options.removeExtraWhitespace) {
      result = this.removeExtraWhitespace(result)
    }

    // 5. 移除标点后的多余空格
    if (this.options.removePunctuationSpaces) {
      result = this.removePunctuationSpaces(result)
    }

    // 6. 压缩连续换行
    if (this.options.compressNewlines > 0) {
      const maxNewlines = this.options.compressNewlines
      const pattern = new RegExp(`\n{${maxNewlines + 1},}`, 'g')
      result = result.replace(pattern, '\n'.repeat(maxNewlines))
    }

    // 7. 移除空行
    if (this.options.removeEmptyLines) {
      result = result.split('\n').filter(line => line.trim().length > 0).join('\n')
    }

    // 8. 压缩代码块中的空白（可选）
    if (this.options.compressCodeBlocks) {
      result = this.compressCodeBlocks(result)
    }

    return result.trim()
  }

  /**
   * 移除多余的空白字符
   * 保留换行符和单个空格
   */
  private removeExtraWhitespace(text: string): string {
    return text
      .split('\n')
      .map(line => {
        // 将连续的空格压缩为单个空格
        return line.replace(/[ \t]+/g, ' ')
      })
      .join('\n')
  }

  /**
   * 压缩代码块中的空白
   * 识别 Markdown 代码块并压缩其中的空白
   */
  private compressCodeBlocks(text: string): string {
    // 匹配 Markdown 代码块 ```...```
    const codeBlockPattern = /```[\s\S]*?```/g
    
    return text.replace(codeBlockPattern, (codeBlock) => {
      // 分离代码块标记和内容
      const lines = codeBlock.split('\n')
      if (lines.length < 3) return codeBlock
      
      const header = lines[0] // ```language
      const footer = lines[lines.length - 1] // ```
      const codeLines = lines.slice(1, -1)
      
      // 压缩代码内容
      const compressedCode = codeLines
        .map(line => line.trimEnd()) // 移除行尾空格
        .filter(line => line.length > 0 || !this.options.removeEmptyLines) // 可选：移除空行
        .join('\n')
      
      return `${header}\n${compressedCode}\n${footer}`
    })
  }

  /**
   * 移除 Markdown 样式标记
   * 包括：加粗、斜体、标题、列表符号、链接、代码标记等
   */
  private removeMarkdownStyling(text: string): string {
    let result = text

    // 移除标题符号 (# ## ### 等)
    result = result.replace(/^#{1,6}\s+/gm, '')

    // 移除加粗 **text** 或 __text__
    result = result.replace(/\*\*(.+?)\*\*/g, '$1')
    result = result.replace(/__(.+?)__/g, '$1')

    // 移除斜体 *text* 或 _text_ (需要避免误删列表符号)
    result = result.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '$1')
    result = result.replace(/(?<!_)_(?!_)(.+?)_(?!_)/g, '$1')

    // 移除删除线 ~~text~~
    result = result.replace(/~~(.+?)~~/g, '$1')

    // 移除行内代码 `code`
    result = result.replace(/`([^`]+)`/g, '$1')

    // 移除链接 [text](url) 保留文本
    result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

    // 移除图片 ![alt](url)
    result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')

    // 移除列表符号 (-, *, +, 数字.)
    result = result.replace(/^[\s]*[-*+]\s+/gm, '')
    result = result.replace(/^[\s]*\d+\.\s+/gm, '')

    // 移除引用符号 >
    result = result.replace(/^>\s+/gm, '')

    // 移除水平线 (---, ***, ___)
    result = result.replace(/^[-*_]{3,}$/gm, '')

    return result
  }

  /**
   * 移除全角括号
   */
  private removeFullWidthBrackets(text: string): string {
    return text
      .replace(/[（(]/g, '(')  // 全角左括号转半角
      .replace(/[）)]/g, ')')  // 全角右括号转半角
      .replace(/【/g, '[')     // 全角左方括号转半角
      .replace(/】/g, ']')     // 全角右方括号转半角
      .replace(/「/g, '"')     // 全角引号
      .replace(/」/g, '"')
      .replace(/『/g, "'")
      .replace(/』/g, "'")
  }

  /**
   * 移除标点符号后的多余空格
   */
  private removePunctuationSpaces(text: string): string {
    // 移除中文标点后的空格
    let result = text.replace(/([，。！？；：、])\s+/g, '$1')
    
    // 移除英文标点后的多余空格（保留一个空格）
    result = result.replace(/([,.!?;:])\s{2,}/g, '$1 ')
    
    return result
  }

  /**
   * 获取压缩率统计
   * @param original 原始文本
   * @param compressed 压缩后的文本
   * @returns 压缩统计信息
   */
  static getCompressionStats(original: string, compressed: string) {
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

/**
 * 创建默认文本压缩器实例
 */
export const defaultTextCompressor = new TextCompressor(DEFAULT_COMPRESSION_OPTIONS)

/**
 * 便捷函数：使用默认设置压缩文本
 * @param text 原始文本
 * @returns 压缩后的文本
 */
export function compressText(text: string, options?: TextCompressionOptions): string {
  if (!options) {
    return defaultTextCompressor.compress(text)
  }
  const compressor = new TextCompressor(options)
  return compressor.compress(text)
}

