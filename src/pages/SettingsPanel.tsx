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
    <div className="h-full bg-gray-50 border-l border-gray-200 flex flex-col">
      {/* 顶部标题栏 */}
      <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center">
        <h2 className="text-lg font-semibold text-gray-800">设置</h2>
      </div>
      
      {/* 主内容区 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          
          {/* 历史消息保留数量 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-800">历史消息保留数量</h3>
              <p className="text-xs text-gray-500 mt-1">为节约 tokens，只保留最近的消息发送给 AI</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-5">
              <div className="mb-2 text-center">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                  {config.historyLimit} 条消息
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={80}
                step={2}
                value={config.historyLimit}
                onChange={(e) => onConfigChange({ ...config, historyLimit: parseInt(e.target.value, 10) })}
                className="w-full h-2 accent-blue-600 cursor-pointer"
              />
              <div className="relative text-xs text-gray-400 mt-3">
                <span className="absolute left-0">4</span>
                <span className="absolute left-[21%] -translate-x-1/2">20</span>
                <span className="absolute left-[47.4%] -translate-x-1/2 text-blue-600 font-medium">40 推荐</span>
                <span className="absolute left-[73.7%] -translate-x-1/2">60</span>
                <span className="absolute right-0">80</span>
              </div>
            </div>
          </div>

          {/* 选中文件插入位置 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-800">选中文件插入位置</h3>
              <p className="text-xs text-gray-500 mt-1">控制选中文件内容在发送给 AI 时的位置和优先级</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-start p-3 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                <input
                  type="radio"
                  name="fileContentPlacement"
                  checked={(config.fileContentPlacement ?? 'append') === 'append'}
                  onChange={() => onConfigChange({ ...config, fileContentPlacement: 'append' })}
                  className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <div className="ml-3 flex-1">
                  <span className="text-sm font-medium text-gray-800">用户消息尾部</span>
                  <p className="text-xs text-gray-500 mt-0.5">将选中文件内容拼接到当前输入消息的末尾</p>
                </div>
              </label>
              
              <label className="flex items-start p-3 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                <input
                  type="radio"
                  name="fileContentPlacement"
                  checked={config.fileContentPlacement === 'after_system'}
                  onChange={() => onConfigChange({ ...config, fileContentPlacement: 'after_system' })}
                  className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <div className="ml-3 flex-1">
                  <span className="text-sm font-medium text-gray-800">System 提示词之后</span>
                  <p className="text-xs text-gray-500 mt-0.5">在系统提示词后独立插入文件内容，支持优先级排序</p>
                </div>
              </label>
            </div>
            
            {/* After System 模式的额外配置 */}
            {config.fileContentPlacement === 'after_system' && (
              <div className="mt-3 ml-7 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    优先级 <span className="text-gray-400">（数值越大越靠前，默认10）</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={config.fileContentPriority ?? 10}
                    onChange={(e) => onConfigChange({ ...config, fileContentPriority: parseInt(e.target.value, 10) || 10 })}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">提示词卡片默认优先级为 5</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">插入模式</label>
                  <div className="space-y-2">
                    <label className="flex items-center p-2.5 rounded-md border border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                      <input
                        type="radio"
                        name="fileContentMode"
                        checked={(config.fileContentMode ?? 'merged') === 'merged'}
                        onChange={() => onConfigChange({ ...config, fileContentMode: 'merged' })}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300"
                      />
                      <div className="ml-2.5 flex-1">
                        <span className="text-xs font-medium text-gray-700">合并模式</span>
                        <span className="text-xs text-gray-500 ml-1.5">— 所有文件合并为一条消息</span>
                      </div>
                    </label>
                    
                    <label className="flex items-center p-2.5 rounded-md border border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                      <input
                        type="radio"
                        name="fileContentMode"
                        checked={config.fileContentMode === 'separate'}
                        onChange={() => onConfigChange({ ...config, fileContentMode: 'separate' })}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300"
                      />
                      <div className="ml-2.5 flex-1">
                        <span className="text-xs font-medium text-gray-700">独立模式</span>
                        <span className="text-xs text-gray-500 ml-1.5">— 每个文件单独插入，可拖拽排序</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 文本压缩 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={config.enableCompression ?? false}
                onChange={(e) => onConfigChange({ ...config, enableCompression: e.target.checked })}
                className="mt-0.5 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                  启用文本压缩
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  自动压缩发送内容中的多余空白和换行，减少 tokens 消耗
                </p>
              </div>
            </label>
            
            {config.enableCompression && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowCompressionOptions(!showCompressionOptions)}
                  className="flex items-center space-x-2 text-sm text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  <Icon 
                    name={showCompressionOptions ? 'chevronDown' : 'chevronRight'} 
                    className="w-4 h-4"
                  />
                  <span>压缩选项配置</span>
                </button>
                
                {showCompressionOptions && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-gray-700">详细设置</span>
                      <button
                        onClick={resetCompressionOptions}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        恢复默认
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {/* 基础空白处理 */}
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-2.5 pb-1.5 border-b border-gray-300">基础空白处理</div>
                        <div className="space-y-2">
                          <label className="flex items-center cursor-pointer hover:bg-white rounded px-2 py-1.5 transition-colors">
                            <input
                              type="checkbox"
                              checked={compressionOptions.removeExtraWhitespace ?? false}
                              onChange={(e) => updateCompressionOption('removeExtraWhitespace', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                            />
                            <span className="ml-2.5 text-xs text-gray-700">移除多余空白字符</span>
                          </label>
                          
                          <label className="flex items-center cursor-pointer hover:bg-white rounded px-2 py-1.5 transition-colors">
                            <input
                              type="checkbox"
                              checked={compressionOptions.trimLines ?? false}
                              onChange={(e) => updateCompressionOption('trimLines', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                            />
                            <span className="ml-2.5 text-xs text-gray-700">移除行首行尾空格</span>
                          </label>
                          
                          <label className="flex items-center cursor-pointer hover:bg-white rounded px-2 py-1.5 transition-colors">
                            <input
                              type="checkbox"
                              checked={compressionOptions.removeEmptyLines ?? false}
                              onChange={(e) => updateCompressionOption('removeEmptyLines', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                            />
                            <span className="ml-2.5 text-xs text-gray-700">移除空行</span>
                          </label>
                          
                          <div className="px-2 py-2 bg-white rounded">
                            <label className="text-xs text-gray-700 block mb-2">
                              压缩连续换行 <span className="text-blue-600 font-medium">（保留最多 {compressionOptions.compressNewlines ?? 1} 个）</span>
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={3}
                              value={compressionOptions.compressNewlines ?? 1}
                              onChange={(e) => updateCompressionOption('compressNewlines', parseInt(e.target.value, 10))}
                              className="w-full h-1.5 accent-blue-600 cursor-pointer"
                            />
                            <div className="relative text-xs text-gray-400 mt-2">
                              <span className="absolute left-0">全部合并</span>
                              <span className="absolute left-[33.3%] -translate-x-1/2">保留1个</span>
                              <span className="absolute left-[66.7%] -translate-x-1/2">保留2个</span>
                              <span className="absolute right-0">保留3个</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Markdown/格式处理 */}
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-2.5 pb-1.5 border-b border-gray-300">Markdown/格式处理</div>
                        <div className="space-y-2">
                          <label className="flex items-start cursor-pointer hover:bg-white rounded px-2 py-1.5 transition-colors">
                            <input
                              type="checkbox"
                              checked={compressionOptions.removeMarkdownStyling ?? false}
                              onChange={(e) => updateCompressionOption('removeMarkdownStyling', e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded"
                            />
                            <div className="ml-2.5">
                              <span className="text-xs text-gray-700">移除 Markdown 样式标记</span>
                              <span className="text-xs text-gray-400 ml-1">（如粗体、斜体等）</span>
                            </div>
                          </label>
                          
                          <label className="flex items-center cursor-pointer hover:bg-white rounded px-2 py-1.5 transition-colors">
                            <input
                              type="checkbox"
                              checked={compressionOptions.compressTables ?? false}
                              onChange={(e) => updateCompressionOption('compressTables', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                            />
                            <span className="ml-2.5 text-xs text-gray-700">压缩表格为紧凑格式</span>
                          </label>
                        </div>
                      </div>
                      
                      {/* 标点和符号处理 */}
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-2.5 pb-1.5 border-b border-gray-300">标点和符号处理</div>
                        <div className="space-y-2">
                          <label className="flex items-center cursor-pointer hover:bg-white rounded px-2 py-1.5 transition-colors">
                            <input
                              type="checkbox"
                              checked={compressionOptions.removePunctuationSpaces ?? false}
                              onChange={(e) => updateCompressionOption('removePunctuationSpaces', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                            />
                            <span className="ml-2.5 text-xs text-gray-700">移除标点符号后的多余空格</span>
                          </label>
                          
                          <label className="flex items-center cursor-pointer hover:bg-white rounded px-2 py-1.5 transition-colors">
                            <input
                              type="checkbox"
                              checked={compressionOptions.removeFullWidthBrackets ?? false}
                              onChange={(e) => updateCompressionOption('removeFullWidthBrackets', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                            />
                            <span className="ml-2.5 text-xs text-gray-700">全角括号替换为半角</span>
                          </label>
                          
                          <label className="flex items-center cursor-pointer hover:bg-white rounded px-2 py-1.5 transition-colors">
                            <input
                              type="checkbox"
                              checked={compressionOptions.normalizePunctuation ?? false}
                              onChange={(e) => updateCompressionOption('normalizePunctuation', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                            />
                            <span className="ml-2.5 text-xs text-gray-700">规范化标点符号（统一使用英文标点）</span>
                          </label>
                          
                          <label className="flex items-start cursor-pointer hover:bg-white rounded px-2 py-1.5 transition-colors">
                            <input
                              type="checkbox"
                              checked={compressionOptions.mergeRepeatedSymbols ?? false}
                              onChange={(e) => updateCompressionOption('mergeRepeatedSymbols', e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded"
                            />
                            <div className="ml-2.5">
                              <span className="text-xs text-gray-700">合并连续的重复符号</span>
                              <span className="text-xs text-gray-400 ml-1">（如：！！！→！）</span>
                            </div>
                          </label>
                        </div>
                      </div>
                      
                      {/* 特殊内容处理 */}
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-2.5 pb-1.5 border-b border-gray-300">特殊内容处理</div>
                        <div className="space-y-2">
                          <label className="flex items-start cursor-pointer hover:bg-white rounded px-2 py-1.5 transition-colors">
                            <input
                              type="checkbox"
                              checked={compressionOptions.removeEmojis ?? false}
                              onChange={(e) => updateCompressionOption('removeEmojis', e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded"
                            />
                            <div className="ml-2.5">
                              <span className="text-xs text-gray-700">移除 Emoji 表情</span>
                              <span className="text-xs text-gray-400 ml-1">（如 😀🎉 等）</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 概括功能提示词 */}
          <div className={`bg-white rounded-lg border-2 transition-all ${
            isSummarizeFocused 
              ? 'border-gray-200' 
              : 'border-gray-200'
          }`}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">概括功能提示词</h3>
                <button
                  onClick={() => onConfigChange({ ...config, summarizePrompt: DEFAULT_SUMMARIZE_PROMPT })}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  恢复默认
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">自定义概括按钮使用的提示词，用于总结对话历史和文件内容</p>
              <textarea
                value={config.summarizePrompt || DEFAULT_SUMMARIZE_PROMPT}
                onChange={(e) => onConfigChange({ ...config, summarizePrompt: e.target.value })}
                onFocus={() => setIsSummarizeFocused(true)}
                onBlur={() => setIsSummarizeFocused(false)}
                className="w-full h-32 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-sm"
                placeholder="输入自定义的概括提示词..."
              />
            </div>
          </div>

          {/* 重置按钮 */}
          <div className="pt-2">
            <button
              onClick={onRequestReset}
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-sm font-medium text-gray-700"
            >
              重置 API 为默认设置
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

