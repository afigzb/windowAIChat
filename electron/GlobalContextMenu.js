// 全局右键菜单管理器 - Electron层实现
// 提供统一的原生右键菜单功能

const { Menu, dialog, shell } = require('electron')
const fs = require('fs').promises
const path = require('path')

class GlobalContextMenuManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow
    this.currentWorkspacePath = null
    
    // 绑定方法
    this.showTextEditMenu = this.showTextEditMenu.bind(this)
    this.showFileMenu = this.showFileMenu.bind(this)
    this.showDirectoryMenu = this.showDirectoryMenu.bind(this)
  }

  // 设置当前工作区路径
  setWorkspacePath(workspacePath) {
    this.currentWorkspacePath = workspacePath
  }

  // 显示文本编辑右键菜单
  showTextEditMenu(params) {
    const { selectionText, isEditable } = params
    const template = []

    // 根据状态添加菜单项
    if (selectionText && isEditable) {
      template.push({ label: '剪切', role: 'cut' })
    }
    
    if (selectionText) {
      template.push({ label: '复制', role: 'copy' })
    }
    
    if (isEditable) {
      template.push({ label: '粘贴', role: 'paste' })
    }

    if (template.length > 0) {
      const contextMenu = Menu.buildFromTemplate(template)
      contextMenu.popup({ window: this.mainWindow })
    }
  }

  // 显示文件右键菜单
  showFileMenu(fileInfo) {
    const { filePath, fileName, isDirectory } = fileInfo
    const template = []

    if (!isDirectory) {
      // 文件操作
      template.push(
        { 
          label: '重命名', 
          click: () => this.renameFile(filePath, fileName) 
        },
        { 
          label: '删除', 
          click: () => this.deleteFile(filePath, fileName) 
        }
      )
    } else {
      // 目录操作
      template.push(
        { 
          label: '新建文件', 
          click: () => this.createFile(filePath) 
        },
        { 
          label: '新建文件夹', 
          click: () => this.createDirectory(filePath) 
        }
      )

      // 如果不是根目录，添加重命名和删除
      if (filePath !== this.currentWorkspacePath) {
        template.push(
          { type: 'separator' },
          { 
            label: '重命名', 
            click: () => this.renameFile(filePath, fileName) 
          },
          { 
            label: '删除', 
            click: () => this.deleteFile(filePath, fileName) 
          }
        )
      }
    }

    if (template.length > 0) {
      const contextMenu = Menu.buildFromTemplate(template)
      contextMenu.popup({ window: this.mainWindow })
    }
  }

  // 显示目录空白区域右键菜单
  showDirectoryMenu(dirPath) {
    const template = [
      { 
        label: '新建文件', 
        click: () => this.createFile(dirPath) 
      },
      { 
        label: '新建文件夹', 
        click: () => this.createDirectory(dirPath) 
      }
    ]

    const contextMenu = Menu.buildFromTemplate(template)
    contextMenu.popup({ window: this.mainWindow })
  }

  // 创建新文件
  createFile(dirPath) {
    // 通知前端触发内联编辑
    this.mainWindow.webContents.send('trigger-inline-edit', {
      action: 'create',
      type: 'file',
      parentPath: dirPath
    })
  }

  // 创建新文件夹
  createDirectory(parentPath) {
    // 通知前端触发内联编辑
    this.mainWindow.webContents.send('trigger-inline-edit', {
      action: 'create',
      type: 'directory',
      parentPath
    })
  }

  // 重命名文件或文件夹
  renameFile(filePath, fileName) {
    // 通知前端触发内联编辑
    this.mainWindow.webContents.send('trigger-inline-edit', {
      action: 'rename',
      type: 'file', // 前端会根据实际情况判断
      filePath,
      defaultValue: fileName
    })
  }

  // 删除文件或文件夹（移动到回收站）
  async deleteFile(targetPath, fileName) {
    try {
      const stats = await fs.stat(targetPath)
      const itemType = stats.isDirectory() ? '文件夹' : '文件'
      
      const { response } = await dialog.showMessageBox(this.mainWindow, {
        type: 'warning',
        buttons: ['移到回收站', '取消'],
        defaultId: 1,
        title: '确认删除',
        message: `确定要删除${itemType} "${fileName}" 吗？`,
        detail: stats.isDirectory() ? '文件夹及其所有内容将被移动到回收站。' : '文件将被移动到回收站，可以在回收站中恢复。'
      })

      if (response === 0) { // 移到回收站
        // 使用 shell.trashItem 将文件移到回收站而不是直接删除
        await shell.trashItem(targetPath)
        
        // 通知前端刷新文件树
        this.mainWindow.webContents.send('file-system-changed', {
          type: 'delete',
          path: targetPath,
          isDirectory: stats.isDirectory()
        })
      }
    } catch (error) {
      console.error('移动到回收站失败:', error)
      this.showErrorDialog('删除失败', error.message)
    }
  }



  // 显示错误对话框
  showErrorDialog(title, message) {
    dialog.showErrorBox(title, message)
  }
}

module.exports = GlobalContextMenuManager
