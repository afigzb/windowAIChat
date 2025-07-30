const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('path')
// 使用 app.isPackaged 更可靠地判断是否为开发环境
const isDev = !app.isPackaged

// 保持窗口对象的全局引用
let mainWindow

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false, // 出于安全考虑禁用node集成
      contextIsolation: true, // 启用上下文隔离
      enableRemoteModule: false, // 禁用远程模块
      preload: path.join(__dirname, 'preload.js') // 预加载脚本
    },
    // icon: path.join(__dirname, '../public/chat-icon.svg'), // 应用图标（暂时禁用）
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false // 先隐藏窗口，加载完成后再显示
  })

  // 加载应用
  let startUrl
  if (isDev) {
    startUrl = 'http://localhost:5173'
  } else {
    // 在打包后的环境中，使用统一的构建目录
    startUrl = app.isPackaged 
      ? path.join(__dirname, '../build/web/index.html')
      : path.join(__dirname, '../build/web/index.html')
    startUrl = `file://${startUrl}`
  }
  
  mainWindow.loadURL(startUrl)

  // 窗口准备显示时显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // 开发环境下打开开发者工具
    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  // 窗口被关闭时清除引用
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // 阻止导航到外部URL
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    
    if (parsedUrl.origin !== 'http://localhost:5173' && !isDev) {
      event.preventDefault()
    }
  })

  // 添加右键菜单功能
  mainWindow.webContents.on('context-menu', (event, params) => {
    const { selectionText, isEditable } = params
    
    // 创建右键菜单
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '剪切',
        accelerator: 'CmdOrCtrl+X',
        enabled: selectionText.length > 0 && isEditable,
        click: () => {
          mainWindow.webContents.cut()
        }
      },
      {
        label: '复制',
        accelerator: 'CmdOrCtrl+C',
        enabled: selectionText.length > 0,
        click: () => {
          mainWindow.webContents.copy()
        }
      },
      {
        label: '粘贴',
        accelerator: 'CmdOrCtrl+V',
        enabled: isEditable,
        click: () => {
          mainWindow.webContents.paste()
        }
      }
    ])
    
    // 显示右键菜单
    contextMenu.popup({ window: mainWindow })
  })
}

// 创建应用菜单
function createMenu() {
  const template = [
    {
      label: 'AI助手',
      submenu: [
        {
          label: '关于',
          role: 'about'
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow()
  createMenu()

  app.on('activate', () => {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，通常在应用程序中重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 当所有窗口都被关闭时退出应用
app.on('window-all-closed', () => {
  // 在macOS上，应用程序及其菜单栏通常保持活动状态，直到用户明确退出Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 在此文件中，您可以包含应用程序的其余特定的主进程代码
// 您也可以将它们放在单独的文件中并在此处require它们