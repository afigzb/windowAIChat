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

export function buildSummarizePlan(
  inputResidual?: string,
  filesText?: string
): SummarizePlan {
  const trimmedInput = (inputResidual || '').trim()
  const userMessageContent = trimmedInput || '请对以下内容进行高质量概括'

  const trimmedFiles = (filesText || '').trim()
  const extraContext = trimmedFiles ? `\n\n${trimmedFiles}` : ''

  const systemPrompt = buildSystemPrompt()

  return {
    userMessageContent,
    extraContext,
    systemPrompt
  }
}

export type { SummarizePlan as SummaryPlan }


