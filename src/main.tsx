import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializePromptCards, promptCardManager } from './prompt'
import { contextEngine } from './chat/core/context'

// 初始化提示词功能
initializePromptCards(contextEngine)

// 监听提示词卡片更新事件（窗口间同步）
if (typeof window !== 'undefined' && (window as any).electronAPI?.onPromptCardsChanged) {
  (window as any).electronAPI.onPromptCardsChanged(() => {
    console.log('[Main] 收到提示词卡片更新通知，重新加载...')
    promptCardManager.reload()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
