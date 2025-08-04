const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron')
const fs = require('fs').promises
const path = require('path')
const mammoth = require('mammoth')
const HTMLtoDOCX = require('html-to-docx')
const GlobalContextMenuManager = require('./GlobalContextMenu')
// 使用 app.isPackaged 更可靠地判断是否为开发环境
const isDev = !app.isPackaged

// 保持窗口对象的全局引用
let mainWindow
let contextMenuManager

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
    autoHideMenuBar: true, // 自动隐藏菜单栏
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

  // 初始化全局右键菜单管理器
  contextMenuManager = new GlobalContextMenuManager(mainWindow)

  // 处理右键菜单
  mainWindow.webContents.on('context-menu', (event, params) => {
    const { selectionText, isEditable, mediaType } = params
    
    // 如果是文本区域，显示文本编辑菜单
    if (mediaType === 'none' && (isEditable || selectionText)) {
      contextMenuManager.showTextEditMenu(params)
    }
    // 其他情况由前端通过IPC触发文件菜单
  })
}

// === 文件系统API处理程序 ===

// 选择工作目录
ipcMain.handle('select-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择项目工作目录'
    })
    return result
  } catch (error) {
    console.error('选择目录失败:', error)
    throw error
  }
})

// 验证目录是否有效
ipcMain.handle('is-valid-directory', async (event, dirPath) => {
  try {
    const stats = await fs.stat(dirPath)
    return stats.isDirectory()
  } catch {
    return false
  }
})

// 获取目录树结构
ipcMain.handle('get-directory-tree', async (event, rootPath) => {
  try {
    const buildTree = async (dirPath, parentId = null) => {
      const items = await fs.readdir(dirPath, { withFileTypes: true })
      const nodes = []
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name)
        const node = {
          id: Buffer.from(fullPath).toString('base64'), // 使用路径的base64作为ID
          name: item.name,
          path: fullPath,
          isDirectory: item.isDirectory(),
          parentId
        }
        
        if (!item.isDirectory()) {
          // 文件：添加扩展名和大小信息
          const stats = await fs.stat(fullPath)
          node.size = stats.size
          node.modified = stats.mtime
          node.extension = path.extname(item.name)
        } else {
          // 目录：递归获取子项
          try {
            node.children = await buildTree(fullPath, node.id)
          } catch (error) {
            // 如果无法访问子目录，设置为空数组
            node.children = []
          }
        }
        
        nodes.push(node)
      }
      
      return nodes.sort((a, b) => {
        // 目录在前，文件在后，按名称排序
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })
    }
    
    return await buildTree(rootPath)
  } catch (error) {
    console.error('获取目录树失败:', error)
    throw error
  }
})

// 读取文件内容
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return content
  } catch (error) {
    console.error('读取文件失败:', error)
    throw error
  }
})

// 写入文件内容
ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    return true
  } catch (error) {
    console.error('写入文件失败:', error)
    throw error
  }
})

// 创建文件
ipcMain.handle('create-file', async (event, dirPath, fileName) => {
  try {
    const filePath = path.join(dirPath, fileName)
    await fs.writeFile(filePath, '', 'utf-8')
    return filePath
  } catch (error) {
    console.error('创建文件失败:', error)
    throw error
  }
})

// 创建目录
ipcMain.handle('create-directory', async (event, parentPath, dirName) => {
  try {
    const dirPath = path.join(parentPath, dirName)
    await fs.mkdir(dirPath, { recursive: true })
    return dirPath
  } catch (error) {
    console.error('创建目录失败:', error)
    throw error
  }
})

// 删除文件或目录
ipcMain.handle('delete-file-or-directory', async (event, targetPath) => {
  try {
    const stats = await fs.stat(targetPath)
    if (stats.isDirectory()) {
      await fs.rmdir(targetPath, { recursive: true })
    } else {
      await fs.unlink(targetPath)
    }
    return true
  } catch (error) {
    console.error('删除失败:', error)
    throw error
  }
})

// 重命名文件或目录
ipcMain.handle('rename', async (event, oldPath, newName) => {
  try {
    const dir = path.dirname(oldPath)
    const newPath = path.join(dir, newName)
    await fs.rename(oldPath, newPath)
    return newPath
  } catch (error) {
    console.error('重命名失败:', error)
    throw error
  }
})

// 获取文件统计信息
ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath)
    return {
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    }
  } catch (error) {
    console.error('获取文件信息失败:', error)
    throw error
  }
})

// 读取DOCX文件并转换为HTML
ipcMain.handle('read-docx-as-html', async (event, filePath) => {
  try {
    // 检查文件是否为空
    const stats = await fs.stat(filePath)
    if (stats.size === 0) {
      return '<p></p>'
    }

    const result = await mammoth.convertToHtml({ path: filePath })
    const htmlContent = result.value
    
    // 如果内容为空，返回空段落
    return htmlContent || '<p></p>'
  } catch (error) {
    console.error('读取DOCX文件失败:', error)
    throw error
  }
})

// 将HTML内容保存为DOCX文件
ipcMain.handle('save-html-as-docx', async (event, filePath, htmlContent) => {
  try {
    // 创建基本的HTML文档结构
    const fullHtml = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Document</title>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `
    
    // 转换HTML为DOCX
    const docxBuffer = await HTMLtoDOCX(fullHtml, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    })
    
    // 保存文件
    await fs.writeFile(filePath, docxBuffer)
    return true
  } catch (error) {
    console.error('保存DOCX文件失败:', error)
    throw error
  }
})

// 读取图片文件并转换为base64格式
ipcMain.handle('read-image-as-base64', async (event, filePath) => {
  try {
    // 检查文件是否存在
    const stats = await fs.stat(filePath)
    if (stats.size === 0) {
      throw new Error('图片文件为空')
    }

    // 读取文件为buffer
    const buffer = await fs.readFile(filePath)
    
    // 获取文件扩展名来确定MIME类型
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.svg': 'image/svg+xml'
    }
    
    const mimeType = mimeTypes[ext] || 'image/png'
    
    // 转换为base64格式
    const base64Data = buffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64Data}`
    
    return {
      dataUrl,
      mimeType,
      size: stats.size,
      extension: ext
    }
  } catch (error) {
    console.error('读取图片文件失败:', error)
    throw error
  }
})

// === 右键菜单API处理程序 ===

// 设置工作区路径
ipcMain.handle('set-workspace-path', async (event, workspacePath) => {
  if (contextMenuManager) {
    contextMenuManager.setWorkspacePath(workspacePath)
  }
})

// 显示文件右键菜单
ipcMain.handle('show-file-context-menu', async (event, fileInfo) => {
  if (contextMenuManager) {
    contextMenuManager.showFileMenu(fileInfo)
  }
})

// 显示目录右键菜单
ipcMain.handle('show-directory-context-menu', async (event, dirPath) => {
  if (contextMenuManager) {
    contextMenuManager.showDirectoryMenu(dirPath)
  }
})

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow()
  // 移除顶部菜单栏
  Menu.setApplicationMenu(null)

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
