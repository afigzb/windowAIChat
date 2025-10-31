/**
 * 动态Agent执行引擎
 * 
 * 实现ReAct模式：Reasoning + Acting
 * 让AI自主决策、调用工具、根据结果动态调整行动
 */

import type { AIConfig, FlatMessage } from '../types'
import { toolRegistry, type ToolExecutionContext } from './tool-registry'
import { callSimpleAPI } from './simple-api'
import { createRawData, type RawData } from './raw-data'

// ============================================================
// 类型定义
// ============================================================

/**
 * Agent步骤类型
 */
export type AgentStepType = 'thought' | 'action' | 'observation' | 'final_answer'

/**
 * Agent执行步骤
 */
export interface AgentStep {
  /** 步骤序号 */
  stepNumber: number
  
  /** 步骤类型 */
  type: AgentStepType
  
  /** 思考内容（type=thought） */
  thought?: string
  
  /** 工具调用（type=action） */
  action?: {
    toolId: string
    toolName: string
    params: any
  }
  
  /** 观察结果（type=observation） */
  observation?: {
    success: boolean
    output: any
    error?: string
  }
  
  /** 最终答案（type=final_answer） */
  finalAnswer?: string
  
  /** 时间戳 */
  timestamp: number
  
  /** 耗时（ms） */
  duration?: number
}

/**
 * Agent执行配置
 */
export interface DynamicAgentConfig {
  /** 最大步骤数（防止无限循环） */
  maxSteps?: number
  
  /** 是否启用详细日志 */
  verbose?: boolean
  
  /** 自定义系统提示词 */
  customSystemPrompt?: string
}

/**
 * Agent执行结果
 */
export interface DynamicAgentResult {
  /** 是否成功 */
  success: boolean
  
  /** 最终答案 */
  finalAnswer?: string
  
  /** 所有执行步骤 */
  steps: AgentStep[]
  
  /** 总耗时 */
  totalDuration: number
  
  /** 原始数据（最终状态） */
  rawData: RawData
  
  /** 错误信息 */
  error?: string
}

/**
 * Agent执行输入
 */
export interface DynamicAgentInput {
  userInput: string
  attachedFiles?: string[]
  conversationHistory?: FlatMessage[]
  aiConfig: AIConfig
  config?: DynamicAgentConfig
  abortSignal?: AbortSignal
  onProgress?: (step: AgentStep) => void
}

// ============================================================
// Agent执行引擎
// ============================================================

/**
 * 构建Agent系统提示词
 */
function buildAgentSystemPrompt(customPrompt?: string): string {
  const toolsDescription = toolRegistry.getToolsDescription()
  
  return `${customPrompt || '你是一个智能Agent助手，能够分析问题、调用工具、完成复杂任务。'}

## 你的能力

你可以调用以下工具来完成任务：

${toolsDescription}

## 工作模式

你需要按照以下格式进行思考和行动：

<思考>
分析当前情况，思考下一步应该做什么
</思考>

<行动>
工具ID: tool_id
参数: {"param1": "value1", "param2": "value2"}
</行动>

系统会执行你的行动并返回结果，格式为：

<观察>
工具执行结果
</观察>

你可以继续思考和行动，直到认为可以给出最终答案。

当你准备好回答用户时，使用：

<最终答案>
你的完整答案
</最终答案>

## 重要规则

1. 每次只能执行一个行动
2. 必须先思考再行动
3. 根据观察结果调整策略
4. 不要重复无效的行动
5. 当收集到足够信息后，及时给出最终答案
6. 参数必须是有效的JSON格式

现在开始处理用户的请求吧！`
}

/**
 * 解析AI响应
 */
function parseAgentResponse(response: string): {
  thought?: string
  action?: { toolId: string; params: any }
  finalAnswer?: string
} {
  const result: any = {}
  
  // 提取思考
  const thoughtMatch = response.match(/<思考>(.*?)<\/思考>/s)
  if (thoughtMatch) {
    result.thought = thoughtMatch[1].trim()
  }
  
  // 提取行动
  const actionMatch = response.match(/<行动>(.*?)<\/行动>/s)
  if (actionMatch) {
    const actionContent = actionMatch[1].trim()
    
    // 解析工具ID
    const toolIdMatch = actionContent.match(/工具ID\s*[:：]\s*(\w+)/i)
    if (toolIdMatch) {
      result.action = { toolId: toolIdMatch[1], params: {} }
      
      // 解析参数
      const paramsMatch = actionContent.match(/参数\s*[:：]\s*(\{.*?\})/s)
      if (paramsMatch) {
        try {
          result.action.params = JSON.parse(paramsMatch[1])
        } catch (e) {
          console.error('[Agent] 参数解析失败:', paramsMatch[1])
        }
      }
    }
  }
  
  // 提取最终答案
  const finalMatch = response.match(/<最终答案>(.*?)<\/最终答案>/s)
  if (finalMatch) {
    result.finalAnswer = finalMatch[1].trim()
  }
  
  return result
}

/**
 * 执行动态Agent
 */
export async function executeDynamicAgent(
  input: DynamicAgentInput
): Promise<DynamicAgentResult> {
  const startTime = Date.now()
  const config = input.config || {}
  const maxSteps = config.maxSteps || 10
  const verbose = config.verbose ?? true
  
  if (verbose) {
    console.log('[DynamicAgent] 开始执行')
    console.log('[DynamicAgent] 用户输入:', input.userInput)
  }
  
  // 创建原始数据仓库
  const rawData = createRawData(
    input.userInput,
    input.attachedFiles,
    input.conversationHistory
  )
  
  // 构建工具执行上下文
  const toolContext: ToolExecutionContext = {
    aiConfig: input.aiConfig,
    rawData,
    abortSignal: input.abortSignal
  }
  
  // 构建系统提示词
  const systemPrompt = buildAgentSystemPrompt(config.customSystemPrompt)
  
  // 初始化对话历史（用于多轮对话）
  const agentConversation: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: `用户请求：${input.userInput}${
        input.attachedFiles && input.attachedFiles.length > 0
          ? `\n\n附加了 ${input.attachedFiles.length} 个文件`
          : ''
      }`
    }
  ]
  
  // 执行步骤记录
  const steps: AgentStep[] = []
  let stepNumber = 0
  let finalAnswer: string | undefined
  
  try {
    // 循环执行：思考 → 行动 → 观察
    while (stepNumber < maxSteps) {
      // 检查中止信号
      if (input.abortSignal?.aborted) {
        throw new Error('Agent执行已中止')
      }
      
      stepNumber++
      const stepStartTime = Date.now()
      
      if (verbose) {
        console.log(`\n[DynamicAgent] ===== 步骤 ${stepNumber} =====`)
      }
      
      // 1. 让AI思考和决策
      // 获取当前provider配置
      const currentProvider = input.aiConfig.providers.find(
        p => p.id === input.aiConfig.currentProviderId
      )
      
      if (!currentProvider) {
        throw new Error('未找到当前API配置')
      }
      
      // 构建消息历史
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...agentConversation.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ]
      
      const aiResponse = await callSimpleAPI(
        messages,
        currentProvider,
        input.aiConfig,
        input.abortSignal
      )
      
      if (verbose) {
        console.log('[DynamicAgent] AI响应:', aiResponse)
      }
      
      // 2. 解析AI的响应
      const parsed = parseAgentResponse(aiResponse)
      
      // 3. 处理思考
      if (parsed.thought) {
        const thoughtStep: AgentStep = {
          stepNumber,
          type: 'thought',
          thought: parsed.thought,
          timestamp: Date.now(),
          duration: Date.now() - stepStartTime
        }
        
        steps.push(thoughtStep)
        
        if (verbose) {
          console.log('[DynamicAgent] 思考:', parsed.thought)
        }
        
        if (input.onProgress) {
          input.onProgress(thoughtStep)
        }
      }
      
      // 4. 处理最终答案
      if (parsed.finalAnswer) {
        finalAnswer = parsed.finalAnswer
        
        const finalStep: AgentStep = {
          stepNumber,
          type: 'final_answer',
          finalAnswer,
          timestamp: Date.now(),
          duration: Date.now() - stepStartTime
        }
        
        steps.push(finalStep)
        
        if (verbose) {
          console.log('[DynamicAgent] 最终答案:', finalAnswer)
        }
        
        if (input.onProgress) {
          input.onProgress(finalStep)
        }
        
        break
      }
      
      // 5. 处理行动
      if (parsed.action) {
        const { toolId, params } = parsed.action
        const tool = toolRegistry.getTool(toolId)
        
        const actionStep: AgentStep = {
          stepNumber,
          type: 'action',
          action: {
            toolId,
            toolName: tool?.name || toolId,
            params
          },
          timestamp: Date.now()
        }
        
        steps.push(actionStep)
        
        if (verbose) {
          console.log('[DynamicAgent] 行动:', toolId, params)
        }
        
        if (input.onProgress) {
          input.onProgress(actionStep)
        }
        
        // 6. 执行工具
        const toolResult = await toolRegistry.executeTool(toolId, params, toolContext)
        
        // 7. 记录观察结果
        const observationStep: AgentStep = {
          stepNumber,
          type: 'observation',
          observation: {
            success: toolResult.success,
            output: toolResult.output,
            error: toolResult.error
          },
          timestamp: Date.now(),
          duration: Date.now() - stepStartTime
        }
        
        steps.push(observationStep)
        
        if (verbose) {
          console.log('[DynamicAgent] 观察:', toolResult)
        }
        
        if (input.onProgress) {
          input.onProgress(observationStep)
        }
        
        // 8. 将观察结果添加到对话
        agentConversation.push({
          role: 'assistant',
          content: aiResponse
        })
        
        const observationText = toolResult.success
          ? `<观察>\n成功：${typeof toolResult.output === 'object' ? JSON.stringify(toolResult.output, null, 2) : toolResult.output}\n</观察>`
          : `<观察>\n失败：${toolResult.error}\n</观察>`
        
        agentConversation.push({
          role: 'user',
          content: observationText
        })
        
      } else if (!parsed.finalAnswer) {
        // 既没有行动也没有最终答案，可能是格式错误
        if (verbose) {
          console.warn('[DynamicAgent] AI响应格式不正确，尝试引导')
        }
        
        agentConversation.push({
          role: 'assistant',
          content: aiResponse
        })
        
        agentConversation.push({
          role: 'user',
          content: '请按照正确的格式回答：使用<思考>、<行动>或<最终答案>标签。'
        })
      }
    }
    
    // 检查是否达到最大步数
    if (stepNumber >= maxSteps && !finalAnswer) {
      console.warn('[DynamicAgent] 达到最大步数限制，强制结束')
      
      // 尝试让AI给出最终答案
      agentConversation.push({
        role: 'user',
        content: '已达到最大步数，请立即给出<最终答案>。'
      })
      
      const currentProvider = input.aiConfig.providers.find(
        p => p.id === input.aiConfig.currentProviderId
      )
      
      if (!currentProvider) {
        throw new Error('未找到当前API配置')
      }
      
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...agentConversation.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ]
      
      const finalResponse = await callSimpleAPI(
        messages,
        currentProvider,
        input.aiConfig,
        input.abortSignal
      )
      
      const parsed = parseAgentResponse(finalResponse)
      finalAnswer = parsed.finalAnswer || '抱歉，未能在规定步数内完成任务。'
    }
    
    const totalDuration = Date.now() - startTime
    
    if (verbose) {
      console.log(`\n[DynamicAgent] 执行完成`)
      console.log(`  总步数: ${stepNumber}`)
      console.log(`  总耗时: ${totalDuration}ms`)
    }
    
    return {
      success: true,
      finalAnswer,
      steps,
      totalDuration,
      rawData
    }
    
  } catch (error: any) {
    console.error('[DynamicAgent] 执行异常:', error)
    
    return {
      success: false,
      steps,
      totalDuration: Date.now() - startTime,
      rawData,
      error: error.message
    }
  }
}

/**
 * 格式化Agent结果用于UI展示
 */
export function formatAgentResultForUI(result: DynamicAgentResult): string {
  let output = '# Agent执行过程\n\n'
  
  for (const step of result.steps) {
    switch (step.type) {
      case 'thought':
        output += `## 💭 思考 (步骤 ${step.stepNumber})\n${step.thought}\n\n`
        break
      
      case 'action':
        output += `## 🔧 行动 (步骤 ${step.stepNumber})\n`
        output += `- 工具: ${step.action?.toolName}\n`
        output += `- 参数: \`${JSON.stringify(step.action?.params)}\`\n\n`
        break
      
      case 'observation':
        output += `## 👁️ 观察 (步骤 ${step.stepNumber})\n`
        if (step.observation?.success) {
          output += `✓ 成功\n\n结果：\n${typeof step.observation.output === 'object' ? '```json\n' + JSON.stringify(step.observation.output, null, 2) + '\n```' : step.observation.output}\n\n`
        } else {
          output += `✗ 失败：${step.observation?.error}\n\n`
        }
        break
      
      case 'final_answer':
        output += `## ✨ 最终答案\n\n${step.finalAnswer}\n\n`
        break
    }
  }
  
  output += `---\n总耗时: ${result.totalDuration}ms`
  
  return output
}

