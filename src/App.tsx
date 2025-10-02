import EditorWorkspace from './pages/EditorWorkspace'
import { PromptTemplatePage } from './prompt'

function App() {
  // 根据 URL 参数决定渲染哪个页面
  const params = new URLSearchParams(window.location.search)
  const page = params.get('page')

  if (page === 'prompt') {
    return <PromptTemplatePage />
  }

  return <EditorWorkspace />
}

export default App
