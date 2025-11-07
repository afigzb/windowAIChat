/**
 * File Processor - 文件处理器
 * 
 * 职责：处理文件消息的概括
 * 模式：读取文件消息 → 检查缓存 → 发送概括请求（如需要） → 保存缓存 → 替换原消息内容
 */

import type { AIConfig } from '../../types'
import type { Message } from '../core/workspace-data'
import { createAIService } from '../services/ai-service'
import { replaceContent } from '../core/message-ops'
import { fileSummaryCacheManager } from './cache-manager'

/**
 * 处理单个文件消息
 * 
 * 缓存策略：手动管理，只要缓存存在就使用，不自动失效
 * 路径处理：从 <!PATH:...!> 标记中提取完整路径用于缓存，最终消息中只保留文件名
 */
export async function processFile(
  fileMessage: Message,
  userInput: string,
  aiConfig: AIConfig,
  abortSignal?: AbortSignal,
  customProviderId?: string
): Promise<{ success: boolean; tokensUsed: number }> {
  try {
    // 提取完整路径（从特殊标记中）和文件名
    const pathMarkMatch = fileMessage.content.match(/<!PATH:(.+?)!>/);
    const fullPath = pathMarkMatch ? pathMarkMatch[1] : null
    
    // 提取文件名（从文件头中）
    const fileNameMatch = fileMessage.content.match(/---\s*文件:\s*(.+?)\s*(?:<!PATH:.*?!>)?\s*---/);
    const fileName = fileNameMatch ? fileNameMatch[1].trim() : null
    
    // 提取实际文件内容（去掉文件标识，包括路径标记）
    let actualContent = fileMessage.content
    if (fileName) {
      // 去掉文件头和文件尾标识（包括 <!PATH:...!> 标记）
      actualContent = fileMessage.content
        .replace(/---\s*文件:.*?---\s*/g, '')
        .replace(/---\s*文件结束\s*---/g, '')
        .trim()
    }
    
    // 检查文件大小：小于1000字符的文件采用放行原则，不概括
    if (actualContent.length < 1000) {
      fileMessage._meta.processed = true
      
      // 移除路径标记，只保留文件名
      if (fileName) {
        const finalContent = `\n\n--- 文件: ${fileName} ---\n${actualContent}\n--- 文件结束 ---`
        replaceContent(fileMessage, finalContent, false)
      }
      
      return {
        success: true,
        tokensUsed: 0
      }
    }
    
    //  尝试从缓存读取概括（使用完整路径） 
    let summary: string | null = null
    
    if (fullPath) {
      const cachedSummary = await fileSummaryCacheManager.readCache(fullPath)
      
      if (cachedSummary) {
        summary = cachedSummary.content
        
        // 使用文件名（不含路径标记）更新消息内容
        const finalContent = `\n\n--- 文件: ${fileName} ---\n${summary}\n--- 文件结束 ---`
        replaceContent(fileMessage, finalContent, true)
        
        return {
          success: true,
          tokensUsed: 0 // 使用缓存不消耗 tokens
        }
      }
    }
    
    //  缓存未命中，执行概括 
    // 如果指定了自定义provider，临时覆盖配置
    const effectiveConfig = customProviderId 
      ? { ...aiConfig, currentProviderId: customProviderId }
      : aiConfig
    const aiService = createAIService(effectiveConfig)
    
    // 获取自定义系统提示词（如果有）
    const customSystemPrompt = aiConfig.agentConfig?.preprocessor?.fileProcessor?.systemPrompt
    
    // 默认文件概括提示词
    const defaultPrompt = `请帮我在不改变语气与氛围的情况下，浓缩以下文本。
要求：
1. 保留叙事语态（第一人称/第三人称/意识流等）。
2. 保留主要人物关系和情感线。
3. 删除重复、细节化描写，但不改变基调。
4. 输出结果应像是“同一作者写的缩短版”。`
    
    // 构建概括请求消息
    const promptMessages = [
      {
        role: 'system',
        content: customSystemPrompt || defaultPrompt
      },
      {
        role: 'user',
        content: actualContent
      }
    ]
    
    // 发送请求
    summary = await aiService.call(
      promptMessages,
      { abortSignal }
    )
    
    //  保存概括到缓存（使用完整路径） 
    if (fullPath && summary) {
      await fileSummaryCacheManager.writeCache(fullPath, summary)
    }
    
    // 写入：替换原消息内容，使用文件名（不含路径标记）
    let finalContent = summary
    if (fileName) {
      finalContent = `\n\n--- 文件: ${fileName} ---\n${summary}\n--- 文件结束 ---`
    }
    
    replaceContent(fileMessage, finalContent, true)
    
    return {
      success: true,
      tokensUsed: 500 // 估算
    }
  } catch (error: any) {
    
    // 失败时保留原内容，但标记为已处理
    fileMessage._meta.processed = true
    
    return {
      success: false,
      tokensUsed: 0
    }
  }
}

