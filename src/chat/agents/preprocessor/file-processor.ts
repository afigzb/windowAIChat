/**
 * File Processor - 文件处理器
 */

import type { AgentContext, Message, ProcessResult } from '../types'
import { createAIService } from '../services/ai-service'
import { replaceContent } from '../core/message-ops'
import { fileSummaryCacheManager } from './cache-manager'

/**
 * 默认的文件概括系统提示词
 */
export const DEFAULT_FILE_SUMMARY_PROMPT = `你是一位专业的小说文档概括助手，擅长在保留故事结构和叙事重点的前提下，对小说文本进行智能压缩和提炼。
你的任务是对用户提供的文本进行内容概括，输出一个简洁但信息完整的版本。
概括要求：
1.保留核心要素：保留故事主线、关键人物、主要冲突、叙事结构和重要情节转折。
2.删除冗余细节：删去过多的环境描写、重复情节或无关对白。
3.保持逻辑连贯：概括后的内容应让AI或读者能清晰理解文本的结构与核心作用。
3.避免格式化说明：直接输出概括后的内容，不要添加"摘要"、"概括"等提示性前缀。
4.压缩比例：目标为原文长度的 30%–50%，在保证完整性的前提下尽可能凝练。`

/**
 * 处理单个文件消息
 */
export async function processFile(
  fileMessage: Message,
  context: AgentContext,
  abortSignal?: AbortSignal,
  customProviderId?: string
): Promise<ProcessResult> {
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
    
    // 检查缓存（如果有完整路径）
    let summaryContent: string | null = null
    if (fullPath) {
      const cached = await fileSummaryCacheManager.readCache(fullPath)
      if (cached) {
        summaryContent = cached.content
      }
    }
    
    // 如果没有缓存，调用AI生成概括
    if (!summaryContent) {
      // 获取自定义提示词或使用默认
      const customPrompt = context.input.aiConfig.agentConfig?.preprocessor?.fileProcessor?.systemPrompt
      const systemPrompt = customPrompt || DEFAULT_FILE_SUMMARY_PROMPT
      const userPrompt = buildFileSummaryUserPrompt(actualContent, fileName || '未知文件')
      
      // 创建AI服务（使用 context 中的 aiConfig）
      const aiService = createAIService(context.input.aiConfig)
      
      // 发送请求（system + user 结构）
      summaryContent = await aiService.call(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        { 
          abortSignal,
          temperature: 0.3  // 概括使用较低温度
        }
      )
      
      // 保存到缓存
      if (fullPath && summaryContent) {
        await fileSummaryCacheManager.writeCache(fullPath, summaryContent)
      }
    }
    
    // 替换消息内容
    if (summaryContent) {
      const finalContent = fileName
        ? `\n\n--- 文件: ${fileName} (概括) ---\n${summaryContent}\n--- 文件结束 ---`
        : `\n\n${summaryContent}`
      
      replaceContent(fileMessage, finalContent, true)
    }
    
    return {
      success: true,
      tokensUsed: 0  // TODO: 实际应该统计 token 使用
    }
    
  } catch (error: any) {
    return {
      success: false,
      tokensUsed: 0,
      error: error.message || '文件处理失败'
    }
  }
}

/**
 * 构建文件概括的 User Prompt
 */
function buildFileSummaryUserPrompt(fileContent: string, fileName: string): string {
  return `文件名：${fileName}

文件内容：
${fileContent}`
}
