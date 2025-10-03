// 提供与聊天系统解耦的概括功能构建器
import { DEFAULT_SUMMARIZE_PROMPT } from '../defaults'

export interface SummarizePlan {
  userMessageContent: string // 保存到对话历史中的消息（占位符）
  extraContext: string // 包含实际的概括指令和上下文
  systemPrompt: string
}

function buildSystemPrompt(customPrompt?: string): string {
  // 如果有自定义提示词，使用自定义的；否则使用默认的
  return customPrompt?.trim() || DEFAULT_SUMMARIZE_PROMPT
}

/**
 * 构建概括计划
 * @param inputResidual 用户额外输入的概括指令
 * @param conversationHistoryText 当前对话的历史上下文（已根据 historyLimit 截断）
 * @param filesText 选中的文件内容
 * @param customPrompt 自定义的概括提示词（可选）
 */
export function buildSummarizePlan(
  inputResidual?: string,
  conversationHistoryText?: string,
  filesText?: string,
  customPrompt?: string
): SummarizePlan {
  const trimmedInput = (inputResidual || '').trim()
  const actualInstruction = trimmedInput || '请对上述内容进行高质量概括'

  // 组装额外上下文：概括指令 + 对话历史 + 文件内容
  const contextParts: string[] = []
  
  // 将实际的概括指令作为临时上下文的一部分（不会被保存到对话历史）
  contextParts.push('【概括指令】\n' + actualInstruction)
  
  const trimmedHistory = (conversationHistoryText || '').trim()
  if (trimmedHistory) {
    contextParts.push('【对话历史】\n' + trimmedHistory)
  }

  const trimmedFiles = (filesText || '').trim()
  if (trimmedFiles) {
    contextParts.push('【文件内容】\n' + trimmedFiles)
  }

  const extraContext = contextParts.length > 0 
    ? '\n\n' + contextParts.join('\n\n') 
    : ''

  const systemPrompt = buildSystemPrompt(customPrompt)

  return {
    userMessageContent: '...',  // 占位符，避免在对话历史中保存实际的概括指令
    extraContext,
    systemPrompt
  }
}

export type { SummarizePlan as SummaryPlan }


