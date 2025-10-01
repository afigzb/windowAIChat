import type { AIConfig } from '../../types'

// 系统提示词转换器：用于在基础提示词上进行追加/裁剪/重写等操作
export type SystemPromptTransformer = (prompt: string) => string

class SystemPromptController {
  private runtimePrompt: string | null = null
  private transformers: SystemPromptTransformer[] = []

  // 设定一次性运行时覆盖（不改动配置里的 systemPrompt）
  setRuntimePrompt(prompt: string | null) {
    this.runtimePrompt = prompt && prompt.trim() ? prompt : null
  }

  // 清除运行时覆盖
  clearRuntimePrompt() {
    this.runtimePrompt = null
  }

  // 注册转换器，返回取消函数，确保低耦合可插拔
  addTransformer(transformer: SystemPromptTransformer): () => void {
    this.transformers.push(transformer)
    return () => {
      const idx = this.transformers.indexOf(transformer)
      if (idx >= 0) this.transformers.splice(idx, 1)
    }
  }

  // 获取最终提示词：优先使用运行时覆盖，否则取配置；随后应用变换器
  getPrompt(config: AIConfig): string {
    const base = (this.runtimePrompt && this.runtimePrompt.trim()) || (config.systemPrompt || '')
    return this.transformers.reduce((acc, fn) => {
      try {
        return fn(acc)
      } catch {
        return acc
      }
    }, base)
  }
}

export const systemPrompt = new SystemPromptController()


// 便捷导出的方法（便于按需导入）
export const setSystemPrompt = (prompt: string | null) => systemPrompt.setRuntimePrompt(prompt)
export const clearSystemPrompt = () => systemPrompt.clearRuntimePrompt()
export const addSystemPromptTransformer = (t: SystemPromptTransformer) => systemPrompt.addTransformer(t)


