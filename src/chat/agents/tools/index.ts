/**
 * 工具系统导出
 */

import { createJudgmentTool as _createJudgmentTool } from './judgment'
import { createTransformTool as _createTransformTool } from './transform'
import { createGenerationTool as _createGenerationTool } from './generation'

export { JudgmentTool, createJudgmentTool } from './judgment'
export { TransformTool, createTransformTool } from './transform'
export { GenerationTool, createGenerationTool } from './generation'

/**
 * 工具工厂：根据配置创建工具实例
 */
export function createTool(
  config: import('../types').JudgmentToolConfig | import('../types').TransformToolConfig | import('../types').GenerationToolConfig
): import('../types').Tool {
  switch (config.type) {
    case 'judgment':
      return _createJudgmentTool(config)
    
    case 'transform':
      return _createTransformTool(config)
    
    case 'generation':
      return _createGenerationTool(config)
    
    default:
      throw new Error(`未知的工具类型: ${(config as any).type}`)
  }
}

