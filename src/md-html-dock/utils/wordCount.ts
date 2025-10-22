/**
 * 字数统计工具 - 重构版
 * 
 * 使用前端DOM API提取文本，避免不必要的IPC调用
 */

import type { WordCountResult } from '../types'

export type { WordCountResult }

/**
 * 从HTML内容中提取纯文本
 * 使用浏览器原生DOM API，比IPC调用更高效
 */
function extractTextFromHtml(htmlContent: string): string {
  if (!htmlContent || !htmlContent.trim()) {
    return ''
  }
  
  try {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = htmlContent
    return tempDiv.textContent || tempDiv.innerText || ''
  } catch (error) {
    console.error('提取文本失败:', error)
    return ''
  }
}

/**
 * 从HTML内容中统计字数
 */
export async function countWords(htmlContent: string): Promise<WordCountResult> {
  const textContent = extractTextFromHtml(htmlContent)
  
  if (!textContent.trim()) {
    return {
      characters: 0,
      words: 0
    }
  }

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
 */
export function formatWordCount(wordCount: WordCountResult): string {
  return `${wordCount.words}字 / ${wordCount.characters}字符`
}
