// AI配置存储专用模块
// 提供AI配置的持久化管理

import type { AIConfig } from '../chat/types'
import { DEFAULT_CONFIG } from '../chat/api'
import storage from './index'

/**
 * AI配置存储管理器
 * 负责配置的持久化和同步
 */
export class ConfigStorage {
  private static instance: ConfigStorage
  private currentConfig: AIConfig | null = null

  private constructor() {}

  static getInstance(): ConfigStorage {
    if (!ConfigStorage.instance) {
      ConfigStorage.instance = new ConfigStorage()
    }
    return ConfigStorage.instance
  }

  /**
   * 初始化配置 - 从本地存储读取或使用默认配置
   */
  initConfig(): AIConfig {
    if (this.currentConfig) {
      return this.currentConfig
    }

    try {
      this.currentConfig = storage.loadAIConfig(DEFAULT_CONFIG)
      console.log('已加载AI配置:', this.currentConfig)
      return this.currentConfig
    } catch (error) {
      console.warn('加载AI配置失败，使用默认配置:', error)
      this.currentConfig = { ...DEFAULT_CONFIG }
      return this.currentConfig
    }
  }

  /**
   * 保存配置到本地存储
   */
  saveConfig(config: AIConfig): void {
    try {
      // 更新内存中的配置
      this.currentConfig = { ...config }
      
      // 持久化到本地存储
      storage.saveAIConfig(config)
      
      console.log('AI配置已保存:', config)
    } catch (error) {
      console.error('保存AI配置失败:', error)
    }
  }

  /**
   * 获取当前配置
   */
  getCurrentConfig(): AIConfig {
    return this.currentConfig || this.initConfig()
  }

  /**
   * 更新配置的某个字段
   */
  updateConfig(updates: Partial<AIConfig>): AIConfig {
    const newConfig = { ...this.getCurrentConfig(), ...updates }
    this.saveConfig(newConfig)
    return newConfig
  }

  /**
   * 重置配置为默认值
   */
  resetConfig(): AIConfig {
    this.saveConfig({ ...DEFAULT_CONFIG })
    return this.getCurrentConfig()
  }

  /**
   * 清除所有存储的配置
   */
  clearConfig(): void {
    storage.clearAIConfig()
    this.currentConfig = null
  }
}

// 导出单例实例
export const configStorage = ConfigStorage.getInstance()
export default configStorage