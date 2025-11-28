import { useEffect } from 'react'
import EditorWorkspace from './pages/AppLayout'
import { PromptTemplatePage } from './prompt'
import { TextEditorPage } from './pages/TextEditorPage'

function App() {
  // 根据 URL 参数决定渲染哪个页面
  const params = new URLSearchParams(window.location.search)
  const page = params.get('page')

  // 阻止整个窗口的默认拖放行为（防止 Electron 导航到文件）
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
    }
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
    }
    
    // 在 document 级别监听，确保所有区域都被覆盖
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)
    
    return () => {
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [])

  if (page === 'prompt') {
    return <PromptTemplatePage />
  }

  if (page === 'text-editor') {
    return <TextEditorPage />
  }

  return <EditorWorkspace />
}

export default App
