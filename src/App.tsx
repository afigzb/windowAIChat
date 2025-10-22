import EditorWorkspace from './pages/AppLayout'
import { PromptTemplatePage } from './prompt'
import { TextEditorPage } from './pages/TextEditorPage'

function App() {
  // 根据 URL 参数决定渲染哪个页面
  const params = new URLSearchParams(window.location.search)
  const page = params.get('page')

  if (page === 'prompt') {
    return <PromptTemplatePage />
  }

  if (page === 'text-editor') {
    return <TextEditorPage />
  }

  return <EditorWorkspace />
}

export default App
