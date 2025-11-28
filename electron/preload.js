const { contextBridge, ipcRenderer, webUtils } = require('electron')

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 系统信息
  platform: process.platform,
  
  // 文件路径获取（用于拖放）
  getPathForFile: (file) => webUtils.getPathForFile(file),

  // === 文件系统管理API ===
  
  // 选择工作目录
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // 验证目录是否有效
  isValidDirectory: (path) => ipcRenderer.invoke('is-valid-directory', path),
  
  // 获取目录树结构
  getDirectoryTree: (path) => ipcRenderer.invoke('get-directory-tree', path),
  
  // === 文件转换API（简化版） ===
  
  // 读取文件（自动识别格式：DOCX/图片/文本等）
  readFileAuto: (filePath) => ipcRenderer.invoke('file:read', filePath),
  
  // 保存文件（自动识别格式）
  saveFileAuto: (filePath, content) => ipcRenderer.invoke('file:save', filePath, content),

  // 读取文件为纯文本（用于AI对话等场景）
  readFileAsText: (filePath) => ipcRenderer.invoke('file:readAsText', filePath),

  // 获取文件格式信息
  getFileFormatInfo: (filePath) => ipcRenderer.invoke('file:getInfo', filePath),
  
  // 获取所有支持的文件格式
  getSupportedFormatsInfo: () => ipcRenderer.invoke('file:getSupportedFormats'),

  // 从HTML中提取纯文本
  extractTextFromHtml: (html) => ipcRenderer.invoke('file:extractText', html),

  // === 基础文件读写（仅用于简单场景，一般情况请使用上面的统一接口） ===
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  
  // 文件与目录操作（保留用于实际文件操作，不是右键菜单）
  createFile: (dirPath, fileName) => ipcRenderer.invoke('create-file', dirPath, fileName),
  createDirectory: (parentPath, dirName) => ipcRenderer.invoke('create-directory', parentPath, dirName),
  deleteFileOrDirectory: (path) => ipcRenderer.invoke('delete-file-or-directory', path),
  rename: (oldPath, newName) => ipcRenderer.invoke('rename', oldPath, newName),
  movePath: (sourcePath, targetDirPath, newName) => ipcRenderer.invoke('move-path', sourcePath, targetDirPath, newName),
  copyPath: (sourcePath, targetDirPath, newName) => ipcRenderer.invoke('copy-path', sourcePath, targetDirPath, newName),
  
  // 获取文件信息
  getFileStats: (path) => ipcRenderer.invoke('get-file-stats', path),
  
  // 文件概括缓存
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  ensureDirectory: (dirPath) => ipcRenderer.invoke('ensure-directory', dirPath),
  readSummaryCache: (originalFilePath) => ipcRenderer.invoke('read-summary-cache', originalFilePath),
  writeSummaryCache: (originalFilePath, summaryContent) => ipcRenderer.invoke('write-summary-cache', originalFilePath, summaryContent),
  
  // === 应用数据键值存储（项目文件夹下） ===
  initStorageDir: () => ipcRenderer.invoke('init-storage-dir'),
  kvGet: (key) => ipcRenderer.invoke('kv-get', key),
  kvSet: (key, value) => ipcRenderer.invoke('kv-set', key, value),
  kvRemove: (key) => ipcRenderer.invoke('kv-remove', key),
  kvGetSync: (key) => ipcRenderer.sendSync('kv-get-sync', key),
  kvSetSync: (key, value) => ipcRenderer.sendSync('kv-set-sync', key, value),
  kvRemoveSync: (key) => ipcRenderer.sendSync('kv-remove-sync', key),

  // === 右键菜单API ===
  
  // 设置工作区路径
  setWorkspacePath: (workspacePath) => ipcRenderer.invoke('set-workspace-path', workspacePath),
  
  // 显示文件右键菜单
  showFileContextMenu: (fileInfo) => ipcRenderer.invoke('show-file-context-menu', fileInfo),
  
  // 显示目录右键菜单  
  showDirectoryContextMenu: (dirPath) => ipcRenderer.invoke('show-directory-context-menu', dirPath),
  
  // 监听文件系统变化事件
  onFileSystemChanged: (callback) => ipcRenderer.on('file-system-changed', (event, data) => callback(data)),
  
  // 监听内联编辑触发事件
  onTriggerInlineEdit: (callback) => ipcRenderer.on('trigger-inline-edit', (event, data) => callback(data)),

  // ========== 通用子窗口管理 API ==========

  // 打开指定子窗口
  openChildWindow: (windowId) => ipcRenderer.invoke('open-child-window', windowId),

  // 查询子窗口是否打开
  isChildWindowOpen: (windowId) => ipcRenderer.invoke('is-child-window-open', windowId),

  // 关闭指定子窗口
  closeChildWindow: (windowId) => ipcRenderer.invoke('close-child-window', windowId),

  // 聚焦指定子窗口
  focusChildWindow: (windowId) => ipcRenderer.invoke('focus-child-window', windowId),

  // 切换子窗口置顶状态
  toggleChildWindowAlwaysOnTop: (windowId) => ipcRenderer.invoke('toggle-child-window-always-on-top', windowId),

  // 获取子窗口置顶状态
  getChildWindowAlwaysOnTop: (windowId) => ipcRenderer.invoke('get-child-window-always-on-top', windowId),

  // 监听子窗口状态变化（通用）
  onChildWindowStateChanged: (windowId, callback) => {
    const channel = `${windowId}-state-changed`
    ipcRenderer.on(channel, (event, isOpen) => callback(isOpen))
  },

  // ========== 业务专用 API ==========

  // 通知提示词卡片已更新（用于窗口间同步）
  notifyPromptCardsChanged: () => ipcRenderer.send('prompt-cards-changed'),

  // 监听提示词卡片更新事件
  onPromptCardsChanged: (callback) => ipcRenderer.on('prompt-cards-changed', () => callback()),

})

// DOM加载完成后的处理
window.addEventListener('DOMContentLoaded', () => {
  // 可以在这里添加一些DOM相关的初始化代码
  console.log('Electron preload script loaded')
})