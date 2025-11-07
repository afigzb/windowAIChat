/**
 * Global Message Cache - 全局消息缓存（上下文概括专用）
 */

import type { ContextSummaryCacheEntry } from '../types'

// 重新导出类型
export type { ContextSummaryCacheEntry }

/**
 * 全局消息缓存类
 */
class GlobalMessageCache {
  /** 上下文概括缓存：key为会话ID或上下文标识 */
  private contextSummaryCache: Map<string, ContextSummaryCacheEntry> = new Map()
  
  /**
   * 获取上下文概括缓存
   */
  getContextSummary(key: string): ContextSummaryCacheEntry | null {
    return this.contextSummaryCache.get(key) || null
  }
  
  /**
   * 设置上下文概括缓存
   */
  setContextSummary(key: string, entry: ContextSummaryCacheEntry): void {
    this.contextSummaryCache.set(key, entry)
  }
  
  /**
   * 删除上下文概括缓存
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
}

/**
 * 全局单例实例
 */
export const globalMessageCache = new GlobalMessageCache()

/**
 * 导出类型供外部使用
 */
export type { GlobalMessageCache }
