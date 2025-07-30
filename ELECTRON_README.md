# AI聊天助手 - 桌面应用

基于 Electron + React + TypeScript 开发的AI聊天桌面应用，支持数学公式渲染和代码高亮。

## 📁 项目结构

```
windowAIChat/
├── src/                    # React前端源码
│   ├── chat/              # 聊天相关组件
│   │   ├── ChatPage.tsx   # 主聊天页面
│   │   ├── components.tsx # 聊天组件
│   │   ├── api.ts         # API接口
│   │   └── types.ts       # 类型定义
│   ├── App.tsx            # 主应用组件
│   ├── main.tsx           # React入口
│   └── index.css          # 全局样式
├── electron/              # Electron主进程
│   ├── main.js            # 主进程入口
│   └── preload.js         # 预加载脚本
├── public/                # 静态资源
│   ├── chat-icon.svg      # 应用图标
│   └── icon.png           # 应用图标
├── build/                 # 构建产物（不提交git）
│   ├── web/              # React构建产物
│   └── desktop/          # Electron打包产物
└── package.json           # 项目配置
```

## 🚀 开发指南

### 环境要求
- Node.js 18+
- npm 或 yarn

### 快速开始

```bash
# 安装依赖
npm install

# 开发模式启动
npm run dev

# 构建项目
npm run build

# 打包桌面应用
npm run pack
```

### 开发命令说明

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 + Electron |
| `npm run build` | 构建React前端到 `build/web/` |
| `npm run pack` | 一键打包：构建前端 + 打包桌面应用 |
| `npm run lint` | 代码检查 |
| `npm run clean` | 清理所有构建目录 |

## 🏗️ 构建流程

### 统一构建目录设计
```
build/
├── web/              # React前端构建产物
│   ├── index.html    # 入口HTML
│   ├── assets/       # JS/CSS/字体等资源
│   └── *.svg         # 图标文件
└── desktop/          # Electron最终应用
    └── win-unpacked/ # Windows可执行文件
        └── AI聊天助手.exe
```

### 构建过程
1. **前端构建**: `tsc -b && vite build` → `build/web/`
2. **Electron打包**: `electron-builder` → `build/desktop/`

### 为什么需要两步构建？
- **React构建必需**: Electron的渲染进程需要加载构建后的HTML/JS/CSS文件
- **桌面应用本质**: 在本地运行的web应用，需要将源码编译成浏览器可执行的代码
- **资源优化**: 压缩代码、合并文件、优化性能

## 🔧 技术栈

### 前端技术
- **React 19** - UI框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **React Markdown** - Markdown渲染
- **KaTeX** - 数学公式渲染
- **React Syntax Highlighter** - 代码高亮

### 桌面应用
- **Electron 37** - 跨平台桌面应用框架
- **Electron Builder** - 应用打包工具

## 📦 打包配置

### Electron Builder 配置
```json
{
  "appId": "com.example.ai-chat-desktop",
  "productName": "AI聊天助手",
  "directories": {
    "output": "build/desktop"
  },
  "files": [
    "build/web/**/*",
    "electron/**/*",
    "public/chat-icon.svg",
    "node_modules/**/*"
  ]
}
```

### 支持平台
- ✅ Windows (已配置)
- ✅ macOS (已配置)
- ✅ Linux (已配置)

## 🎯 开发注意事项

### 路径配置
- **开发环境**: 前端运行在 `http://localhost:5173`
- **生产环境**: Electron加载 `build/web/index.html`
- **相对路径**: Vite配置 `base: './'` 确保资源正确加载

### 安全配置
- `nodeIntegration: false` - 禁用Node.js集成
- `contextIsolation: true` - 启用上下文隔离
- `preload.js` - 安全的主进程与渲染进程通信

### Git管理
```gitignore
# 构建产物不提交
build/
dist/
release/
```

## 🐛 常见问题

### 1. exe文件运行后没有视图
**原因**: 前端代码未构建或路径配置错误
**解决**: 
```bash
npm run build  # 确保前端已构建
npm run pack   # 重新打包
```

### 2. 资源加载失败
**原因**: HTML中使用绝对路径
**解决**: Vite配置 `base: './'` 使用相对路径

### 3. 打包失败
**原因**: 缓存问题或权限问题
**解决**:
```bash
npm run clean  # 清理缓存
npm run pack   # 重新打包
```

## 📄 许可证

MIT License
