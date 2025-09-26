export function DocsPage() {
  return (
    <div className="absolute inset-0 overflow-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* 页面标题 */}
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI 写作助手说明文档</h1>
        </div>

        {/* 项目信息 */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-green-800 mb-2">完全免费</h2>
              <p className="text-green-700">
                本项目完全免费使用，不收取任何额外费用。只需要您自己的 AI 服务 API 密钥即可。
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">开源项目</h2>
              <p className="text-blue-700 mb-2">
                项目代码完全开源，欢迎查看、贡献和提出建议。
              </p>
              <a 
                href="https://github.com/afigzb/windowAIChat" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                点击查看 GitHub 仓库地址
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* 快捷键说明 */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            快捷键说明
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">保存文件</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">Ctrl+S</kbd>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">发送消息</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">Enter</kbd>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">换行</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">Shift+Enter</kbd>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">取消操作</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">Escape</kbd>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">确认操作</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">Enter</kbd>
              </div>
            </div>
          </div>
        </section>

        {/* API 使用方式 */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            API 使用方式
          </h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  表单配置
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>简单直观的图形界面</li>
                  <li>填写基础参数即可使用</li>
                  <li>适合快速上手</li>
                  <li>部分参数无法配置</li>
                </ul>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  代码编辑
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>直接编写 JSON 配置</li>
                  <li>支持所有高级参数</li>
                  <li>灵活定制请求内容</li>
                  <li>需要api文档阅读能力</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 代码编辑原理 */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            代码编辑原理
          </h2>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 leading-relaxed mb-4">
              代码编辑模式允许您直接编写 JSON 格式的 API 请求配置，这样可以：
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
              <ul className="space-y-2 text-gray-700">
                <li><strong>完全控制请求参数</strong>：设置任意 API 支持的参数</li>
                <li><strong>灵活调整模型行为</strong>：精确控制 temperature、top_p 等参数</li>
                <li><strong>适配不同服务</strong>：支持各种 OpenAI 兼容和 Google AI 服务</li>
                <li><strong>复用配置模板</strong>：保存常用配置便于快速切换</li>
              </ul>
            </div>
            <p className="text-gray-700 leading-relaxed">
              启用代码编辑后，应用会直接使用您提供的 JSON 配置作为 API 请求体，无需通过表单字段转换。
            </p>
          </div>
        </section>

        {/* API 示例 */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            API 配置示例
          </h2>
          
          {/* OpenAI 示例 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
              OpenAI 系列 API
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              适用于 OpenAI、DeepSeek、通义千问、智谱 AI 等 OpenAI 兼容服务
            </p>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm">
{`{
  "model": "deepseek-reasoner",
  "messages": [
    {"role": "system", "content": "你是AI写作助手，帮助用户完成小说写作。"}
  ],
  "stream": true,
  "max_tokens": 8192
}`}
              </pre>
            </div>
          </div>

          {/* Google 示例 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
              Google AI 系列
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              适用于 Google Gemini、Vertex AI 等 Google AI 服务
            </p>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-blue-400 text-sm">
{`{
  "generationConfig": {
    "maxOutputTokens": 8192,
    "temperature": 0.9,
    "topP": 0.95,
    "topK": 40
  },
  "safetySettings": [
    {
      "category": "HARM_CATEGORY_HARASSMENT",
      "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
      "category": "HARM_CATEGORY_HATE_SPEECH", 
      "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    }
  ]
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* 使用提示 */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            使用提示
          </h2>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">最简单的方法</h3>
                <p className="text-gray-700 leading-relaxed">
                  <strong>有不懂问 AI！</strong> 如果您不确定如何配置参数或编写代码，可以选择询问网页AI（如deepseek的网页AI）。
                  AI 会根据您的需求提供具体的配置建议和代码示例。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 页脚 */}
        <div className="text-center text-gray-500 text-sm py-4">
          <p>有问题？随时在右侧对话框中询问 AI 助手 💬</p>
        </div>
      </div>
    </div>
  )
}
