// 文件格式处理工具

import type { OpenFile } from '../hooks/useFileEditor'

// 处理DOCX文件读取
export async function readDocxFile(filePath: string): Promise<string> {
  try {
    // 在Electron环境中，需要通过主进程处理docx文件
    const content = await (window as any).electronAPI.readDocxFile(filePath)
    return content
  } catch (error) {
    console.error('读取DOCX文件失败:', error)
    throw new Error(`无法读取DOCX文件: ${error}`)
  }
}

// 处理DOCX文件写入
export async function writeDocxFile(filePath: string, content: string): Promise<void> {
  try {
    // 在Electron环境中，需要通过主进程处理docx文件
    await (window as any).electronAPI.writeDocxFile(filePath, content)
  } catch (error) {
    console.error('写入DOCX文件失败:', error)
    throw new Error(`无法写入DOCX文件: ${error}`)
  }
}

// 根据文件格式读取文件
export async function readFileByFormat(filePath: string, format: OpenFile['format']): Promise<string> {
  try {
    if (format === 'docx') {
      return await readDocxFile(filePath)
    }
    
    // txt和md文件直接读取
    const content = await (window as any).electronAPI.readFile(filePath)
    return content || '' // 确保返回字符串
  } catch (error) {
    console.error('读取文件失败:', error)
    throw error
  }
}

// 根据文件格式写入文件
export async function writeFileByFormat(filePath: string, content: string, format: OpenFile['format']): Promise<void> {
  try {
    if (format === 'docx') {
      await writeDocxFile(filePath, content)
    } else {
      // txt和md文件直接写入
      await (window as any).electronAPI.writeFile(filePath, content)
    }
  } catch (error) {
    console.error('写入文件失败:', error)
    throw error
  }
}