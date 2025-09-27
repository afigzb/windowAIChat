// 字数统计工具函数
import type { WordCountResult } from '../types'

export type { WordCountResult }

/**
 * 从HTML内容中提取纯文本并统计字数
 * @param htmlContent HTML内容
 * @returns 字数统计信息
 */

export function countWords(htmlContent: string): WordCountResult {
  if (!htmlContent.trim()) {
    return {
      characters: 0,
      words: 0
    }
  }

  // 创建临时DOM元素来提取纯文本
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent
  const textContent = tempDiv.textContent || tempDiv.innerText || ''

  // 计算字符数
  const characters = textContent.length

  // 计算单词数（中文按字符计算，英文按单词计算）
  const chineseRegex = /[\u4e00-\u9fa5]/g
  const chineseMatches = textContent.match(chineseRegex)
  const chineseCount = chineseMatches ? chineseMatches.length : 0

  // 提取非中文文本并按单词分割
  const nonChineseText = textContent.replace(chineseRegex, ' ')
  const englishWords = nonChineseText
    .split(/\s+/)
    .filter(word => word.trim().length > 0 && /[a-zA-Z]/.test(word))
  
  const words = chineseCount + englishWords.length

  return {
    characters,
    words
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
