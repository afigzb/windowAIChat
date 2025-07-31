const { contextBridge, ipcRenderer } = require('electron')

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 系统信息
  platform: process.platform,
  
  // 应用版本信息
  getVersion: () => ipcRenderer.invoke('app-version'),
  
  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // 文件操作（可选）
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  
  // 通知
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),

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
  
  // 文件与目录操作
  createFile: (dirPath, fileName) => ipcRenderer.invoke('create-file', dirPath, fileName),
  createDirectory: (parentPath, dirName) => ipcRenderer.invoke('create-directory', parentPath, dirName),
  deleteFileOrDirectory: (path) => ipcRenderer.invoke('delete-file-or-directory', path),
  rename: (oldPath, newName) => ipcRenderer.invoke('rename', oldPath, newName),
  
  // 获取文件信息
  getFileStats: (path) => ipcRenderer.invoke('get-file-stats', path),
  
  // DOCX文件支持
  readDocxFile: (filePath) => ipcRenderer.invoke('read-docx-file', filePath),
  writeDocxFile: (filePath, content) => ipcRenderer.invoke('write-docx-file', filePath, content)
})

// DOM加载完成后的处理
window.addEventListener('DOMContentLoaded', () => {
  // 可以在这里添加一些DOM相关的初始化代码
  console.log('Electron preload script loaded')
})