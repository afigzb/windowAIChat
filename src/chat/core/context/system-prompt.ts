import type { AIConfig } from '../../types'

// 系统提示词转换器：用于在基础提示词上进行追加/裁剪/重写等操作
export type SystemPromptTransformer = (prompt: string) => string

class SystemPromptController {
  private runtimePrompt: string | null = null
  private transformers: SystemPromptTransformer[] = []
  private isOverrideMode: boolean = false // 覆盖模式标志：true时完全覆盖，不应用任何转换器或外部追加

  // 设定一次性运行时覆盖（不改动配置里的 systemPrompt）
  // override=true 表示完全覆盖模式，将阻止 prompt 卡片等操作符追加内容
  setRuntimePrompt(prompt: string | null, override: boolean = false) {
    this.runtimePrompt = prompt && prompt.trim() ? prompt : null
    this.isOverrideMode = override
  }

  // 清除运行时覆盖
  clearRuntimePrompt() {
    this.runtimePrompt = null
    this.isOverrideMode = false
  }

  // 检查是否处于覆盖模式
  isInOverrideMode(): boolean {
    return this.isOverrideMode
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
export const setSystemPrompt = (prompt: string | null, override: boolean = false) => systemPrompt.setRuntimePrompt(prompt, override)
export const clearSystemPrompt = () => systemPrompt.clearRuntimePrompt()
export const addSystemPromptTransformer = (t: SystemPromptTransformer) => systemPrompt.addTransformer(t)
export const isInOverrideMode = () => systemPrompt.isInOverrideMode()


