// 文件内容缓存管理器
// 用于缓存已解析的文件内容，避免重复解析

interface CacheEntry {
  content: string
  timestamp: number
  size: number
}

class FileContentCache {
  private cache: Map<string, CacheEntry> = new Map()
  private maxCacheSize: number = 50 * 1024 * 1024 // 50MB
  private currentSize: number = 0
  
  /**
   * 获取缓存的文件内容
   */
  get(filePath: string): string | null {
    const entry = this.cache.get(filePath)
    if (!entry) return null
    
    // 检查缓存是否过期（1小时）
    const now = Date.now()
    if (now - entry.timestamp > 3600000) {
      this.remove(filePath)
      return null
    }
    
    return entry.content
  }
  
  /**
   * 设置缓存的文件内容
   */
  set(filePath: string, content: string): void {
    // 如果文件已在缓存中，先移除旧的
    if (this.cache.has(filePath)) {
      this.remove(filePath)
    }
    
    const size = content.length * 2 // 估算字符串大小（UTF-16）
    
    // 如果新内容太大，清理缓存
    while (this.currentSize + size > this.maxCacheSize && this.cache.size > 0) {
      const oldestKey = this.getOldestKey()
      if (oldestKey) {
        this.remove(oldestKey)
      }
    }
    
    // 添加到缓存
    this.cache.set(filePath, {
      content,
      timestamp: Date.now(),
      size
    })
    this.currentSize += size
  }
  
  /**
   * 移除缓存项
   */
  remove(filePath: string): void {
    const entry = this.cache.get(filePath)
    if (entry) {
      this.currentSize -= entry.size
      this.cache.delete(filePath)
    }
  }
  
  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
    this.currentSize = 0
  }
  
  /**
   * 获取最旧的缓存键
   */
  private getOldestKey(): string | null {
    let oldestKey: string | null = null
    let oldestTime = Infinity
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }
    
    return oldestKey
  }
}

// 导出单例实例
export const fileContentCache = new FileContentCache()