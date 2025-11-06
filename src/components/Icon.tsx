/**
 * 统一的图标组件
 * 支持 fill 和 stroke 两种风格
 * 图标文件存放在 public/icons/ 目录
 */

import { useState, useEffect } from 'react'

export type IconName = 
  // Fill 风格图标
  | 'settings' | 'close' | 'send' | 'stop' | 'chevronDown' | 'chevronLeft' | 'chevronRight'
  | 'folder' | 'api'
  // Stroke 风格图标
  | 'regenerate' | 'edit' | 'copy' | 'delete' | 'add' | 'check' | 'eye' | 'clock' | 'user'
  | 'code' | 'link' | 'file' | 'document' | 'help' | 'warning' | 'info' | 'summarize'
  | 'message' | 'robot' | 'pin' | 'save' | 'folderEmpty' | 'workspace' | 'agents'
  | 'prompt' | 'textEditor' | 'docs' | 'grip'

// SVG 内容缓存，避免重复加载
const svgCache = new Map<string, string>()

export const Icon = ({ name, className = "w-4 h-4" }: { name: IconName; className?: string }) => {
  const [svgContent, setSvgContent] = useState<string>('')

  useEffect(() => {
    // 检查缓存
    if (svgCache.has(name)) {
      setSvgContent(svgCache.get(name)!)
      return
    }

    // 直接从 public 文件夹加载 SVG（就像 HTML 中引用图片一样）
    const baseUrl = import.meta.env.BASE_URL || '/'
    fetch(`${baseUrl}icons/${name}.svg`)
      .then(res => res.text())
      .then(svg => {
        svgCache.set(name, svg)
        setSvgContent(svg)
      })
      .catch(err => {
        console.error(`Error loading icon ${name}:`, err)
      })
  }, [name])

  if (!svgContent) {
    return <div className={className} />
  }

  // 直接内联 SVG，应用 className（支持 currentColor）
  const svgWithClass = svgContent.replace(
    /<svg([^>]*)>/,
    (match, attrs) => {
      // 合并 className
      const hasClass = attrs.includes('class=')
      if (hasClass) {
        return match.replace(/class="([^"]*)"/, `class="$1 ${className}"`)
      }
      return `<svg${attrs} class="${className}">`
    }
  )

  return <div dangerouslySetInnerHTML={{ __html: svgWithClass }} />
}

