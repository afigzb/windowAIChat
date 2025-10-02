import { useState } from 'react'
import type { AIConfig } from '../chat'
import { DEFAULT_SUMMARIZE_PROMPT } from '../chat/core/defaults'
import { DEFAULT_COMPRESSION_OPTIONS, type TextCompressionOptions } from '../chat/core/context/text-compressor'
import { Icon } from '../chat/ui/components'

interface SettingsPanelProps {
  config: AIConfig
  onConfigChange: (config: AIConfig) => void
  onRequestReset: () => void
}

export function SettingsPanel({ config, onConfigChange, onRequestReset }: SettingsPanelProps) {
  const [isSummarizeFocused, setIsSummarizeFocused] = useState(false)
  const [showCompressionOptions, setShowCompressionOptions] = useState(false)
  
  // 获取当前压缩选项，如果未设置则使用默认值
  const compressionOptions = config.compressionOptions || DEFAULT_COMPRESSION_OPTIONS
  
  // 更新单个压缩选项
  const updateCompressionOption = <K extends keyof TextCompressionOptions>(
    key: K,
    value: TextCompressionOptions[K]
  ) => {
    onConfigChange({
      ...config,
      compressionOptions: {
        ...compressionOptions,
        [key]: value
      }
    })
  }
  
  // 恢复压缩选项默认值
  const resetCompressionOptions = () => {
    onConfigChange({
      ...config,
      compressionOptions: DEFAULT_COMPRESSION_OPTIONS
    })
  }

  return (
    <div className="h-full bg-white border-l border-slate-300 flex flex-col">
      <div className="h-16 px-4 border-b border-slate-200 flex items-center">
        <h2 className="font-semibold text-slate-900">设置</h2>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              历史消息保留数量 ({config.historyLimit}条消息)
            </label>
            <div className="px-4 py-6 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="range"
                min={4}
                max={80}
                step={2}
                value={config.historyLimit}
                onChange={(e) => onConfigChange({ ...config, historyLimit: parseInt(e.target.value, 10) })}
                className="w-full accent-blue-600"
              />
              <div className="relative text-xs text-gray-500">
                <span className="absolute left-0">4条</span>
                <span className="absolute left-[21%] -translate-x-1/2">20条</span>
                <span className="absolute left-[47.4%] -translate-x-1/2">40条 推荐</span>
                <span className="absolute left-[73.7%] -translate-x-1/2">60条</span>
                <span className="absolute right-0">80条</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">为节约 tokens，只保留最近的消息发送给 AI</div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={config.enableCompression ?? false}
                onChange={(e) => onConfigChange({ ...config, enableCompression: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  启用文本压缩
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  自动压缩发送内容中的多余空白和换行，减少 tokens 消耗
                </p>
              </div>
            </label>
            
            {config.enableCompression && (
              <div className="ml-7 mt-3 space-y-3">
                <button
                  onClick={() => setShowCompressionOptions(!showCompressionOptions)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                >
                  <Icon 
                    name={showCompressionOptions ? 'chevronDown' : 'chevronRight'} 
                    className="w-3 h-3"
                  />
                  <span>压缩选项配置</span>
                </button>
                
                {showCompressionOptions && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">详细设置</span>
                      <button
                        onClick={resetCompressionOptions}
                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        恢复默认
                      </button>
                    </div>
                    
                    {/* 基础空白处理 */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-700">基础空白处理</div>
                      
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compressionOptions.removeExtraWhitespace ?? false}
                          onChange={(e) => updateCompressionOption('removeExtraWhitespace', e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-xs text-gray-700">移除多余空白字符</span>
                        </div>
                      </label>
                      
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compressionOptions.trimLines ?? false}
                          onChange={(e) => updateCompressionOption('trimLines', e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-xs text-gray-700">移除行首行尾空格</span>
                        </div>
                      </label>
                      
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compressionOptions.removeEmptyLines ?? false}
                          onChange={(e) => updateCompressionOption('removeEmptyLines', e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-xs text-gray-700">移除空行</span>
                        </div>
                      </label>
                      
                      <div className="space-y-1">
                        <label className="text-xs text-gray-700">
                          压缩连续换行（保留最多 {compressionOptions.compressNewlines ?? 1} 个）
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={3}
                          value={compressionOptions.compressNewlines ?? 1}
                          onChange={(e) => updateCompressionOption('compressNewlines', parseInt(e.target.value, 10))}
                          className="w-full h-1.5 accent-blue-600"
                        />
                        <div className="relative text-xs text-gray-400 h-4">
                          <span className="absolute left-0">全部合并</span>
                          <span className="absolute left-[33.3%] -translate-x-1/2">保留1个</span>
                          <span className="absolute left-[66.7%] -translate-x-1/2">保留2个</span>
                          <span className="absolute right-0">保留3个</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Markdown/格式处理 */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="text-xs font-semibold text-gray-700">Markdown/格式处理</div>
                      
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compressionOptions.removeMarkdownStyling ?? false}
                          onChange={(e) => updateCompressionOption('removeMarkdownStyling', e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-xs text-gray-700">移除 Markdown 样式标记</span>
                          <p className="text-xs text-gray-500">如粗体、斜体等</p>
                        </div>
                      </label>
                      
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compressionOptions.compressTables ?? false}
                          onChange={(e) => updateCompressionOption('compressTables', e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-xs text-gray-700">压缩表格为紧凑格式</span>
                        </div>
                      </label>
                    </div>
                    
                    {/* 标点和符号处理 */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="text-xs font-semibold text-gray-700">标点和符号处理</div>
                      
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compressionOptions.removePunctuationSpaces ?? false}
                          onChange={(e) => updateCompressionOption('removePunctuationSpaces', e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-xs text-gray-700">移除标点符号后的多余空格</span>
                        </div>
                      </label>
                      
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compressionOptions.removeFullWidthBrackets ?? false}
                          onChange={(e) => updateCompressionOption('removeFullWidthBrackets', e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-xs text-gray-700">全角括号替换为半角</span>
                        </div>
                      </label>
                      
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compressionOptions.normalizePunctuation ?? false}
                          onChange={(e) => updateCompressionOption('normalizePunctuation', e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-xs text-gray-700">规范化标点符号（统一使用英文标点）</span>
                        </div>
                      </label>
                      
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compressionOptions.mergeRepeatedSymbols ?? false}
                          onChange={(e) => updateCompressionOption('mergeRepeatedSymbols', e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-xs text-gray-700">合并连续的重复符号</span>
                          <p className="text-xs text-gray-500">如：！！！→！</p>
                        </div>
                      </label>
                    </div>
                    
                    {/* 特殊内容处理 */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="text-xs font-semibold text-gray-700">特殊内容处理</div>
                      
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compressionOptions.removeEmojis ?? false}
                          onChange={(e) => updateCompressionOption('removeEmojis', e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-xs text-gray-700">移除 Emoji 表情</span>
                          <p className="text-xs text-gray-500">如 😀🎉 等</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={`space-y-3 p-4 rounded-xl transition-all duration-200 ${
            isSummarizeFocused 
              ? 'bg-blue-50/50 border-2 border-blue-300 shadow-sm' 
              : 'border-2 border-transparent'
          }`}>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                概括功能提示词
              </label>
              <button
                onClick={() => onConfigChange({ ...config, summarizePrompt: DEFAULT_SUMMARIZE_PROMPT })}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                恢复默认
              </button>
            </div>
            <textarea
              value={config.summarizePrompt || DEFAULT_SUMMARIZE_PROMPT}
              onChange={(e) => onConfigChange({ ...config, summarizePrompt: e.target.value })}
              onFocus={() => setIsSummarizeFocused(true)}
              onBlur={() => setIsSummarizeFocused(false)}
              className="w-full h-40 px-3 py-2 bg-white border border-slate-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="输入自定义的概括提示词..."
            />
            <div className="text-xs text-gray-500">自定义概括按钮使用的提示词，用于总结对话历史和文件内容</div>
          </div>

          <div>
            <button
              onClick={onRequestReset}
              className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-slate-50 transition-colors text-slate-700"
            >
              重置API为默认设置
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

