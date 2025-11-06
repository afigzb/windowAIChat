/**
 * Agents 系统通用工具函数
 * 
 * 统一管理ID生成、JSON解析等通用功能
 */

// ============================================================
// ID 生成
// ============================================================

/**
 * 生成唯一ID
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 生成WorkspaceID
 */
export function generateWorkspaceId(): string {
  return generateId('ws')
}

/**
 * 生成TaskID
 */
export function generateTaskId(): string {
  return generateId('task')
}

/**
 * 生成PlanID
 */
export function generatePlanId(): string {
  return generateId('plan')
}

/**
 * 生成DocumentID
 */
export function generateDocumentId(): string {
  return generateId('doc')
}

/**
 * 生成LogID
 */
export function generateLogId(): string {
  return generateId('log')
}

// ============================================================
// JSON 解析
// ============================================================

/**
 * 安全地解析JSON响应
 * 
 * 支持：
 * - 提取markdown代码块中的JSON
 * - 移除注释
 * - 错误处理
 */
export function parseJSONResponse(response: string): any {
  try {
    let jsonText = response.trim()
    
    // 提取JSON代码块
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim()
    }
    
    // 移除注释
    jsonText = jsonText
      .replace(/\/\/.*/g, '')           // 单行注释
      .replace(/\/\*[\s\S]*?\*\//g, '') // 多行注释
    
    return JSON.parse(jsonText)
    
  } catch (error: any) {
    return {}
  }
}

/**
 * 尝试解析JSON，失败返回默认值
 */
export function tryParseJSON<T>(text: string, defaultValue: T): T {
  try {
    return parseJSONResponse(text) as T
  } catch {
    return defaultValue
  }
}

// ============================================================
// 文本处理
// ============================================================

/**
 * 截断文本到指定长度
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength - suffix.length) + suffix
}

/**
 * 移除Markdown代码块包裹
 */
export function unwrapCodeBlock(text: string): string {
  const codeBlockMatch = text.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/)
  return codeBlockMatch ? codeBlockMatch[1].trim() : text
}

// ============================================================
// 时间处理
// ============================================================

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`
  } else {
    const minutes = Math.floor(ms / 60000)
    const seconds = ((ms % 60000) / 1000).toFixed(0)
    return `${minutes}m ${seconds}s`
  }
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// ============================================================
// 数据验证
// ============================================================

/**
 * 安全地获取嵌套属性
 */
export function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) {
      return undefined
    }
    // 处理Map类型
    if (current instanceof Map) {
      return current.get(key)
    }
    return current[key]
  }, obj)
}

