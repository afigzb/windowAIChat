# AIChat - DeepSeek 聊天应用

一个基于 React + TypeScript 的前端 AI 聊天工具，调用 DeepSeek API，支持 V3 对话模式和 R1 推理模式。

## 🚀 快速开始

### 1. 配置 API Key
编辑 `src/chat/api/api.ts` 文件，替换为你的 DeepSeek API Key：
```typescript
const API_KEY = '你的key'
```

### 2. 配置语料（可选）
编辑 `src/chat/data/data.json` 文件来自定义AI助手的行为：

```json
{
  "corpus": {
    "initialCorpus": [
      {
        "id": "initial_1",
        "name": "首发语料",
        "type": "initial", 
        "content": "你是一个专业的AI助手...",
        "enabled": true,
        "created": "2024-01-01T00:00:00.000Z"
      }
    ],
    "emphasisCorpus": [
      {
        "id": "emphasis_1", 
        "name": "强调语料",
        "type": "emphasis",
        "content": "请记住要准确回答...",
        "enabled": true,
        "created": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**语料说明：**
- **首发语料（initialCorpus）**: 仅在第一次对话时生效，用于设定AI的角色和基本行为
- **强调语料（emphasisCorpus）**: 每次用户发送消息时都会附加，用于强调重要的回答要求
- 设置 `"enabled": true` 来启用语料，`false` 来禁用

### 3. 安装并运行

```bash
npm install
npm run dev
```

## 🎯 主要功能

- **双模式支持**: DeepSeek-V3 快速对话 / DeepSeek-R1 深度推理
- **语料管理**: 通过界面或配置文件自定义AI行为
- **对话分支**: 支持多分支对话和重新生成
- **实时流式响应**: 显示AI思考过程（R1模式）
- **现代化UI**: 简洁美观的用户界面

## 📝 技术栈

- **框架**: React 18 + TypeScript
- **样式**: Tailwind CSS  
- **构建**: Vite
- **API**: DeepSeek Chat API

## 🔗 项目地址

GitHub: [https://github.com/afigzb/AIChat](https://github.com/afigzb/AIChat)

---

**注意**: 请确保你的 DeepSeek API Key 有效且有足够的余额。语料配置是可选的，不配置也可以正常使用基础聊天功能。
