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
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body)
})

// DOM加载完成后的处理
window.addEventListener('DOMContentLoaded', () => {
  // 可以在这里添加一些DOM相关的初始化代码
  console.log('Electron preload script loaded')
})