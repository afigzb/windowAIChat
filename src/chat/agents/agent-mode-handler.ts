/**
 * 自动挡处理器 - Agent Pipeline 模式
 */

import type { 
  InitialRequestData, 
  RequestResult, 
  StreamCallbacks,
  MessageComponents,
  FlatMessage
} from '../types'
import { runAgentEngine } from '../agents/agent-engine'
import { type Message } from '../agents/workspace-data'
import { systemPrompt } from '../core/context/system-prompt'

/**
 * 消息来源类型
 */
type MessageSource = 
  | 'system_prompt'      // 系统提示词
  | 'context'            // 对话历史上下文
  | 'prompt_card'        // 提示词卡片
  | 'file'               // 附加文件
  | 'user_input'         // 用户当前输入

/**
 * 追踪消息来源的辅助结构
 */
interface MessageSourceInfo {
  start: number          // 在最终消息数组中的起始索引
  end: number            // 在最终消息数组中的结束索引（不包含）
  source: MessageSource  // 来源类型
  metadata?: any         // 额外的元数据
}

/**
 * 构建带标记的 messages 数组（新版本）
 * 
 * 核心思路：
 * 1. 分步骤构建各个部分的消息，记录每部分的位置
 * 2. 使用 contextEngine 的处理逻辑来模拟最终的消息顺序和内容
 * 3. 根据位置信息为每条消息添加来源标记
 * 
 * @param data 初始请求数据
 * @returns 带标记的标准格式消息数组
 */
function buildMessages(data: InitialRequestData): { messages: Message[]; rawUserInput: string } {
  const messages: Message[] = []
  const sourceMap: MessageSourceInfo[] = []
  let currentIndex = 0
  
  // 获取提示词卡片（从 userMessageNode.components.promptCards 中读取）
  const promptCards = data.userMessageNode.components?.promptCards || []
  console.log('[AgentMode] 提示词卡片数量:', promptCards.length)
  if (promptCards.length > 0) {
    console.log('[AgentMode] 提示词卡片位置分布:', 
      promptCards.reduce((acc, card) => {
        acc[card.placement] = (acc[card.placement] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    )
  }
  
  // ==================== 阶段1：构建系统提示词 ====================
  const finalSystemPrompt = systemPrompt.getPrompt(data.aiConfig)
  if (finalSystemPrompt && finalSystemPrompt.trim()) {
    messages.push({
      role: 'system',
      content: finalSystemPrompt.trim(),
      _meta: {
        type: 'system_prompt',
        needsProcessing: false,
        originalIndex: currentIndex
      }
    })
    sourceMap.push({
      start: currentIndex,
      end: currentIndex + 1,
      source: 'system_prompt'
    })
    currentIndex++
  }
  
  // ==================== 阶段2：插入提示词卡片和文件（after_system 位置） ====================
  // 根据 fileContentPlacement 配置决定插入位置
  const placement = data.aiConfig.fileContentPlacement || 'append'
  
  if (placement === 'after_system') {
    // 收集需要插入的内容及其优先级
    type InsertItem = {
      priority: number
      source: MessageSource
      content: string
      metadata?: any
    }
    
    const itemsToInsert: InsertItem[] = []
    
    // 收集提示词卡片（仅 after_system 位置）
    promptCards
      .filter(card => card.placement === 'after_system')
      .forEach(card => {
        itemsToInsert.push({
          priority: (card as any).priority || 50, // 默认优先级50
          source: 'prompt_card',
          content: card.content,
          metadata: { title: card.title, cardId: card.id }
        })
      })
    
    // 收集文件内容
    const filePriority = data.aiConfig.fileContentPriority ?? 10
    const fileMode = data.aiConfig.fileContentMode || 'merged'
    
    if (fileMode === 'separate' && data.attachedContents.length > 0) {
      // 独立模式：每个文件单独插入
      data.attachedContents.forEach((fileContent, fileIndex) => {
        if (fileContent.trim()) {
          itemsToInsert.push({
            priority: filePriority,
            source: 'file',
            content: fileContent,
            metadata: { fileIndex }
          })
        }
      })
    } else if (data.attachedContents.length > 0) {
      // 合并模式：所有文件合并为一条
      const mergedContent = data.attachedContents.join('\n\n---\n\n')
      itemsToInsert.push({
        priority: filePriority,
        source: 'file',
        content: mergedContent,
        metadata: { fileCount: data.attachedContents.length }
      })
    }
    
    // 按优先级降序排序
    itemsToInsert.sort((a, b) => b.priority - a.priority)
    
    // 插入消息
    itemsToInsert.forEach(item => {
      messages.push({
        role: 'user',
        content: item.content,
        _meta: {
          type: item.source,
          needsProcessing: item.source === 'file',
          originalIndex: currentIndex,
          ...item.metadata
        }
      })
      sourceMap.push({
        start: currentIndex,
        end: currentIndex + 1,
        source: item.source,
        metadata: item.metadata
      })
      currentIndex++
    })
  }
  
  // ==================== 阶段3：处理对话历史 ====================
  // 应用历史限制
  const historyLimit = data.aiConfig.historyLimit || 0
  const historyToInclude = historyLimit > 0 
    ? data.conversationHistory.slice(-historyLimit)
    : data.conversationHistory
  
  const historyStartIndex = currentIndex
  historyToInclude.forEach(msg => {
    messages.push({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
      _meta: {
        type: 'context',
        needsProcessing: true,
        canMerge: true,
        originalIndex: currentIndex
      }
    })
    currentIndex++
  })
  
  if (historyToInclude.length > 0) {
    sourceMap.push({
      start: historyStartIndex,
      end: currentIndex,
      source: 'context'
    })
  }
  
  // ==================== 阶段4：处理其他位置的提示词卡片 ====================
  // system 位置的卡片 - 追加到系统提示词
  const systemCards = promptCards.filter(card => card.placement === 'system')
  if (systemCards.length > 0) {
    const systemContent = systemCards.map(c => c.content).join('\n\n')
    
    // 如果已有系统提示词，追加；否则创建新的系统消息
    if (messages[0]?.role === 'system') {
      messages[0].content += '\n\n' + systemContent
    } else {
      // 在开头插入系统提示词
      messages.unshift({
        role: 'system',
        content: systemContent,
        _meta: {
          type: 'system_prompt',
          needsProcessing: false,
          originalIndex: 0
        }
      })
      // 更新后续消息的索引
      currentIndex++
    }
  }
  
  // user_end 位置的卡片会在最后和用户输入一起处理
  
  // ==================== 阶段5：添加用户输入 ====================
  // 如果是 append 模式且有附加文件，需要将文件内容附加到用户输入
  let userInputContent = data.userInput.trim()
  
  if (placement === 'append' && data.attachedContents.length > 0) {
    const fileContent = data.attachedContents.join('\n\n---\n\n')
    userInputContent = userInputContent + '\n\n' + fileContent
    
    // 记录文件来源（虽然合并到了用户输入中）
    sourceMap.push({
      start: currentIndex,
      end: currentIndex + 1,
      source: 'file',
      metadata: { mergedWithUserInput: true }
    })
  }
  
  // 添加 user_end 位置的提示词卡片
  const userEndCards = promptCards.filter(card => card.placement === 'user_end')
  if (userEndCards.length > 0) {
    userInputContent += '\n\n' + userEndCards.map(c => c.content).join('\n\n')
  }
  
  messages.push({
    role: 'user',
    content: userInputContent,
    _meta: {
      type: 'user_input',
      needsProcessing: false,
      originalIndex: currentIndex
    }
  })
  sourceMap.push({
    start: currentIndex,
    end: currentIndex + 1,
    source: 'user_input'
  })
  currentIndex++
  
  console.log('[AgentMode] 构建消息完成:', {
    totalMessages: messages.length,
    sourceMap: sourceMap.map(s => `${s.source}(${s.start}-${s.end})`).join(', ')
  })
  
  return {
    messages,
    rawUserInput: data.userInput
  }
}

// convertExecutionLogForUI 已移至 ui-formatters.ts

/**
 * 自动模式处理器
 * 
 * @param data 初始请求数据
 * @param callbacks 流式回调
 * @returns 请求结果
 */
export async function executeAgentMode(
  data: InitialRequestData,
  callbacks: StreamCallbacks
): Promise<RequestResult> {
  console.log('[AgentMode] 开始执行 Agent Engine（重构版）')
  
  try {
    console.log('[AgentMode] 使用的数据:', {
      userInputLength: data.userInput.length,
      attachedContentsCount: data.attachedContents.length,
      promptCardsCount: data.userMessageNode.components?.promptCards?.length || 0,
      historyLength: data.conversationHistory.length,
      agentConfig: data.aiConfig.agentConfig
    })
    
    // ========== 调试：查看原始消息（打标签之前） ==========
    console.log('========= 调试：查看原始消息（打标签之前） =========');
    console.log('原始输入：', data);
    
    // 1. 构建带标记的 messages 数组
    const { messages, rawUserInput } = buildMessages(data)
    
    console.log('[AgentMode] 构建的 messages 数量:', messages.length)
    
    // 消息类型统计
    const typeCount: Record<string, number> = {}
    messages.forEach(m => {
      typeCount[m._meta.type] = (typeCount[m._meta.type] || 0) + 1
    })
    console.log('[AgentMode] 消息类型分布:', typeCount)
    
    // 2. 调用 Agent Engine（简化版）
    const result = await runAgentEngine({
      messages,
      rawUserInput,
      aiConfig: data.aiConfig,
      config: {
        verbose: true,
        onProgress: callbacks.onAgentProgress
          ? (message, stage) => {
            const stageIcon = {
              preprocessing: '🔍',
              generating: '✨'
            }[stage]
            
            if (callbacks.onAgentProgress) {
              callbacks.onAgentProgress(`${stageIcon} ${message}`)
            }
          }
          : undefined
      },
      abortSignal: data.abortSignal
    })
    
    if (!result.success || !result.finalAnswer) {
      throw new Error(result.error || 'Agent Engine 执行失败')
    }
    
    console.log('[AgentMode] Agent Engine 执行成功:', {
      success: result.success,
      tokensUsed: result.tokensUsed
    })
    
    // 3. 返回结果
    return {
      content: result.finalAnswer,
      reasoning_content: undefined,
      components: undefined
    }
    
  } catch (error: any) {
    console.error('[AgentMode] Agent Engine 执行失败:', error)
    
    // Agent 模式失败时，返回错误信息
    return {
      content: `Agent 执行失败: ${error.message || '未知错误'}`,
      reasoning_content: undefined,
      components: undefined
    }
  }
}

