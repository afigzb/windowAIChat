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

  // ===== AI配置相关 =====
  
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
        this.currentConfig = storedConfig
      }
      
      return this.currentConfig
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

  // ===== 通用数据存储 =====

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
}

// 创建单例实例
const storage = new StorageManager()

export default storage