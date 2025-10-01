// 提供与聊天系统解耦的概括功能构建器

export interface SummarizePlan {
  userMessageContent: string
  extraContext: string
  systemPrompt: string
}

function buildSystemPrompt(): string {
  return [
    '你是一名专业的中文文本概括助手。',
    '目标：将提供的对话与文件内容进行高质量、结构化的总结。',
    '要求：',
    '- 保留关键信息、结论与决策，删除冗余与重复。',
    '- 用分点或小节组织结果，语言简洁清晰。',
    '- 若上下文包含多个文件或主题，请归类整理。',
    '- 不臆测缺失信息，必要时标注"信息不足"。'
  ].join('\n')
}

/**
 * 构建概括计划
 * @param inputResidual 用户额外输入的概括指令
 * @param conversationHistoryText 当前对话的历史上下文（已根据 historyLimit 截断）
 * @param filesText 选中的文件内容
 */
export function buildSummarizePlan(
  inputResidual?: string,
  conversationHistoryText?: string,
  filesText?: string
): SummarizePlan {
  const trimmedInput = (inputResidual || '').trim()
  const userMessageContent = trimmedInput || '请对以下内容进行高质量概括'

  // 组装额外上下文：对话历史 + 文件内容
  const contextParts: string[] = []
  
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

  const systemPrompt = buildSystemPrompt()

  return {
    userMessageContent,
    extraContext,
    systemPrompt
  }
}

export type { SummarizePlan as SummaryPlan }


