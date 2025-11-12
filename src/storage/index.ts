// 统一数据存储模块
// 提供本地数据存储和AI配置管理

import type { AIConfig } from '../chat'

// 导出文件缓存管理器（属于数据层工具）
export { fileContentCache } from './fileContentCache'

// 存储键名常量
const STORAGE_KEYS = {
  AI_CONFIG: 'ai_config',
  CONVERSATION_HISTORY: 'conversation_history'
} as const

// 简化的存储管理器
class StorageManager {
  private get electron() {
    return (window as any).electronAPI
  }

  constructor() {
    // 尝试初始化存储目录（幂等）
    try {
      this.electron?.initStorageDir?.()
    } catch {}
  }
  // 通用的存储方法
  private saveData<T>(key: string, data: T): void {
    try {
      // 使用同步写入，保持现有同步接口
      this.electron?.kvSetSync?.(key, data)
    } catch (error) {
      console.error(`保存数据失败 [${key}]:`, error)
    }
  }

  // 通用的读取方法
  private loadData<T>(key: string, defaultValue: T): T {
    try {
      const value = this.electron?.kvGetSync?.(key)
      if (value === null || value === undefined) return defaultValue
      return value as T
    } catch (error) {
      console.warn(`读取数据失败 [${key}]:`, error)
      return defaultValue
    }
  }

  //  AI配置相关 
  
  private currentConfig: AIConfig | null = null

  /**
   * 初始化AI配置
   */
  initAIConfig(defaultConfig: AIConfig): AIConfig {
    if (this.currentConfig) {
      return this.currentConfig
    }

    try {
      const storedConfig = this.loadData(STORAGE_KEYS.AI_CONFIG, defaultConfig)
      
      // 简单验证：如果配置结构不对，直接用默认配置
      if (!storedConfig.providers || !storedConfig.currentProviderId) {
        console.warn('存储的AI配置格式不兼容，使用默认配置')
        this.currentConfig = { ...defaultConfig }
      } else {
        // 合并配置：确保旧配置有新增的字段（如 agentConfig）
        this.currentConfig = {
          ...defaultConfig,  // 先使用默认配置
          ...storedConfig,   // 再用存储的配置覆盖
          // 深度合并 agentConfig
          agentConfig: storedConfig.agentConfig ? {
            ...defaultConfig.agentConfig,
            ...storedConfig.agentConfig
          } : defaultConfig.agentConfig
        }
      }
      
      return this.currentConfig!
    } catch (error) {
      console.warn('加载AI配置失败，使用默认配置:', error)
      this.currentConfig = { ...defaultConfig }
      return this.currentConfig
    }
  }

  /**
   * 保存AI配置
   */
  saveAIConfig(config: AIConfig): void {
    this.currentConfig = { ...config }
    this.saveData(STORAGE_KEYS.AI_CONFIG, config)
  }

  /**
   * 获取当前AI配置（如果未初始化则先初始化）
   */
  getCurrentAIConfig(defaultConfig: AIConfig): AIConfig {
    return this.currentConfig || this.initAIConfig(defaultConfig)
  }

  /**
   * 更新AI配置
   */
  updateAIConfig(updates: Partial<AIConfig>, currentConfig: AIConfig): AIConfig {
    const newConfig = { ...currentConfig, ...updates }
    this.saveAIConfig(newConfig)
    return newConfig
  }

  /**
   * 重置AI配置
   */
  resetAIConfig(defaultConfig: AIConfig): AIConfig {
    this.saveAIConfig({ ...defaultConfig })
    return this.getCurrentAIConfig(defaultConfig)
  }

  /**
   * 清除AI配置
   */
  clearAIConfig(): void {
    try {
      this.electron?.kvRemoveSync?.(STORAGE_KEYS.AI_CONFIG)
    } catch {}
    this.currentConfig = null
  }

  //  通用数据存储 

  /**
   * 保存通用数据
   */
  saveGenericData<T>(key: string, data: T): void {
    this.saveData(key, data)
  }

  /**
   * 读取通用数据
   */
  loadGenericData<T>(key: string, defaultValue: T): T {
    return this.loadData(key, defaultValue)
  }

  /**
   * 检查存储是否可用
   */
  isAvailable(): boolean {
    try {
      const testKey = '__storage_test__'
      const ok = this.electron?.kvSetSync?.(testKey, 'test')
      this.electron?.kvRemoveSync?.(testKey)
      return !!ok
    } catch {
      return false
    }
  }

  //  对话历史专用存储方法 

  /**
   * 保存单个对话到独立文件
   */
  saveConversation(conversationId: string, conversationData: any): void {
    const key = `conversation_${conversationId}`
    this.saveData(key, conversationData)
  }

  /**
   * 从独立文件加载单个对话
   */
  loadConversation(conversationId: string): any | null {
    const key = `conversation_${conversationId}`
    try {
      const value = this.electron?.kvGetSync?.(key)
      return value || null
    } catch (error) {
      console.warn(`加载对话失败 [${conversationId}]:`, error)
      return null
    }
  }

  /**
   * 删除单个对话文件
   */
  deleteConversation(conversationId: string): void {
    const key = `conversation_${conversationId}`
    try {
      this.electron?.kvRemoveSync?.(key)
    } catch (error) {
      console.error(`删除对话文件失败 [${conversationId}]:`, error)
    }
  }

  /**
   * 保存对话索引（元数据列表）
   */
  saveConversationIndex(index: any[]): void {
    this.saveData('conversation_index', index)
  }

  /**
   * 加载对话索引
   */
  loadConversationIndex(): any[] {
    return this.loadData('conversation_index', [])
  }

  /**
   * 清空所有对话文件
   */
  clearAllConversations(conversationIds: string[]): void {
    // 删除所有对话文件
    conversationIds.forEach(id => this.deleteConversation(id))
    // 清空索引
    this.saveConversationIndex([])
  }
}

// 创建单例实例
const storage = new StorageManager()

export default storage