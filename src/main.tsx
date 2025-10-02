import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializePromptCards } from './prompt'
import { contextEngine } from './chat/core/context'

// 初始化提示词功能
initializePromptCards(contextEngine)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
