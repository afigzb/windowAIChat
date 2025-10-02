/**
 * 基础文本压缩方法
 * 包含空白处理、标点处理、Markdown格式处理等基础功能
 */

/**
 * 移除多余的空白字符
 * 保留换行符和单个空格
 */
export function removeExtraWhitespace(text: string): string {
  return text
    .split('\n')
    .map(line => {
      // 将连续的空格压缩为单个空格
      return line.replace(/[ \t]+/g, ' ')
    })
    .join('\n')
}

/**
 * 移除全角括号，转换为半角
 * 使用单次遍历和映射表优化性能
 */
const FULLWIDTH_TO_HALFWIDTH_MAP: Record<string, string> = {
  '（': '(', '(': '(',
  '）': ')', ')': ')',
  '【': '[',
  '】': ']',
  '「': '"',
  '」': '"',
  '『': "'",
  '』': "'"
}
const FULLWIDTH_REGEX = /[（(）)【】「」『』]/g

export function removeFullWidthBrackets(text: string): string {
  return text.replace(FULLWIDTH_REGEX, char => FULLWIDTH_TO_HALFWIDTH_MAP[char] || char)
}

/**
 * 移除标点符号后的多余空格
 */
export function removePunctuationSpaces(text: string): string {
  // 移除中文标点后的空格
  let result = text.replace(/([，。！？；：、])\s+/g, '$1')
  
  // 移除英文标点后的多余空格（保留一个空格）
  result = result.replace(/([,.!?;:])\s{2,}/g, '$1 ')
  
  return result
}

/**
 * 规范化标点符号（中文标点转英文标点）
 * 使用单次遍历和映射表优化性能
 */
const PUNCTUATION_MAP: Record<string, string> = {
  '，': ',',
  '。': '.',
  '！': '!',
  '？': '?',
  '；': ';',
  '：': ':',
  '\u201c': "'",  // "
  '\u201d': "'",  // "
  '\u2018': "'",  // '
  '\u2019': "'",  // '
  '、': ','
}
const PUNCTUATION_REGEX = /[，。！？；：""''、]/g

export function normalizePunctuation(text: string): string {
  return text.replace(PUNCTUATION_REGEX, char => PUNCTUATION_MAP[char] || char)
}

/**
 * 移除 Markdown 样式标记
 * 包括：加粗、斜体、标题、列表符号、链接、代码标记等
 * 使用预编译正则表达式优化性能
 */
const MARKDOWN_PATTERNS = [
  { regex: /^#{1,6}\s+/gm, replacement: '' },                      // 标题
  { regex: /\*\*(.+?)\*\*/g, replacement: '$1' },                 // 加粗 **
  { regex: /__(.+?)__/g, replacement: '$1' },                     // 加粗 __
  { regex: /(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, replacement: '$1' },  // 斜体 *
  { regex: /(?<!_)_(?!_)(.+?)_(?!_)/g, replacement: '$1' },       // 斜体 _
  { regex: /~~(.+?)~~/g, replacement: '$1' },                     // 删除线
  { regex: /`([^`]+)`/g, replacement: '$1' },                     // 行内代码
  { regex: /\[([^\]]+)\]\([^)]+\)/g, replacement: '$1' },         // 链接
  { regex: /!\[([^\]]*)\]\([^)]+\)/g, replacement: '$1' },        // 图片
  { regex: /^[\s]*[-*+]\s+/gm, replacement: '' },                 // 无序列表
  { regex: /^[\s]*\d+\.\s+/gm, replacement: '' },                 // 有序列表
  { regex: /^>\s+/gm, replacement: '' },                          // 引用
  { regex: /^[-*_]{3,}$/gm, replacement: '' }                     // 水平线
]

export function removeMarkdownStyling(text: string): string {
  let result = text
  for (const { regex, replacement } of MARKDOWN_PATTERNS) {
    result = result.replace(regex, replacement)
  }
  return result
}

/**
 * 合并连续的重复符号
 * 例如：！！！！→！，？？？→？，。。。→。
 * 使用预编译正则表达式优化性能
 */
const REPEATED_SYMBOLS_PATTERNS = [
  { regex: /！{2,}/g, replacement: '！' },
  { regex: /!{2,}/g, replacement: '!' },
  { regex: /？{2,}/g, replacement: '？' },
  { regex: /\?{2,}/g, replacement: '?' },
  { regex: /。{2,}/g, replacement: '。' },
  { regex: /\.{3,}/g, replacement: '...' },
  { regex: /，{2,}/g, replacement: '，' },
  { regex: /,{2,}/g, replacement: ',' },
  { regex: /；{2,}/g, replacement: '；' },
  { regex: /;{2,}/g, replacement: ';' },
  { regex: /：{2,}/g, replacement: '：' },
  { regex: /:{2,}/g, replacement: ':' },
  { regex: /-{4,}/g, replacement: '---' },
  { regex: /~{2,}/g, replacement: '~' }
]

export function mergeRepeatedSymbols(text: string): string {
  let result = text
  for (const { regex, replacement } of REPEATED_SYMBOLS_PATTERNS) {
    result = result.replace(regex, replacement)
  }
  return result
}

/**
 * 压缩表格为紧凑格式
 */
export function compressTables(text: string): string {
  // 匹配Markdown表格
  return text.replace(/(\|.+\|)\n(\|[\s:-]+\|)\n((?:\|.+\|\n?)+)/g, (match) => {
    // 移除表格单元格内的多余空格
    return match.replace(/\|\s+/g, '|').replace(/\s+\|/g, '|')
  })
}

/**
 * 移除Emoji表情
 * 移除各种Emoji表情符号，这些符号对AI理解文本没有实际帮助，反而占用token
 */
export function removeEmojis(text: string): string {
  // 移除各种Emoji表情符号
  return text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '')
}


