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

    // 配置mammoth选项以保留更多格式
    const options = {
      // 包含默认样式映射
      includeDefaultStyleMap: true,
      
      // 自定义样式映射以保留更多格式
      styleMap: [
        // 段落样式
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh", 
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        
        // 字符样式
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
        
        // 保留粗体、斜体、下划线
        "b => strong",
        "i => em", 
        "u => u",
        
        // 保留字体颜色和背景色
        "r[color] => span.color",
        "r[highlight] => span.highlight",
        
        // 保留字体大小
        "r[font-size] => span.font-size",
        
        // 保留字体族
        "r[font-family] => span.font-family",
        
        // 列表样式（将Word列表正确映射为HTML列表）
        "p:ordered-list(1) => ol > li:fresh",
        "p:ordered-list(2) => ol > li:fresh",
        "p:ordered-list(3) => ol > li:fresh",
        "p:ordered-list(4) => ol > li:fresh",
        "p:ordered-list(5) => ol > li:fresh",
        "p:ordered-list(6) => ol > li:fresh",
        "p:unordered-list(1) => ul > li:fresh",
        "p:unordered-list(2) => ul > li:fresh",
        "p:unordered-list(3) => ul > li:fresh",
        "p:unordered-list(4) => ul > li:fresh",
        "p:unordered-list(5) => ul > li:fresh",
        "p:unordered-list(6) => ul > li:fresh",
        
        // 表格样式
        "table => table.docx-table",
        "tr => tr",
        "td => td",
        "th => th",
        
        // 居中、左对齐、右对齐
        "p[alignment='center'] => p.text-center",
        "p[alignment='left'] => p.text-left", 
        "p[alignment='right'] => p.text-right",
        "p[alignment='justify'] => p.text-justify"
      ],
      
      // 转换图片
      convertImage: mammoth.images.imgElement(function(image) {
        return image.read("base64").then(function(imageBuffer) {
          return {
            src: "data:" + image.contentType + ";base64," + imageBuffer
          }
        })
      }),
      
      // 保留空段落
      ignoreEmptyParagraphs: false,
      
      // 保留原始样式信息
      includeEmbeddedStyleMap: true,
      
      // 转换时保留更多信息
      transformDocument: function(document) {
        // 遍历文档元素，保留更多样式信息
        document.children.forEach(function(element) {
          if (element.type === 'paragraph') {
            // 保留段落的缩进信息
            if (element.indent && element.indent.left) {
              element.styleName = element.styleName || ''
              element.styleName += ' indent-left-' + element.indent.left
            }
            if (element.indent && element.indent.right) {
              element.styleName = element.styleName || ''
              element.styleName += ' indent-right-' + element.indent.right
            }
          }
        })
        return document
      }
    }

    const result = await mammoth.convertToHtml({ path: filePath }, options)
    let htmlContent = result.value
    
    // 输出警告信息（如果有的话）
    if (result.messages && result.messages.length > 0) {
      console.log('DOCX转换警告:', result.messages)
    }
    
    // 后处理HTML以添加更多样式支持
    htmlContent = postProcessHtml(htmlContent)
    
    // 如果内容为空，返回空段落
    return htmlContent || '<p></p>'
  } catch (error) {
    console.error('读取DOCX文件失败:', error)
    throw error
  }
})

// HTML后处理函数，添加更多样式支持
function postProcessHtml(html) {
  // 添加CSS样式以支持更多格式
  const styles = `
    <style>
      .docx-table { 
        border-collapse: collapse; 
        width: 100%; 
        border: 1px solid #ddd;
      }
      .docx-table td, .docx-table th { 
        border: 1px solid #ddd; 
        padding: 8px; 
        text-align: left;
      }
      /* 确保列表样式可见（Tailwind等reset可能会隐藏标记） */
      ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
      ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
      li { margin: 0.25rem 0; }
      .text-center { text-align: center; }
      .text-left { text-align: left; }
      .text-right { text-align: right; }
      .text-justify { text-align: justify; }
      .list-paragraph { margin-left: 20px; }
      .color { color: inherit; }
      .highlight { background-color: yellow; }
      .font-size { font-size: inherit; }
      .font-family { font-family: inherit; }
      u { text-decoration: underline; }
      strong { font-weight: bold; }
      em { font-style: italic; }
      
      /* 缩进样式 */
      [class*="indent-left-"] { padding-left: 20px; }
      [class*="indent-right-"] { padding-right: 20px; }
    </style>
  `
  
  // 将段落中以数字或项目符号开头的连续块转换为HTML列表
  function convertParagraphsToLists(sourceHtml) {
    if (!sourceHtml) return sourceHtml
    const paragraphRegex = /<p[^>]*>[\s\S]*?<\/p>/gi
    let result = ''
    let lastIndex = 0
    let currentListType = null // 'ol' | 'ul' | null
    let listBuffer = []

    const flushList = () => {
      if (!currentListType || listBuffer.length === 0) return
      result += `<${currentListType}>` + listBuffer.map(item => `<li>${item}</li>`).join('') + `</${currentListType}>`
      currentListType = null
      listBuffer = []
    }

    let match
    while ((match = paragraphRegex.exec(sourceHtml)) !== null) {
      // 追加<p>前的内容
      result += sourceHtml.slice(lastIndex, match.index)
      lastIndex = match.index + match[0].length

      const pHtml = match[0]
      const inner = pHtml.replace(/^<p[^>]*>/i, '').replace(/<\/p>$/i, '')
      const textForDetection = inner.replace(/<[^>]+>/g, '').trim()

      // 检测有序/无序列表标记
      const orderedMatch = textForDetection.match(/^(\d+)[\.|\)]\s+(.+)$/)
      const unorderedMatch = textForDetection.match(/^([\u00B7\u2022\-•·])\s+(.+)$/)

      if (orderedMatch) {
        // 从原始inner中移除前缀（允许前置标签/空白）
        const cleanedInner = inner
          .replace(/^(\s|<[^>]+>)*(\d+[\.|\)])\s*/i, '')
        if (currentListType !== 'ol') {
          flushList()
          currentListType = 'ol'
        }
        listBuffer.push(cleanedInner)
        continue
      }

      if (unorderedMatch) {
        const cleanedInner = inner
          .replace(/^(\s|<[^>]+>)*([\u00B7\u2022\-•·])\s*/i, '')
        if (currentListType !== 'ul') {
          flushList()
          currentListType = 'ul'
        }
        listBuffer.push(cleanedInner)
        continue
      }

      // 普通段落，先把已累积的列表输出，然后原样输出<p>
      flushList()
      result += pHtml
    }

    // 追加剩余内容并冲刷列表
    result += sourceHtml.slice(lastIndex)
    flushList()
    return result
  }

  const converted = convertParagraphsToLists(html)
  // 将样式添加到HTML内容前面
  return styles + converted
}

// 将用于预览的样式从HTML内容中移除，避免以文本形式写入DOCX
function sanitizeHtmlForDocx(html) {
  if (!html) return ''
  // 去除所有<style>...</style>块（包括我们注入的预览样式）
  const withoutStyleTags = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  return withoutStyleTags
}

// 将HTML内容保存为DOCX文件
ipcMain.handle('save-html-as-docx', async (event, filePath, htmlContent) => {
  try {
    // 先移除预览样式，避免被当成正文写入DOCX
    const cleanedHtmlContent = sanitizeHtmlForDocx(htmlContent)

    // 创建基本的HTML文档结构
    const fullHtml = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Document</title>
        </head>
        <body>
          ${cleanedHtmlContent}
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
