/**
 * File Summary Cache Manager - 文件概括缓存管理
 * 
 * 功能：
 * 1. 检查文件是否有缓存的概括
 * 2. 读取缓存的概括
 * 3. 保存新的概括到缓存
 * 
 * 缓存策略：
 * - 在原文件所在目录下创建 gaikuo 文件夹
 * - 缓存文件命名：原文件名.原扩展名.gaikuo
 * - 缓存手动管理：只要缓存存在就会使用，不会自动失效
 * - 要重新生成概括，需要手动删除 gaikuo 文件夹中的对应缓存文件
 */

export interface SummaryCacheResult {
  /** 缓存的概括内容 */
  content: string
  /** 缓存时间 */
  cachedAt: Date
}

export interface FileSummaryCacheManager {
  /**
   * 尝试从缓存读取文件概括
   * @param filePath 原文件路径
   * @returns 如果缓存存在且有效，返回概括内容；否则返回 null
   */
  readCache(filePath: string): Promise<SummaryCacheResult | null>

  /**
   * 保存文件概括到缓存
   * @param filePath 原文件路径
   * @param summary 概括内容
   */
  writeCache(filePath: string, summary: string): Promise<void>
}

/**
 * 创建文件概括缓存管理器
 */
export function createFileSummaryCacheManager(): FileSummaryCacheManager {
  return {
    async readCache(filePath: string): Promise<SummaryCacheResult | null> {
      try {
        // 检查是否在 electron 环境中
        if (typeof window === 'undefined' || !(window as any).electronAPI) {
          return null
        }

        const electronAPI = (window as any).electronAPI

        // 调用 electron API 读取缓存
        const cacheData = await electronAPI.readSummaryCache(filePath)

        if (!cacheData) {
          return null
        }

        return {
          content: cacheData.content,
          cachedAt: new Date(cacheData.cachedAt)
        }
      } catch (error) {
        return null
      }
    },

    async writeCache(filePath: string, summary: string): Promise<void> {
      try {
        // 检查是否在 electron 环境中
        if (typeof window === 'undefined' || !(window as any).electronAPI) {
          return
        }

        const electronAPI = (window as any).electronAPI

        // 调用 electron API 写入缓存，返回实际的缓存文件路径
        await electronAPI.writeSummaryCache(filePath, summary)
      } catch (error) {
        // 不抛出错误，缓存写入失败不应该影响主流程
      }
    }
  }
}

/**
 * 全局单例
 */
export const fileSummaryCacheManager = createFileSummaryCacheManager()

