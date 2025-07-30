# AI聊天助手 - Electron桌面应用

这是一个基于React + Electron构建的AI聊天桌面应用，使用DeepSeek API提供智能对话功能。

## 🚀 快速开始

### 开发环境要求
- Node.js (版本 >= 16)
- npm 或 yarn

### 安装依赖
```bash
npm install
```

## 📦 运行方式

### 1. 开发模式
启动React开发服务器和Electron应用：
```bash
npm run electron-dev
```
这会同时启动：
- Vite开发服务器（http://localhost:5173）
- Electron桌面应用

### 2. 生产模式
先构建React应用，再运行Electron：
```bash
npm run build
npm run electron
```

### 3. 仅Web版本（原版）
```bash
npm run dev        # 开发服务器
npm run build      # 构建生产版本
npm run preview    # 预览构建结果
```

## 🏗️ 构建桌面应用

### 构建所有平台
```bash
npm run dist
```

### 构建特定平台
```bash
npm run dist-win     # Windows安装程序
npm run dist-mac     # macOS DMG
npm run dist-linux   # Linux AppImage
```

构建完成后，安装包将保存在 `dist-electron/` 目录下。

## 📁 项目结构

```
├── public/
│   ├── electron.js          # Electron主进程
│   ├── preload.js          # 预加载脚本
│   └── chat-icon.svg       # 应用图标
├── src/                    # React应用源码
├── dist/                   # 构建后的Web应用
├── dist-electron/          # Electron应用构建输出
└── package.json            # 项目配置
```

## ⚙️ 配置说明

### Electron 配置
- **主进程**: `public/electron.js` - 负责创建窗口和应用生命周期
- **预加载脚本**: `public/preload.js` - 安全地暴露API给渲染进程
- **构建配置**: `package.json` 中的 `build` 字段

### 应用特性
- ✅ 窗口大小：1200x800（最小800x600）
- ✅ 跨平台支持（Windows/macOS/Linux）
- ✅ 安全性：禁用Node集成，启用上下文隔离
- ✅ 开发工具：开发模式自动打开DevTools
- ✅ 菜单栏：支持快捷键和标准菜单
- ✅ 外部链接：自动在系统浏览器中打开

## 🔧 自定义配置

### 修改窗口设置
编辑 `public/electron.js` 中的 `createWindow` 函数：
```javascript
mainWindow = new BrowserWindow({
  width: 1400,        // 修改宽度
  height: 900,        // 修改高度
  minWidth: 1000,     // 最小宽度
  minHeight: 700,     // 最小高度
  // ... 其他配置
})
```

### 修改应用信息
编辑 `package.json`：
```json
{
  "name": "your-app-name",
  "productName": "你的应用名称",
  "description": "应用描述",
  "author": "你的名字",
  "version": "1.0.0"
}
```

### 修改构建配置
编辑 `package.json` 中的 `build` 字段：
```json
{
  "build": {
    "appId": "com.yourcompany.yourapp",
    "productName": "你的应用名称",
    "directories": {
      "output": "dist-electron"
    }
    // ... 其他配置
  }
}
```

## 🐛 常见问题

### Q: Electron应用启动失败
A: 确保已经运行 `npm run build` 构建了React应用

### Q: 开发模式下页面空白
A: 检查Vite开发服务器是否在http://localhost:5173运行

### Q: 构建失败
A: 确保所有依赖都已安装：`npm install`

### Q: 图标不显示
A: 确保 `public/chat-icon.svg` 文件存在

## 📚 相关文档

- [Electron官方文档](https://www.electronjs.org/docs)
- [electron-builder文档](https://www.electron.build/)
- [React官方文档](https://react.dev/)
- [Vite官方文档](https://vitejs.dev/)

## 🎯 使用说明

1. **首次使用**：打开应用后，点击右上角设置按钮，输入你的DeepSeek API Key
2. **模式选择**：支持DeepSeek-V3和DeepSeek-R1两种模式
3. **快捷键**：
   - `Ctrl+R` / `Cmd+R`：重新加载
   - `F12`：开发者工具
   - `Ctrl+Q` / `Cmd+Q`：退出应用
   - `Enter`：发送消息
   - `Shift+Enter`：换行

## 🔒 安全说明

- API Key仅在本次会话中使用，不会被保存到本地
- 应用使用安全的预加载脚本架构
- 禁用了Node.js集成以提高安全性
- 外部链接会在系统浏览器中打开