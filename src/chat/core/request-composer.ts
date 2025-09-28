import type { FlatMessage, AIConfig } from '../types'

interface ComposeOptions {
  history: FlatMessage[]
  config: AIConfig
  extraContextText?: string
}

/**
 * 将对话历史、系统提示与可选上下文统一整合为标准化消息数组
 * 输出仅包含 role/content 字段，供各适配器转换为目标供应商格式
 */
export function composeMessages({ history, config, extraContextText }: ComposeOptions): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  // 1) 系统提示 + 日期
  const currentDate = new Date().toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
  const systemPrompt = `${config.systemPrompt}\n今天是${currentDate}。`

  const result: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []
  result.push({ role: 'system', content: systemPrompt })

  // 2) 额外上下文作为独立消息（不入库，仅本次调用可见）
  if (extraContextText && extraContextText.trim()) {
    const trimmed = extraContextText.trim()
    // 使用明确的上下文标题与分隔，避免与用户输入混淆
    const contextMessage = `【上下文】\n${trimmed}`
    // 采用 user 角色便于多数模型将其视为用户输入的一部分
    result.push({ role: 'user', content: contextMessage })
  }

  // 3) 仅保留 user/assistant 历史，并按 historyLimit 截断（末尾优先）
  const plainHistory = history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: m.content }))

  const limited = config.historyLimit > 0
    ? plainHistory.slice(-config.historyLimit)
    : plainHistory

  result.push(...limited)

  return result
}


