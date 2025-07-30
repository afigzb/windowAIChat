import type { CorpusItem, CorpusType, CorpusConfig } from './types'

// 导入 data.json 文件
import dataJson from './data.json'

/**
 * 生成唯一ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * 从 data.json 加载语料配置
 * @returns 语料配置
 */
export function loadCorpusConfigFromDataJson(): CorpusConfig {
  try {
    const data = dataJson as any
    if (data && data.corpus) {
      // 验证和转换数据
      const corpus = data.corpus
      return {
        initialCorpus: (corpus.initialCorpus || []).map((item: any) => ({
          ...item,
          created: new Date(item.created || Date.now())
        })),
        emphasisCorpus: (corpus.emphasisCorpus || []).map((item: any) => ({
          ...item,
          created: new Date(item.created || Date.now())
        }))
      }
    }
  } catch (error) {
    console.warn('无法从 data.json 加载语料配置，使用默认配置', error)
  }
  
  // 返回默认空配置
  return createDefaultCorpusConfig()
}

/**
 * 创建新的语料项
 * @param name 语料名称
 * @param type 语料类型
 * @param content 语料内容
 * @returns 新的语料项
 */
export function createCorpusItem(
  name: string,
  type: CorpusType,
  content: string
): CorpusItem {
  return {
    id: generateId(),
    name: name.trim(),
    type,
    content: content.trim(),
    enabled: true,
    created: new Date()
  }
}

/**
 * 更新语料项
 * @param corpus 语料列表
 * @param id 要更新的语料ID
 * @param updates 要更新的字段
 * @returns 更新后的语料列表
 */
export function updateCorpusItem(
  corpus: CorpusItem[],
  id: string,
  updates: Partial<Pick<CorpusItem, 'name' | 'content' | 'enabled'>>
): CorpusItem[] {
  return corpus.map(item =>
    item.id === id ? { ...item, ...updates } : item
  )
}

/**
 * 删除语料项
 * @param corpus 语料列表
 * @param id 要删除的语料ID
 * @returns 删除后的语料列表
 */
export function deleteCorpusItem(
  corpus: CorpusItem[],
  id: string
): CorpusItem[] {
  return corpus.filter(item => item.id !== id)
}

/**
 * 获取启用的语料内容
 * @param corpus 语料列表
 * @returns 启用的语料内容字符串
 */
export function getEnabledCorpusContent(corpus: CorpusItem[]): string {
  return corpus
    .filter(item => item.enabled)
    .map(item => item.content)
    .join('\n\n')
}

/**
 * 创建默认语料配置
 * @returns 默认语料配置
 */
export function createDefaultCorpusConfig(): CorpusConfig {
  return {
    initialCorpus: [],
    emphasisCorpus: []
  }
}

/**
 * 导出语料配置为JSON
 * @param config 语料配置
 * @returns JSON字符串
 */
export function exportCorpusConfig(config: CorpusConfig): string {
  return JSON.stringify(config, null, 2)
}



/**
 * 验证语料内容
 * @param content 语料内容
 * @returns 验证结果和错误信息
 */
export function validateCorpusContent(content: string): { valid: boolean; error?: string } {
  if (!content.trim()) {
    return { valid: false, error: '语料内容不能为空' }
  }
  
  return { valid: true }
}

/**
 * 验证语料名称
 * @param name 语料名称
 * @param existingNames 已存在的名称列表
 * @returns 验证结果和错误信息
 */
export function validateCorpusName(name: string, existingNames: string[] = []): { valid: boolean; error?: string } {
  if (!name.trim()) {
    return { valid: false, error: '语料名称不能为空' }
  }
  
  if (name.length > 50) {
    return { valid: false, error: '语料名称不能超过50字符' }
  }
  
  if (existingNames.includes(name.trim())) {
    return { valid: false, error: '语料名称已存在' }
  }
  
  return { valid: true }
} 