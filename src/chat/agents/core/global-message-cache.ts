/**
 * Global Message Cache - 全局消息缓存模块
 * 
 * 职责：为agents提供临时消息缓存能力
 * 用途：
 * 1. 缓存上下文概括结果，支持增量上下文处理
 * 2. 缓存其他agents需要暂时存储的消息
 * 3. 会话级别的缓存，刷新页面后清空
 */

import type { Message } from './workspace-data'

/**
 * 上下文概括缓存项
 */
export interface ContextSummaryCacheEntry {
  /** 概括消息 */
  summaryMessage: Message
  
  /** 已概括的原始消息的ID列表（用于增量检测） */
  summarizedMessageIds: string[]
  
  /** 概括时的总字符数 */
  totalChars: number
  
  /** 缓存创建时间 */
  createdAt: number
  
  /** 最后更新时间 */
  updatedAt: number
}

/**
 * 通用缓存项
 */
export interface GenericCacheEntry {
  /** 缓存的数据 */
  data: any
  
  /** 缓存创建时间 */
  createdAt: number
  
  /** 过期时间（可选，默认会话级别） */
  expiresAt?: number
}

/**
 * 全局消息缓存类
 */
class GlobalMessageCache {
  /** 上下文概括缓存：key为会话ID或上下文标识 */
  private contextSummaryCache: Map<string, ContextSummaryCacheEntry> = new Map()
  
  /** 通用缓存：key为自定义标识 */
  private genericCache: Map<string, GenericCacheEntry> = new Map()
  
  // ============================================================
  // 上下文概括缓存操作
  // ============================================================
  
  /**
   * 获取上下文概括缓存
   * @param key 缓存键（通常为会话ID）
   */
  getContextSummary(key: string): ContextSummaryCacheEntry | null {
    return this.contextSummaryCache.get(key) || null
  }
  
  /**
   * 设置上下文概括缓存
   * @param key 缓存键（通常为会话ID）
   * @param entry 缓存项
   */
  setContextSummary(key: string, entry: ContextSummaryCacheEntry): void {
    this.contextSummaryCache.set(key, entry)
  }
  
  /**
   * 删除上下文概括缓存
   * @param key 缓存键
   */
  deleteContextSummary(key: string): void {
    this.contextSummaryCache.delete(key)
  }
  
  /**
   * 清空所有上下文概括缓存
   */
  clearContextSummaries(): void {
    this.contextSummaryCache.clear()
  }
  
  // ============================================================
  // 通用缓存操作
  // ============================================================
  
  /**
   * 获取通用缓存
   * @param key 缓存键
   */
  get<T = any>(key: string): T | null {
    const entry = this.genericCache.get(key)
    
    if (!entry) {
      return null
    }
    
    // 检查是否过期
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.genericCache.delete(key)
      return null
    }
    
    return entry.data as T
  }
  
  /**
   * 设置通用缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 过期时间（毫秒），不设置则为会话级别
   */
  set(key: string, data: any, ttl?: number): void {
    const entry: GenericCacheEntry = {
      data,
      createdAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined
    }
    
    this.genericCache.set(key, entry)
  }
  
  /**
   * 删除通用缓存
   * @param key 缓存键
   */
  delete(key: string): void {
    this.genericCache.delete(key)
  }
  
  /**
   * 清空所有通用缓存
   */
  clear(): void {
    this.genericCache.clear()
  }
  
  // ============================================================
  // 工具方法
  // ============================================================
  
  /**
   * 清空所有缓存（包括上下文概括和通用缓存）
   */
  clearAll(): void {
    this.contextSummaryCache.clear()
    this.genericCache.clear()
  }
  
  /**
   * 获取缓存统计信息
   */
  getStats(): {
    contextSummaryCount: number
    genericCacheCount: number
    totalSize: number
  } {
    return {
      contextSummaryCount: this.contextSummaryCache.size,
      genericCacheCount: this.genericCache.size,
      totalSize: this.contextSummaryCache.size + this.genericCache.size
    }
  }
  
  /**
   * 清理过期的通用缓存
   */
  cleanupExpired(): void {
    const now = Date.now()
    
    for (const [key, entry] of this.genericCache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.genericCache.delete(key)
      }
    }
  }
}

/**
 * 全局单例实例
 */
export const globalMessageCache = new GlobalMessageCache()

/**
 * 导出类型供外部使用
 */
export type { GlobalMessageCache }

