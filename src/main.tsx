import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { promptCardManager } from './prompt'
import { AppLoader } from './components'

// 提示词卡片现在由 ContextEngine 直接处理，无需注册操作符

// 监听提示词卡片更新事件（窗口间同步）
if (typeof window !== 'undefined' && (window as any).electronAPI?.onPromptCardsChanged) {
  (window as any).electronAPI.onPromptCardsChanged(() => {
    console.log('[Main] 收到提示词卡片更新通知，重新加载...')
    promptCardManager.reload()
  })
}

function Root() {
  const [showLoader, setShowLoader] = useState(true)

  useEffect(() => {
    // 应用加载完成后，准备隐藏加载动画
    const timer = setTimeout(() => {
      // 这里可以添加额外的加载完成逻辑
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <StrictMode>
      {showLoader && <AppLoader onComplete={() => setShowLoader(false)} />}
      <App />
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
