// 文件内容缓存管理器
// 用于缓存已解析的文件内容，避免重复解析
// 属于数据存储层，被多个模块共享使用

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
   * 移除所有以指定路径前缀开头的缓存项
   * 用于删除文件夹时清理其下所有文件的缓存
   */
  removeByPrefix(pathPrefix: string): void {
    // 标准化路径分隔符为 /
    const normalizedPrefix = pathPrefix.replace(/\\/g, '/')
    const keysToRemove: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      const normalizedKey = key.replace(/\\/g, '/')
      // 检查是否以指定前缀开头
      if (normalizedKey === normalizedPrefix || normalizedKey.startsWith(normalizedPrefix + '/')) {
        keysToRemove.push(key)
        this.currentSize -= entry.size
      }
    }
    
    keysToRemove.forEach(key => this.cache.delete(key))
  }
  
  /**
   * 更新单个文件的路径key
   * 用于重命名或移动文件时更新缓存
   */
  updatePath(oldPath: string, newPath: string): void {
    const entry = this.cache.get(oldPath)
    if (entry) {
      this.cache.delete(oldPath)
      this.cache.set(newPath, entry)
    }
  }
  
  /**
   * 更新所有以指定路径前缀开头的缓存项的路径
   * 用于重命名或移动文件夹时更新其下所有文件的缓存路径
   */
  updatePathPrefix(oldPrefix: string, newPrefix: string): void {
    // 标准化路径分隔符为 /
    const normalizedOldPrefix = oldPrefix.replace(/\\/g, '/')
    const normalizedNewPrefix = newPrefix.replace(/\\/g, '/')
    const updates: Array<{ oldKey: string; newKey: string; entry: CacheEntry }> = []
    
    for (const [key, entry] of this.cache.entries()) {
      const normalizedKey = key.replace(/\\/g, '/')
      
      // 检查是否匹配（完全匹配或前缀匹配）
      if (normalizedKey === normalizedOldPrefix) {
        // 完全匹配：直接替换
        updates.push({
          oldKey: key,
          newKey: newPrefix,
          entry
        })
      } else if (normalizedKey.startsWith(normalizedOldPrefix + '/')) {
        // 前缀匹配：替换前缀部分
        const relativePath = normalizedKey.substring(normalizedOldPrefix.length)
        const newKey = normalizedNewPrefix + relativePath
        updates.push({
          oldKey: key,
          newKey,
          entry
        })
      }
    }
    
    // 执行更新
    updates.forEach(({ oldKey, newKey, entry }) => {
      this.cache.delete(oldKey)
      this.cache.set(newKey, entry)
    })
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

