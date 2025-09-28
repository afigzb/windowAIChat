const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron')
const fs = require('fs').promises
const fsRaw = require('fs')
const path = require('path')
const GlobalContextMenuManager = require('./GlobalContextMenu')
const DocxHandler = require('./converters/docx')

// 保持窗口对象的全局引用
let mainWindow
let contextMenuManager
let docxHandler
let storageDir


function ensureDirSync(dirPath) {
  try {
    if (!fsRaw.existsSync(dirPath)) {
      fsRaw.mkdirSync(dirPath, { recursive: true })
    }
  } catch (e) {
    console.error('创建存储目录失败:', e)
  }
}

function keyToFilename(key) {
  const safe = String(key).replace(/[^a-zA-Z0-9-_\.]/g, '_')
  return `${safe}.json`
}

function getKeyFilePath(key) {
  return path.join(storageDir, keyToFilename(key))
}

// 提前初始化存储目录，避免渲染进程调用前未初始化
function resolveStorageDir() {
  try {
    // 获取可执行文件所在目录
    const executableDir = path.dirname(process.execPath)
    const primary = path.join(executableDir, 'app_data')
    ensureDirSync(primary)
    // 试写
    const probeFile = path.join(primary, '.writable_probe')
    fsRaw.writeFileSync(probeFile, 'ok')
    fsRaw.unlinkSync(probeFile)
    return primary
  } catch (e) {
    try {
      // 回退到用户数据目录（如果项目目录不可写）
      const fallback = path.join(app.getPath('userData'), 'app_data')
      ensureDirSync(fallback)
      const probeFile2 = path.join(fallback, '.writable_probe')
      fsRaw.writeFileSync(probeFile2, 'ok')
      fsRaw.unlinkSync(probeFile2)
      return fallback
    } catch (e2) {
      console.error('无法初始化任何存储目录:', e2)
      return null
    }
  }
}

(function initStorageDirEarly() {
  storageDir = resolveStorageDir()
})()

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
    icon: path.join(__dirname, '../public/app-icon-nebula-256.ico'), // 应用图标
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true, // 自动隐藏菜单栏
    show: false // 先隐藏窗口，加载完成后再显示
  })

  // 加载应用
  const indexHtmlPath = path.join(__dirname, '../build/web/index.html')
  mainWindow.loadFile(indexHtmlPath)

  // 窗口准备显示时显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
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
    try {
      const parsedUrl = new URL(navigationUrl)
      if (parsedUrl.protocol !== 'file:') {
        event.preventDefault()
      }
    } catch (_) {
      // 如果URL无法解析，谨慎起见阻止导航
      event.preventDefault()
    }
  })

  // 初始化全局右键菜单管理器
  contextMenuManager = new GlobalContextMenuManager(mainWindow)
  
  // 初始化DOCX处理器
  docxHandler = new DocxHandler()
  docxHandler.registerIpcHandlers(ipcMain)

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
// 初始化持久化数据存储目录（位于项目文件夹下）
ipcMain.handle('init-storage-dir', async () => {
  try {
    storageDir = resolveStorageDir()
    return storageDir
  } catch (error) {
    console.error('初始化存储目录失败:', error)
    throw error
  }
})

// 键值存储：异步读取
ipcMain.handle('kv-get', async (event, key) => {
  try {
    const filePath = getKeyFilePath(key)
    const exists = fsRaw.existsSync(filePath)
    if (!exists) return null
    const text = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(text)
  } catch (error) {
    console.error('kv-get 失败:', error)
    return null
  }
})

// 键值存储：异步写入
ipcMain.handle('kv-set', async (event, key, value) => {
  try {
    ensureDirSync(storageDir)
    const filePath = getKeyFilePath(key)
    await fs.writeFile(filePath, JSON.stringify(value), 'utf-8')
    return true
  } catch (error) {
    console.error('kv-set 失败:', error)
    throw error
  }
})

// 键值存储：异步删除
ipcMain.handle('kv-remove', async (event, key) => {
  try {
    const filePath = getKeyFilePath(key)
    if (fsRaw.existsSync(filePath)) {
      await fs.unlink(filePath)
    }
    return true
  } catch (error) {
    console.error('kv-remove 失败:', error)
    throw error
  }
})

// 键值存储：同步读取（用于保持现有同步接口）
ipcMain.on('kv-get-sync', (event, key) => {
  try {
    const filePath = getKeyFilePath(key)
    if (!fsRaw.existsSync(filePath)) {
      event.returnValue = null
      return
    }
    const text = fsRaw.readFileSync(filePath, 'utf-8')
    event.returnValue = JSON.parse(text)
  } catch (error) {
    console.error('kv-get-sync 失败:', error)
    event.returnValue = null
  }
})

// 键值存储：同步写入
ipcMain.on('kv-set-sync', (event, key, value) => {
  try {
    ensureDirSync(storageDir)
    const filePath = getKeyFilePath(key)
    fsRaw.writeFileSync(filePath, JSON.stringify(value), 'utf-8')
    event.returnValue = true
  } catch (error) {
    console.error('kv-set-sync 失败:', error)
    event.returnValue = false
  }
})

// 键值存储：同步删除
ipcMain.on('kv-remove-sync', (event, key) => {
  try {
    const filePath = getKeyFilePath(key)
    if (fsRaw.existsSync(filePath)) {
      fsRaw.unlinkSync(filePath)
    }
    event.returnValue = true
  } catch (error) {
    console.error('kv-remove-sync 失败:', error)
    event.returnValue = false
  }
})


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
