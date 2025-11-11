/**
 * 数字输入框组件
 * 提供统一的数字输入体验，支持清空和范围限制
 * - 允许用户清空输入
 * - 值有效时实时回调 onChange
 * - 失去焦点时自动验证并恢复无效值
 */

import { useState, useEffect } from 'react'

interface NumberInputProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
  min?: number
  max?: number
  defaultValue?: number // 失去焦点时如果为空或无效，使用此值
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  defaultValue,
  placeholder,
  className = '',
  disabled = false
}: NumberInputProps) {
  // 内部状态，允许为空字符串
  const [inputValue, setInputValue] = useState<string>(value?.toString() ?? '')

  // 当外部 value 变化时同步到内部状态
  useEffect(() => {
    setInputValue(value?.toString() ?? '')
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    const trimmedValue = newValue.trim()
    
    // 如果为空，只更新内部状态，不回调
    if (trimmedValue === '') {
      return
    }
    
    // 如果以 0 开头且长度大于 1（如 "00", "01", "002"），允许继续输入，不立即解析
    // 这样用户可以从 "100" 删除 "1" 得到 "00"，然后继续输入 "200"
    if (trimmedValue.startsWith('0') && trimmedValue.length > 1) {
      return
    }
    
    // 如果值有效且不是前导零的情况，实时回调
    if (!isNaN(parseInt(trimmedValue, 10))) {
      let numValue = parseInt(trimmedValue, 10)
      // 应用范围限制
      if (min !== undefined && numValue < min) {
        numValue = min
      }
      if (max !== undefined && numValue > max) {
        numValue = max
      }
      onChange(numValue)
      // 如果值被限制，更新显示值
      if (numValue !== parseInt(trimmedValue, 10)) {
        setInputValue(numValue.toString())
      }
    }
    // 如果值无效（非数字），只更新内部状态，不回调
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim()
    
    if (trimmedValue === '' || isNaN(parseInt(trimmedValue, 10))) {
      // 如果为空或无效，使用 defaultValue 或保持原 value
      const fallbackValue = defaultValue !== undefined ? defaultValue : value
      if (fallbackValue !== undefined) {
        onChange(fallbackValue)
        setInputValue(fallbackValue.toString())
      } else {
        onChange(undefined)
        setInputValue('')
      }
    } else {
      // 如果有效，验证范围并更新
      let numValue = parseInt(trimmedValue, 10)
      if (min !== undefined && numValue < min) {
        numValue = min
      }
      if (max !== undefined && numValue > max) {
        numValue = max
      }
      onChange(numValue)
      setInputValue(numValue.toString())
    }
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onWheel={(e) => e.currentTarget.blur()}
      placeholder={placeholder}
      disabled={disabled}
      className={`px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${className}`}
    />
  )
}

