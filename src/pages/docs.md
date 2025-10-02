# AI 写作助手说明文档

## 项目信息

### 完全免费

本项目完全免费使用，不收取任何额外费用。只需要您自己的 AI 服务 API 密钥即可。

### 开源项目

项目代码完全开源，欢迎查看、贡献和提出建议。

[点击查看 GitHub 仓库地址](https://github.com/afigzb/windowAIChat)

---

**特别提醒**:如果想查看数据文件，大概率在C:\Users\“你的名字”\AppData\Roaming\ai-writing-assistant\app_data

---

## API 使用方式

### 表单配置

- 简单直观的图形界面
- 填写基础参数即可使用
- 适合快速上手
- 部分参数无法配置

### 代码编辑

- 直接编写 JSON 配置
- 支持所有高级参数
- 灵活定制请求内容
- 需要 API 文档阅读能力

---

## 代码编辑原理

代码编辑模式允许您直接编写 JSON 格式的 API 请求配置，这样可以：

> **完全控制请求参数**：设置任意 API 支持的参数
> 
> **灵活调整模型行为**：精确控制 temperature、top_p 等参数
> 
> **适配不同服务**：支持各种 OpenAI 兼容和 Google AI 服务
> 
> **复用配置模板**：保存常用配置便于快速切换

启用代码编辑后，应用会直接使用您提供的 JSON 配置作为 API 请求体，无需通过表单字段转换。

---

## API 配置示例

### OpenAI 系列 API

适用于 OpenAI、DeepSeek、通义千问、智谱 AI 等 OpenAI 兼容服务

```json
{
  "model": "deepseek-reasoner",
  "messages": [
    {"role": "system", "content": "你是AI写作助手，帮助用户完成小说写作。"}
  ],
  "stream": true,
  "max_tokens": 8192
}
```

### Google AI 系列

适用于 Google Gemini、Vertex AI 等 Google AI 服务

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
    "maxOutputTokens": 8192,
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

## 使用提示

### 最简单的方法

**有不懂问 AI！** 如果您不确定如何配置参数或编写代码，可以选择询问网页 AI（如 DeepSeek 的网页 AI）。询问的时候可以携带上上述使用示例及说明，AI 会根据您的需求提供具体的配置建议和代码示例（当然，这也并非总是正确的）。

## API 配置说明

### 配置位置与含义
- **配置项字段**:
  - `名称`：方便区分不同服务或不同模型的备注名，可随意填写。
  - `类型`：`openai` 或 `gemini`，分别对应 OpenAI 兼容接口与 Google Gemini。
  - `基础地址`（Base URL）：完整接口地址。（特别提醒，这里用的是openai兼容格式）
    - OpenAI 兼容示例：`https://api.deepseek.com/v1/chat/completions`
    - Gemini 示例：`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro`
  - `API 密钥`：服务商颁发的密钥。
  - `模型`：具体模型名，需要去api文档查看。
  - `最大输出令牌数`：限制单次回答的最大长度（不同模型设置范围存在差异）。
  - `额外请求头`/`额外参数`：用于自定义请求（可选）。
  - `启用代码配置`：开启后，使用您填写的 JSON 作为请求体的补充/覆盖。

## 临时文件与存储工作流程

- **键值存储**：每个键对应一个 JSON 文件，读写均为本地文件操作。
- **文件编辑**：
  - 打开文本/Markdown 等文件时，直接读取磁盘内容；
  - 打开 DOCX/DOC 时，会转换为 HTML 进行编辑；
  - 保存时：
    - 文本类文件写回原路径；
    - DOCX/DOC 由 HTML 转回 DOCX 并写回原路径；
  - 期间不创建额外的中间临时文件。

## 提示词与上下文工作流程

- **system 提示词**：
  - 分为覆盖和追加两种模式；
  - 覆盖模式：目前只有概括按钮是覆盖模式，优先生效；
  - 追加模式：提示词卡片采取的就是相互追加的方式。
- **临时上下文**：
  - 可选择放在 `system` 之后，或附加到最后一条用户消息；
  - 用于一次性的背景材料，不会保存进历史。
- **历史消息限制**：
  - 通过 `历史上限（historyLimit）` 控制本次请求携带的最近 N 轮对话；
  - 超出部分不发送，以控制成本和上下文长度。
- **文件/摘要上下文（可选）**：
  - 选中文件内容可按段放入上下文；
  - 对于很长的历史，可先生成「对话历史摘要」再加入上下文。

---

## AI 工作原理要点

- **首尾优先级更高**：
  - 多数模型会更关注开头与结尾的内容；
- **最大读取与输出令牌（tokens）**：
  - 模型有总上下文长度上限（输入+输出），过长会被截断；
  - `最大输出令牌数` 仅限制回答长度，不等于总可读入长度。
- **每次请求会带上历史**：
  - 本应用会根据 `历史上限` 携带最近若干轮对话；
  - 若仍然过长，请减少历史上限、精简输入或先让 AI 概括。
- **提示词清晰具体更有效**：
  - 结构化分点表达，给出约束（风格、格式、字数、示例）；
  - 指明不希望的内容与边界条件。
- **代码模式的注意事项**：
  - 自定义 JSON 可覆盖多数参数，但 `messages/contents/systemInstruction` 由应用统一生成以保证上下文一致；
  - 若高级参数有冲突，以您的 JSON 为准（上述上下文相关字段除外）。

---

## 实用建议

- **快速上手**：用表单模式配置即可开始；需要更细粒度控制再开启代码模式。
- **控制成本**：合理设置历史上限与最大输出令牌；超长素材先做分段概括。
- **提升质量**：把关键约束放在开头与结尾；必要时添加「临时上下文」或文件内容。
