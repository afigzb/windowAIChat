/**
 * 智能滚动 Hook
 * 
 * 实现类似现代AI聊天应用的自动滚动行为：
 * - 当用户在底部时，消息更新会自动滚动
 * - 当用户向上滚动查看历史时，不会自动滚动
 * - 消息生成过程中持续监听用户位置
 */

import { useRef, useEffect, useCallback } from 'react'

interface UseSmartScrollOptions {
  /**
   * 触发滚动的依赖项
   * 当这个值变化时，会根据用户位置决定是否滚动
   */
  trigger?: any
  
  /**
   * 是否正在生成消息
   * 生成过程中会持续检查用户位置
   */
  isGenerating?: boolean
  
  /**
   * 距离底部多少像素内认为是"在底部"
   * 默认值：10px
   */
  threshold?: number
}

/**
 * 检查用户是否在滚动容器底部附近
 */
function isNearBottom(element: HTMLElement, threshold: number = 10): boolean {
  const { scrollTop, scrollHeight, clientHeight } = element
  return scrollHeight - scrollTop - clientHeight < threshold
}

/**
 * 平滑滚动到底部
 */
function scrollToBottom(element: HTMLElement, behavior: ScrollBehavior = 'smooth') {
  element.scrollTo({
    top: element.scrollHeight,
    behavior
  })
}

export function useSmartScroll(options: UseSmartScrollOptions = {}) {
  const { trigger, isGenerating = false, threshold = 10 } = options
  
  // 滚动容器的引用
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // 用户是否手动向上滚动的标记
  const userHasScrolledUpRef = useRef(false)
  
  // 上一次滚动位置
  const lastScrollTopRef = useRef(0)
  
  // 用于消息生成时的持续滚动检查
  const autoScrollTimerRef = useRef<number | null>(null)
  
  /**
   * 处理滚动事件，检测用户是否手动滚动
   */
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const currentScrollTop = container.scrollTop
    const isAtBottom = isNearBottom(container, threshold)
    
    // 如果用户向上滚动（scrollTop变小）
    if (currentScrollTop < lastScrollTopRef.current) {
      userHasScrolledUpRef.current = true
    }
    
    // 如果用户滚动到底部附近，重新启用自动滚动
    if (isAtBottom) {
      userHasScrolledUpRef.current = false
    }
    
    lastScrollTopRef.current = currentScrollTop
  }, [threshold])
  
  /**
   * 智能滚动函数：只在用户未向上滚动时才滚动
   */
  const smartScroll = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = scrollContainerRef.current
    if (!container) return
    
    // 如果用户没有向上滚动，或者已经在底部附近，执行滚动
    if (!userHasScrolledUpRef.current || isNearBottom(container, threshold)) {
      scrollToBottom(container, behavior)
    }
  }, [threshold])
  
  /**
   * 强制滚动到底部（忽略用户位置）
   */
  const forceScrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = scrollContainerRef.current
    if (!container) return
    
    userHasScrolledUpRef.current = false
    scrollToBottom(container, behavior)
  }, [])
  
  /**
   * 当触发器变化时，强制滚动到底部
   * （用户发送消息时应该始终滚动，不管之前是否向上滚动过）
   */
  useEffect(() => {
    if (trigger !== undefined) {
      forceScrollToBottom('smooth')
    }
  }, [trigger, forceScrollToBottom])
  
  /**
   * 消息生成时的持续滚动检查
   * 使用 requestAnimationFrame 实现平滑的滚动跟随
   */
  useEffect(() => {
    if (!isGenerating) {
      // 生成结束，清理定时器
      if (autoScrollTimerRef.current) {
        cancelAnimationFrame(autoScrollTimerRef.current)
        autoScrollTimerRef.current = null
      }
      return
    }
    
    // 消息生成时，持续检查并滚动
    const checkAndScroll = () => {
      const container = scrollContainerRef.current
      if (!container) {
        autoScrollTimerRef.current = requestAnimationFrame(checkAndScroll)
        return
      }
      
      // 只在用户位于底部时才自动滚动
      if (!userHasScrolledUpRef.current || isNearBottom(container, threshold)) {
        scrollToBottom(container, 'auto') // 生成时使用 'auto' 避免动画卡顿
      }
      
      autoScrollTimerRef.current = requestAnimationFrame(checkAndScroll)
    }
    
    autoScrollTimerRef.current = requestAnimationFrame(checkAndScroll)
    
    return () => {
      if (autoScrollTimerRef.current) {
        cancelAnimationFrame(autoScrollTimerRef.current)
        autoScrollTimerRef.current = null
      }
    }
  }, [isGenerating, threshold])
  
  /**
   * 绑定滚动事件监听
   */
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    container.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])
  
  return {
    scrollContainerRef,
    smartScroll,
    forceScrollToBottom,
    isUserScrolledUp: userHasScrolledUpRef.current
  }
}

