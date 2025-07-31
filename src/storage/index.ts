// 用户数据存储模块
// 提供统一的本地数据存储接口

import type { AIConfig } from '../chat/types'

// 存储键名常量
const STORAGE_KEYS = {
  AI_CONFIG: 'ai_config',
  CONVERSATION_HISTORY: 'conversation_history'
} as const

// 存储接口
interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

// 本地存储适配器 - 使用localStorage
class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.warn('读取本地存储失败:', error)
      return null
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.error('写入本地存储失败:', error)
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('删除本地存储失败:', error)
    }
  }
}

// 存储管理器
class StorageManager {
  private adapter: StorageAdapter

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  // 通用的存储方法
  private saveData<T>(key: string, data: T): void {
    try {
      const serialized = JSON.stringify(data)
      this.adapter.setItem(key, serialized)
    } catch (error) {
      console.error(`保存数据失败 [${key}]:`, error)
    }
  }

  // 通用的读取方法
  private loadData<T>(key: string, defaultValue: T): T {
    try {
      const stored = this.adapter.getItem(key)
      if (stored === null) {
        return defaultValue
      }
      return JSON.parse(stored) as T
    } catch (error) {
      console.warn(`读取数据失败 [${key}]:`, error)
      return defaultValue
    }
  }

  // ===== AI配置相关 =====

  /**
   * 保存AI配置
   */
  saveAIConfig(config: AIConfig): void {
    this.saveData(STORAGE_KEYS.AI_CONFIG, config)
  }

  /**
   * 读取AI配置
   */
  loadAIConfig(defaultConfig: AIConfig): AIConfig {
    return this.loadData(STORAGE_KEYS.AI_CONFIG, defaultConfig)
  }

  /**
   * 清除AI配置
   */
  clearAIConfig(): void {
    this.adapter.removeItem(STORAGE_KEYS.AI_CONFIG)
  }

  // ===== 对话历史相关 =====
  // TODO: 后续实现对话树的存储

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
      this.adapter.setItem(testKey, 'test')
      this.adapter.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }
}

// 创建默认存储实例
const storage = new StorageManager(new LocalStorageAdapter())

export { storage, StorageManager, type StorageAdapter }
export default storage