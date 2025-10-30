/**
 * Agent 任务基础工具库
 * 
 * 导出所有通用工具、模板和辅助函数
 * 用于快速创建新的任务类型
 */

// 通用工具函数
export {
  getApiProvider,
  generateTaskId,
  buildSuccessResult,
  buildErrorResult,
  buildCancelledResult,
  validateApiProvider,
  normalizeInput,
  isValidInput
} from './task-utils'

// 单次通信任务模板
export { executeSimpleLLMTask } from './simple-llm-task'
export type { SimpleLLMTaskConfig } from './simple-llm-task'

// 判断任务模板
export { executeJudgmentTask, JudgmentParsers, ReasonExtractors } from './judgment-task'
export type { JudgmentTaskConfig, JudgmentOutput } from './judgment-task'

