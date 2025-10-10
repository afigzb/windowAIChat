const { contextBridge, ipcRenderer } = require('electron')

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 系统信息
  platform: process.platform,

  // === 文件系统管理API ===
  
  // 选择工作目录
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // 验证目录是否有效
  isValidDirectory: (path) => ipcRenderer.invoke('is-valid-directory', path),
  
  // 获取目录树结构
  getDirectoryTree: (path) => ipcRenderer.invoke('get-directory-tree', path),
  
  // 文件读取与写入
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  
  // 文件与目录操作（保留用于实际文件操作，不是右键菜单）
  createFile: (dirPath, fileName) => ipcRenderer.invoke('create-file', dirPath, fileName),
  createDirectory: (parentPath, dirName) => ipcRenderer.invoke('create-directory', parentPath, dirName),
  deleteFileOrDirectory: (path) => ipcRenderer.invoke('delete-file-or-directory', path),
  rename: (oldPath, newName) => ipcRenderer.invoke('rename', oldPath, newName),
  movePath: (sourcePath, targetDirPath, newName) => ipcRenderer.invoke('move-path', sourcePath, targetDirPath, newName),
  
  // 获取文件信息
  getFileStats: (path) => ipcRenderer.invoke('get-file-stats', path),
  
  // DOCX文件处理
  readDocxAsHtml: (filePath) => ipcRenderer.invoke('read-docx-as-html', filePath),
  saveHtmlAsDocx: (filePath, htmlContent) => ipcRenderer.invoke('save-html-as-docx', filePath, htmlContent),
  
  // 图片文件处理
  readImageAsBase64: (filePath) => ipcRenderer.invoke('read-image-as-base64', filePath),
  
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

  // 打开提示词功能窗口
  openPromptTemplateWindow: () => ipcRenderer.invoke('open-prompt-template-window'),

  // 查询提示词窗口是否打开
  isPromptWindowOpen: () => ipcRenderer.invoke('is-prompt-window-open'),

  // 监听提示词窗口状态变化
  onPromptWindowStateChanged: (callback) => ipcRenderer.on('prompt-window-state-changed', (event, isOpen) => callback(isOpen)),

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