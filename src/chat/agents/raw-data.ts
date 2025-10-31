/**
 * 原始数据仓库
 * 
 * 提供统一的数据读取和写入接口
 */

import type {
  RawData,
  DataSource,
  CompositeDataSource,
  OutputTarget
} from './types'

// 导出类型
export type { RawData } from './types'

// ============================================================
// 创建原始数据仓库
// ============================================================

/**
 * 创建原始数据仓库
 */
export function createRawData(
  userInput: string,
  attachedFiles: string[] = [],
  conversationHistory: import('../types').FlatMessage[] = []
): RawData {
  return {
    userInput,
    goal: userInput, // 初始 goal 等于 userInput
    attachedFiles: [...attachedFiles],
    conversationHistory: [...conversationHistory],
    customData: new Map()
  }
}

// ============================================================
// 数据读取
// ============================================================

/**
 * 从原始数据仓库读取单个数据源
 */
export function readDataSource(
  source: DataSource,
  rawData: Readonly<RawData>
): string {
  switch (source.type) {
    case 'user-input':
      return rawData.userInput
    
    case 'goal':
      return rawData.goal
    
    case 'file': {
      const index = source.index ?? 0
      return rawData.attachedFiles[index] || ''
    }
    
    case 'all-files':
      return rawData.attachedFiles.join('\n\n')
    
    case 'history': {
      const limit = source.limit ?? 5
      return rawData.conversationHistory
        .slice(-limit)
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n')
    }
    
    case 'custom': {
      const value = rawData.customData.get(source.key)
      return value ? String(value) : ''
    }
    
    case 'static':
      return source.content
    
    default:
      return ''
  }
}

/**
 * 从原始数据仓库读取组合数据源
 */
export function readCompositeDataSource(
  composite: CompositeDataSource,
  rawData: Readonly<RawData>
): string {
  const parts = composite.sources.map(source => 
    readDataSource(source, rawData)
  )
  
  // 如果有模板，使用模板格式化
  if (composite.template) {
    return formatWithTemplate(composite.template, parts)
  }
  
  // 否则使用分隔符连接
  const separator = composite.separator ?? '\n\n'
  return parts.join(separator)
}

/**
 * 读取输入数据（统一接口）
 */
export function readInput(
  input: DataSource | CompositeDataSource,
  rawData: Readonly<RawData>
): string {
  if ('sources' in input) {
    return readCompositeDataSource(input, rawData)
  } else {
    return readDataSource(input, rawData)
  }
}

// ============================================================
// 数据写入
// ============================================================

/**
 * 将结果写入原始数据仓库
 */
export function writeOutput(
  output: OutputTarget,
  value: any,
  rawData: RawData
): void {
  switch (output.type) {
    case 'goal':
      rawData.goal = String(value)
      console.log(`[RawData] 已更新 goal`)
      break
    
    case 'files': {
      const content = String(value)
      switch (output.mode) {
        case 'append':
          rawData.attachedFiles.push(content)
          break
        case 'prepend':
          rawData.attachedFiles.unshift(content)
          break
        case 'replace':
          rawData.attachedFiles = [content]
          break
      }
      console.log(`[RawData] 已更新 attachedFiles (${output.mode})`)
      break
    }
    
    case 'custom':
      rawData.customData.set(output.key, value)
      console.log(`[RawData] 已更新 customData[${output.key}]`)
      break
    
    case 'none':
      // 不保存
      break
  }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 使用模板格式化多个部分
 * 
 * 模板格式：{0}, {1}, {2}, ...
 * 
 * 示例：
 * - template: "问题: {0}\n文件: {1}"
 * - parts: ["如何学习编程", "tutorial.md"]
 * - 结果: "问题: 如何学习编程\n文件: tutorial.md"
 */
function formatWithTemplate(template: string, parts: string[]): string {
  let result = template
  parts.forEach((part, index) => {
    result = result.replace(new RegExp(`\\{${index}\\}`, 'g'), part)
  })
  return result
}

/**
 * 克隆原始数据（用于测试或快照）
 */
export function cloneRawData(rawData: RawData): RawData {
  return {
    userInput: rawData.userInput,
    goal: rawData.goal,
    attachedFiles: [...rawData.attachedFiles],
    conversationHistory: [...rawData.conversationHistory],
    customData: new Map(rawData.customData)
  }
}

