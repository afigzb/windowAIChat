/**
 * 判断任务模板
 * 
 * 适用场景：
 * - 需要 AI 做出是/否判断的任务
 * - 如：是否需要优化、是否需要搜索、是否满足条件等
 * 
 * 特点：
 * - 基于单次通信
 * - 结构化输出解析（是/否 + 原因）
 * - 支持自定义判断逻辑
 */

import type { AgentTaskExecuteParams, AgentTaskResult, AgentContext } from '../types'
import { executeSimpleLLMTask } from './simple-llm-task'

/**
 * 判断结果
 */
export interface JudgmentOutput {
  /** 判断结果（true/false）*/
  result: boolean
  
  /** 判断原因 */
  reason: string
  
  /** AI 的完整响应（可选）*/
  aiResponse?: string
  
  /** 用于 UI 显示的文本 */
  displayText?: string
}

/**
 * 判断任务配置
 */
export interface JudgmentTaskConfig {
  /** 任务类型 */
  taskType: import('../types').AgentTaskType
  
  /** 任务名称 */
  taskName: string
  
  /** 任务执行参数 */
  params: AgentTaskExecuteParams
  
  /** 默认系统提示词 */
  defaultSystemPrompt: string
  
  /** 进度消息（可选）*/
  progressMessage?: string
  
  /** 最小输入长度（可选）*/
  minInputLength?: number
  
  /** 输入过短时的默认判断（可选）*/
  shortInputDefault?: boolean
  
  /** 输入过短时的原因（可选）*/
  shortInputReason?: string
  
  /**
   * 解析 LLM 响应，提取判断结果
   * 
   * @param response LLM 的完整响应
   * @param input 原始输入
   * @param context 执行上下文
   * @returns 判断结果（true/false）
   * 
   * 示例：
   * - 检查是否包含 <是/> 标签
   * - 解析 JSON 格式的响应
   * - 基于关键词判断
   */
  parseJudgment: (response: string, input: any, context: AgentContext) => boolean
  
  /**
   * 提取判断原因（可选）
   * 如果不提供，将使用默认逻辑
   */
  extractReason?: (response: string, result: boolean) => string
  
  /**
   * 构建显示文本（可选）
   * 用于 UI 展示
   */
  buildDisplayText?: (result: boolean, reason: string, response: string) => string
}

/**
 * 执行判断任务
 * 
 * 这是对 executeSimpleLLMTask 的封装，专门处理判断类任务
 */
export async function executeJudgmentTask(
  config: JudgmentTaskConfig
): Promise<AgentTaskResult> {
  const {
    taskType,
    taskName,
    params,
    defaultSystemPrompt,
    progressMessage,
    minInputLength = 5,
    shortInputDefault = true,
    shortInputReason = '输入过短，使用默认判断',
    parseJudgment,
    extractReason,
    buildDisplayText
  } = config
  
  // 构建短路输出（输入过短时）
  const shortInputFallback: JudgmentOutput = {
    result: shortInputDefault,
    reason: shortInputReason,
    displayText: shortInputReason
  }
  
  // 调用单次通信模板
  return executeSimpleLLMTask<JudgmentOutput>({
    taskType,
    taskName,
    params,
    defaultSystemPrompt,
    progressMessage,
    minInputLength,
    shortInputFallback,
    
    // 解析输出为判断结果
    parseOutput: (response, input, context) => {
      // 1. 提取判断结果
      const result = parseJudgment(response, input, context)
      
      // 2. 提取原因
      const reason = extractReason 
        ? extractReason(response, result)
        : (result 
            ? `AI 判断: 需要处理`
            : `AI 判断: 不需要处理`)
      
      // 3. 构建显示文本
      const displayText = buildDisplayText
        ? buildDisplayText(result, reason, response)
        : `判断结果: ${result ? '是' : '否'}\n\n原因: ${reason}\n\nAI 分析:\n${response}`
      
      return {
        result,
        reason,
        aiResponse: response,
        displayText
      }
    }
  })
}

/**
 * 常用的判断解析器
 */
export const JudgmentParsers = {
  /**
   * 基于标签解析：检查是否包含 <是/> 或 <否/>
   */
  parseByTag: (response: string): boolean => {
    return response.includes('<是/>')
  },
  
  /**
   * 基于关键词解析：检查是否包含肯定关键词
   */
  parseByKeywords: (response: string, yesKeywords: string[] = ['是', 'yes', 'true', '需要']): boolean => {
    const lowerResponse = response.toLowerCase()
    return yesKeywords.some(keyword => lowerResponse.includes(keyword.toLowerCase()))
  },
  
  /**
   * 基于 JSON 解析
   */
  parseByJson: (response: string, resultKey: string = 'result'): boolean => {
    try {
      const json = JSON.parse(response)
      return !!json[resultKey]
    } catch {
      console.warn('[JudgmentTask] JSON 解析失败，默认返回 false')
      return false
    }
  }
}

/**
 * 常用的原因提取器
 */
export const ReasonExtractors = {
  /**
   * 从完整响应中提取原因（使用简单的启发式规则）
   */
  extractFromResponse: (response: string): string => {
    // 尝试找到"原因"、"理由"等关键词后的内容
    const reasonMatches = response.match(/(?:原因|理由|because|reason)[：:]\s*(.+?)(?:\n|$)/i)
    if (reasonMatches && reasonMatches[1]) {
      return reasonMatches[1].trim()
    }
    
    // 如果没找到，返回响应的前100个字符
    return response.substring(0, 100) + (response.length > 100 ? '...' : '')
  },
  
  /**
   * 使用完整响应作为原因
   */
  useFullResponse: (response: string): string => {
    return response.trim()
  },
  
  /**
   * 固定原因
   */
  fixed: (yesReason: string, noReason: string) => (response: string, result: boolean): string => {
    return result ? yesReason : noReason
  }
}

