// 字数统计工具函数

/**
 * 从HTML内容中提取纯文本并统计字数
 * @param htmlContent HTML内容
 * @returns 字数统计信息
 */
export interface WordCountResult {
  characters: number // 总字符数（包括空格）
  charactersNoSpaces: number // 不包括空格的字符数
  words: number // 单词数
  paragraphs: number // 段落数
  lines: number // 行数
}

export function countWords(htmlContent: string): WordCountResult {
  if (!htmlContent.trim()) {
    return {
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      paragraphs: 0,
      lines: 0
    }
  }

  // 创建临时DOM元素来提取纯文本
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent
  const textContent = tempDiv.textContent || tempDiv.innerText || ''

  // 计算字符数
  const characters = textContent.length
  const charactersNoSpaces = textContent.replace(/\s/g, '').length

  // 计算单词数（中文按字符计算，英文按单词计算）
  let words = 0
  const chineseRegex = /[\u4e00-\u9fa5]/g
  const chineseMatches = textContent.match(chineseRegex)
  const chineseCount = chineseMatches ? chineseMatches.length : 0

  // 提取非中文文本并按单词分割
  const nonChineseText = textContent.replace(chineseRegex, ' ')
  const englishWords = nonChineseText
    .split(/\s+/)
    .filter(word => word.trim().length > 0 && /[a-zA-Z]/.test(word))
  
  words = chineseCount + englishWords.length

  // 计算段落数（以p标签或换行符分割）
  const paragraphMatches = htmlContent.match(/<p[^>]*>.*?<\/p>/gi)
  const paragraphs = paragraphMatches ? paragraphMatches.length : Math.max(1, textContent.split(/\n\s*\n/).filter(p => p.trim()).length)

  // 计算行数
  const lines = Math.max(1, textContent.split('\n').filter(line => line.trim()).length)

  return {
    characters,
    charactersNoSpaces,
    words,
    paragraphs,
    lines
  }
}

/**
 * 格式化字数统计信息为可读字符串
 * @param wordCount 字数统计结果
 * @returns 格式化的统计信息
 */
export function formatWordCount(wordCount: WordCountResult): string {
  return `${wordCount.words}字 / ${wordCount.characters}字符`
}