# AI 写作助手使用指南

- **完全免费**：应用本身免费开源，不收取任何费用。
- **需要准备**：首次使用需要你自己的 AI 服务商 **API 密钥**（Key）。没有密钥就无法联网生成回答。
- **开源地址**：[GitHub 仓库](https://github.com/afigzb/windowAIChat)

---

## 三步开始使用

1) **选择服务商**（两类都支持）
   - **OpenAI 兼容**：如 DeepSeek、通义千问（阿里云 DashScope）、智谱 AI、OpenAI 等。
   - **Google Gemini**：Google AI Studio / Vertex AI。

2) **申请并复制 API 密钥（Key）**
   - OpenAI 平台： [platform.openai.com](https://platform.openai.com/)（控制台与文档）
   - 阿里云 DashScope（通义千问）：[dashscope.aliyun.com](https://dashscope.aliyun.com/)（控制台） 
   - 智谱 AI： [open.bigmodel.cn](https://open.bigmodel.cn/)
   - Google AI Studio（Gemini）：[ai.google.dev](https://ai.google.dev/)
   - Deepseek AI : [platform.deepseek.com](https://platform.deepseek.com/usage)
   - 其他 OpenAI 兼容平台：在其控制台申请 Key。
   - 如果链接有误，直接在浏览器搜索“服务商名 + API”。

3) **在应用中填写配置**
   - 打开应用右上角或侧边栏的`设置` → `API 配置`。
   - 点击“新建配置”：
     - `类型`：选`openai`（OpenAI 兼容）或`gemini`（Google）。
     - `基础地址`（Base URL）：服务商接口地址（见下文）。
     - `API 密钥`：粘贴刚复制的 Key。
     - `模型`：在服务商文档或控制台查看模型名称并填写。
     - 保存后返回聊天页面开始使用。

---

## 我该选哪个“类型”？

- **选`openai`**：当你使用 DeepSeek、通义千问、智谱 AI、OpenAI 等“OpenAI 兼容接口”的服务商。
- **选`gemini`**：当你使用 Google Gemini。

常见 Base URL（仅作示例，最终以服务商文档为准）（注意，这里用的是 OpenAI 兼容接口）：
- OpenAI 兼容（示例）：`https://api.deepseek.com/v1/chat/completions`
- Gemini（示例）：`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro`

---

## 两种配置方式

- **表单配置（推荐）**：最简单，填 Key、Base URL、模型即可开始，使用的是默认参数。
- **代码编辑（进阶）**：直接编辑 JSON，可自定义参数，具体使用需参考服务商 API 文档；。

代码模式开启后，应用会用你提供的 JSON 作为请求体的补充/覆盖（上下文相关字段`messages/contents/systemInstruction`仍由应用统一生成以保证对话一致性）。

---

## 最小可用配置示例（可选）

### OpenAI 兼容

适用于 OpenAI、DeepSeek、通义千问、智谱 AI 等 OpenAI 兼容服务：

```json
{
  "model": "deepseek-reasoner",
  "messages": [
    {"role": "system", "content": "你是AI写作助手，帮助用户完成小说写作。"}
  ],
  "stream": true,
  "max_tokens": 64000
}
```

### Google Gemini

适用于 Google Gemini：

```json
{
  "model": "gemini-2.5-pro",
  "systemInstruction": {
    "parts": [
      { "text": "你是 AI 写作助手，帮助用户完成小说创作。" }
    ]
  },
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 65536,
    "topP": 0.9,
    "topK": 40,
    "candidateCount": 1,
    "thinkingConfig": {
      "includeThoughts": true,
      "thinkingBudget": -1
    },
    "responseMimeType": "text/plain"
  },
  "safetySettings": [
    { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
    { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
    { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
    { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
  ]
}
```

---

## 常见问题（FAQ）

- **为什么没有回应/一直失败？**
  - 是否已在`设置 → API 配置`中填写并保存 Key？
  - `基础地址`是否正确（OpenAI 兼容与 Gemini 不同，需按文档填写）？
  - `模型名`是否准确无误、该账号是否有权限调用该模型？
  - 网络是否可访问目标服务商（公司/学校网络可能拦截）？
  - 账号余额、配额、并发/速率是否受限？
  - 若开启了“代码编辑”，对应模型是否支持该参数？

- **模型名称在哪里查看？**
  - 登录服务商控制台或查阅其“模型列表/API 文档”。不同服务商命名不同，请以官方为准。

- **这款应用收费吗？**
  - 应用本身免费、开源；调用第三方 API 会由各服务商计费。

- **数据存放在哪里？**
  - 本地数据路径（通常）：`C:\\Users\\你的用户名\\AppData\\Roaming\\ai-writing-assistant\\app_data`

---

## 上下文与提示词

- **提示词卡片**
  - 应用内置常用提示词，可在`设置 → 常用提示词`中自行添加或删除。
  - 用户提示词采用追加逻辑，可自行选择在system，system后第一条，或用户本轮发送消息末尾追加提示词。
  - 系统提示词采用覆盖逻辑，会临时覆盖用户提示词，对用户提示词本身无影响，目前仅在生成摘要时使用。
- **临时上下文**：被选择的文件会以临时上下文附加到本轮请求末尾，不保留到对话历史，可用于生成摘要。
- **历史消息限制**：`历史上限（historyLimit）`控制每次请求携带的最近 N 轮，以控制成本与长度，被截取的历史不参与摘要。

---

## 一点点原理

- **模型更看重“开头与结尾”的内容**，关键约束尽量放两端。
- **上下文长度有限**：模型有总上下文上限（输入+输出）；过长会被截断。
- **最大输出令牌数**：仅限制回答长度，不等于模型可读取的总长度。

---

