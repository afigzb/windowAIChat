### 项目简介

AI 写作助手是一款基于 Electron + React 的桌面应用，集成文件管理与 DOCX 文档编辑，并提供右侧 AI 对话辅助创作能力。可在 Windows / macOS / Linux 运行与打包。

### 使用到的主要技术/库

- **Electron**: 桌面应用容器与原生能力桥接（IPC、文件系统、右键菜单）
- **Vite + React + TypeScript**: 前端应用开发与构建
- **Tailwind CSS 4**: 现代化样式与布局
- **react-resizable-panels**: 面板分栏与拖拽伸缩
- **DOCX 读写**:
  - `mammoth`: 将 .docx 转 HTML，尽量保留标题、列表、加粗、斜体、对齐等样式
  - `html-to-docx`: 将编辑后的 HTML 回写为 .docx 文件
- **Markdown/数学公式渲染（聊天内容）**: `react-markdown`、`remark-gfm`、`remark-math`、`rehype-katex`、`react-syntax-highlighter`
- **electron-builder**: 跨平台打包
- **ESLint + TypeScript ESLint**: 代码质量与类型检查

### 已实现的核心功能

- **文件管理（左侧）**
  - 选择工作目录、展示目录树
  - 新建、重命名、删除文件/文件夹
  - 右键菜单（全局/文件/目录）

- **DOCX 文档编辑（中间）**
  - 打开 .docx/.doc/.txt/.md 文件，.docx 自动转换为可编辑 HTML
  - 尽可能保留标题层级、列表、表格、加粗/斜体/下划线、对齐、缩进等样式
  - 编辑内容的字数统计、未保存状态提示、快捷键保存（Ctrl/Cmd+S）
  - 将编辑后的 HTML 一键保存回 .docx

- **AI 对话助手（右侧）**
  - 会话树与分支管理：支持消息回溯、切换分支与重新生成
  - 对话历史管理：新建、切换、删除、清空
  - 可选择文件作为上下文，自动读取并拼接内容给 AI 参考
  - Markdown/代码高亮/公式渲染，可选展示“思考过程”

- **跨平台与安全**
  - 开发/生产环境切换，生产环境采用本地文件加载
  - 关闭 `nodeIntegration`、启用 `contextIsolation`，限制外部导航

### 本地开发与打包

```bash
# 安装依赖
npm install

# 开发调试（同时启动 Vite 与 Electron）
npm run dev

# 构建 Web 资源
npm run build

# 仅打包 Windows 安装目录（当前平台）
npm run pack

# 全平台打包（需在对应平台或使用 CI）
npm run pack-all
```

### 目录结构（摘录）

```
electron/           # 主进程：窗口创建、IPC、右键菜单、DOCX 读写适配
src/
  writing/          # 文件树、DOCX 编辑器、编辑器相关 hooks & utils
  chat/             # 会话管理、分支管理、历史记录、渲染与输入组件
  storage/          # 配置与本地存储
  App.tsx           # 应用入口（加载 WritingPage）
```

### 备注

- 运行前建议使用较新的 Node 版本。
- 打包配置见 `package.json` 的 `build` 字段，已配置 Win/macOS/Linux 目标。

### 架构概览（主进程 ↔ 预加载 ↔ 渲染进程）

- **主进程（`electron/main.js`）**：
  - 负责创建窗口、加载 URL、本地安全策略（禁用 `nodeIntegration`、启用 `contextIsolation`、限制外部导航）。
  - 暴露文件系统与 DOCX 处理的 IPC 处理器：`read-docx-as-html`、`save-html-as-docx`、`read-file`、`write-file`、`get-directory-tree` 等。
  - 右键菜单的原生实现与转发（`GlobalContextMenuManager`）。
- **预加载（`electron/preload.js`）**：
  - 用 `contextBridge` 将一组安全 API 暴露给渲染进程：`electronAPI.readDocxAsHtml`、`saveHtmlAsDocx`、`readFile`、`writeFile`、`getDirectoryTree` 等。
  - 统一事件（如 `onTriggerInlineEdit`、`onFileSystemChanged`）订阅入口。
- **渲染进程（`src/`）**：
  - 页面布局与交互（`writing/WritingPage.tsx`）。
  - DOCX 编辑器（`DocxEditor` + `useDocxEditor`），文件树与操作（`FileTreePanel`/`useFileTree`）。
  - AI 对话面板（`chat/`），包含会话历史与分支管理、消息渲染与输入等。

### DOCX 读取流程（.docx → HTML → 可编辑）

1. 用户在文件树选择 `.docx` 文件（`FileTreePanel` → `useDocxEditor.openFileForEdit`）。
2. 渲染进程通过预加载桥接调用 `electronAPI.readDocxAsHtml(filePath)`。
3. 主进程处理器 `read-docx-as-html`：
   - 若文件为空，直接返回 `<p></p>`（避免空字符串导致编辑器无法输入）。
   - 使用 `mammoth.convertToHtml({ path }, options)` 将 DOCX 转换为 HTML：
     - 自定义 `styleMap` 尽可能保留标题层级、列表、粗体/斜体/下划线、表格、对齐、缩进等。
     - `convertImage` 转换 DOCX 内嵌图片为 data URL，便于在前端直接渲染。
     - `transformDocument` 追加缩进信息标记。
   - 将转换结果交由 `postProcessHtml(html)` 进行二次处理：
     - 注入预览用样式（例如 `.docx-table`、列表样式恢复等）。
     - 将连续的“形如 1. / • 开头”的段落转换为真正的 `<ol>/<ul>` 列表结构，提升渲染与编辑的一致性。
   - 返回最终 HTML 给渲染进程。
4. 渲染进程在 `DocxEditor` 中展示该 HTML，用户即可编辑。

为什么要“后处理 HTML”？
- DOCX → HTML 的语义并非 1:1，默认结果中某些列表可能以 `<p>` 序列表示，二次处理能恢复标准列表结构，表现更稳定。
- 额外的 `<style>` 仅用于预览，不应写回 DOCX（见下文写入流程）。

### DOCX 写入流程（HTML → .docx）

1. 用户编辑完成后触发保存（按钮或 Ctrl/Cmd+S，`useDocxEditor.saveFile`）。
2. 渲染进程调用 `electronAPI.saveHtmlAsDocx(filePath, htmlContent)`。
3. 主进程处理器 `save-html-as-docx`：
   - 先用 `sanitizeHtmlForDocx(html)` 移除所有 `<style>` 块，避免预览样式被当成正文写入。
   - 包装为完整 HTML 文档结构（包含 `<html><head><meta charset>...</head><body>...</body></html>`）。
   - 调用 `html-to-docx` 将 HTML 转换为 DOCX Buffer（配置了表格不可拆分、页脚与页码等基础选项）。
   - 写入目标路径，完成保存。

关键取舍：
- 采用 `mammoth` 做“读”，`html-to-docx` 做“写”，因为两者在各自方向的鲁棒性较好；跨库读写时需靠样式映射与预览样式来弥补语义差异。
- 预览注入样式只在读取阶段加入，写入前一律移除，确保 DOCX 内容干净。

### 文件系统读写与目录树流程

- 目录树（`get-directory-tree`）
  1. 主进程递归读取目录，构造节点：`id` 使用 `path` 的 `base64`，保证前端可稳定索引。
  2. 文件节点补充 `size`、`modified`、`extension`；目录节点递归 `children`。
  3. 排序规则：目录在前、文件在后，按名称升序。
- 文件读写
  - 读取文本：渲染进程调 `readFile(filePath)`，主进程直接读取并返回内容。
  - 写入文本：渲染进程调 `writeFile(filePath, content)`，主进程保存到磁盘。
  - 读取图片：用 `readImageAsBase64(filePath)` 返回 `dataUrl`、MIME、大小、扩展名，便于预览与作为 AI 上下文。
  - 删除/重命名/新建：对应 `delete-file-or-directory`、`rename`、`create-file`/`create-directory`。

### 右键菜单与文件树事件流（更顺手的创建/重命名体验）

- 主进程 `GlobalContextMenuManager` 实现原生右键菜单。
- 在文件树空白处：提供“新建文件/文件夹”；在文件/文件夹上：提供“重命名/删除”等。
- 执行菜单项时主进程并不直接落盘，而是通过 `webContents.send('trigger-inline-edit', {...})` 通知渲染进程：
  - 渲染进程在文件树中进入“内联编辑状态”，让用户输入名称后再调用 `createFile`/`createDirectory`/`rename` 完成实际操作。
- 删除操作由于需要确认弹窗，由主进程 `dialog` 完成；成功后通过 `file-system-changed` 通知渲染进程刷新。

### AI 对话的上下文拼接流程（选中文件 → 发送时读取）

1. 用户在文件树“勾选”多个文件作为上下文（与“打开编辑”的文件无冲突）。
2. AI 面板发送消息前调用 `getAdditionalContent()`：
   - 根据文件类型（`detectFileType`）选择读取方式：
     - `docx/doc` → `readDocxAsHtml` 后 `extractTextFromHTML` 提取纯文本；
     - 图片 → `readImageAsBase64`，以 Markdown 形式返回元信息与 data URL；
     - 文本 → 直接读取（HTML-like 内容会做纯文本提取）。
   - 若当前打开的 DOCX 文件在编辑中，优先使用编辑器当前 HTML 内容并提取纯文本，以包含“未保存”的最新内容。
   - 对每个文件做 `formatFileContent(filePath, content)`，并限制最长 5,000 字符，避免消息过长。
3. 生成的上下文字符串拼接到用户消息之后一并发送给模型，提升问题的针对性。

### 技术难点与解决思路

- **DOCX → HTML 语义还原**：
  - 难点：列表、缩进、表格边框、对齐在不同引擎下表现不一。
  - 方案：
    - 自定义 `mammoth` `styleMap` 尽量恢复语义。
    - 二次处理 HTML，将“看似列表的段落”转换为 `<ol>/<ul>`；注入预览样式确保表格、列表符号正常渲染。
- **HTML → DOCX 的样式污染**：
  - 难点：预览 `<style>` 不能写入 DOCX。
  - 方案：保存前用 `sanitizeHtmlForDocx` 移除所有 `<style>`；只保留正文。
- **图片/大文件的内存与体积**：
  - 难点：图片转 base64 会膨胀；DOCX 内图片导出也占内存。
  - 方案：
    - 图片仅在需要（预览/上下文）时读取；上下文中包含图片要谨慎（模型输入体积受限）。
    - 对上下文内容进行长度截断（5,000 字符），并按批读取文件（`readMultipleFiles` 的批量处理）。
- **跨平台路径与权限**：
  - 方案：主进程统一用 `path`/`fs.promises`；递归时 try/catch 容忍不可访问子目录，保证目录树可用。
- **安全性**：
  - 方案：禁用 `nodeIntegration`、启用 `contextIsolation`，通过 `preload` 暴露白名单 API；生产环境禁止外部导航。

### 性能与稳定性策略

- 目录树递归读取时对不可访问目录做失败隔离而非中断。
- 文件内容读取：
  - 按类型读，避免误把二进制当文本；
  - 批处理与缓存（`fileContentCache`）结合，降低重复读成本；
  - 当前打开文件优先使用编辑器内存态内容，减少磁盘 IO 并保证一致性。
- 上下文拼接：
  - 基于文件类型的差异化提取；
  - 统一做长度截断，防止超长导致对话失败或延迟过大。

### 潜在边界情况与处理

- 空的 DOCX：返回 `<p></p>` 保证可编辑。
- 含复杂样式/嵌套表格的 DOCX：HTML 还原可能与原貌存在差异；尽量保留核心结构。
- 超大图片或大量图片：上下文体积激增；建议按需选择或只提供元信息。
- 二进制/不支持格式：`detectFileType` 标记为 `none` 并给出原因，渲染层避免读取。
- 重命名/创建名称冲突：前端应做最小校验，失败由主进程返回错误并提示。

### 适配与扩展建议

- 若需要更高保真度的 DOCX 写回，可探索以 `docx` 库手工构建段落/表格，但复杂度显著上升。
- 可在 `saveHtmlAsDocx` 增加样式白名单，将必要的样式内联化后写入（需谨慎）。
- AI 上下文可做“智能抽取”而非纯拼接：提取摘要/大纲，减少 token 占用并提升有效性。
