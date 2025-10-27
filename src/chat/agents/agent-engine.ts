/**
 * Agent Engine - Agent 任务编排引擎
 * 
 * 负责：
 * 1. 管理和注册 Agent 任务处理器
 * 2. 按顺序执行启用的任务
 * 3. 处理任务链的数据流转
 * 4. 提供任务执行的统一接口
 */

import type { 
  AgentTaskProcessor, 
  AgentTaskContext, 
  AgentTaskConfig,
  AgentTaskResult,
  AgentEngineConfig,
  AgentTaskType
} from './types'
import type { MessageComponents } from '../types'

export class AgentEngine {
  private processors = new Map<AgentTaskType, AgentTaskProcessor>()

  /**
   * 注册任务处理器
   */
  registerProcessor(processor: AgentTaskProcessor): void {
    this.processors.set(processor.type, processor)
  }

  /**
   * 处理用户输入
   * 按顺序执行所有启用的任务
   * 
   * @param userInput 用户真实输入
   * @param components 消息组件（包含附加文件等）
   * @param config Agent 配置
   * @param aiConfig AI 配置
   * @param abortSignal 中断信号
   * @param onStream 流式输出回调（可选）
   * @returns 处理结果和元数据
   */
  async processUserInput(
    userInput: string,
    components: MessageComponents | undefined,
    engineConfig: AgentEngineConfig,
    aiConfig: import('../types').AIConfig,
    abortSignal?: AbortSignal,
    onStream?: (content: string) => void
  ): Promise<{
    finalInput: string
    results: AgentTaskResult[]
  }> {
    // 如果 Agent 系统未启用，直接返回原始输入
    if (!engineConfig.enabled) {
      return {
        finalInput: userInput,
        results: []
      }
    }

    const enabledTasks = engineConfig.tasks.filter(task => task.enabled)
    
    // 如果没有启用的任务，直接返回原始输入
    if (enabledTasks.length === 0) {
      return {
        finalInput: userInput,
        results: []
      }
    }

    // 构建任务上下文
    const context: AgentTaskContext = {
      userInput,
      attachedFiles: components?.attachedFiles,
      config: aiConfig
    }

    const results: AgentTaskResult[] = []
    let currentInput = userInput

    // 按顺序执行任务
    for (const taskConfig of enabledTasks) {
      const processor = this.processors.get(taskConfig.type)
      
      if (!processor) {
        console.warn(`未找到任务处理器: ${taskConfig.type}`)
        continue
      }

      try {
        // 更新上下文中的输入为当前处理后的输入
        context.userInput = currentInput

        // 执行任务，传递流式回调
        const result = await processor.process(context, taskConfig, abortSignal, onStream)
        results.push(result)

        // 如果任务成功且返回了优化后的输入，更新当前输入
        if (result.success && result.optimizedInput) {
          currentInput = result.optimizedInput
        }
      } catch (error: any) {
        console.error(`任务 ${taskConfig.name} 执行失败:`, error)
        
        // 记录失败结果
        results.push({
          success: false,
          optimizedInput: currentInput,
          metadata: {
            taskType: taskConfig.type,
            originalInput: currentInput,
            error: error.message || '任务执行失败'
          }
        })
      }
    }

    return {
      finalInput: currentInput,
      results
    }
  }

  /**
   * 获取已注册的处理器列表
   */
  getRegisteredProcessors(): AgentTaskProcessor[] {
    return Array.from(this.processors.values())
  }

  /**
   * 检查是否有处理器注册
   */
  hasProcessor(type: AgentTaskType): boolean {
    return this.processors.has(type)
  }
}

// 创建全局实例
export const agentEngine = new AgentEngine()

