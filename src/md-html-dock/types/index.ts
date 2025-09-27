// 导出所有类型定义

export interface FileTypeInfo {
  isSupported: boolean // 是否支持编辑
  isSafeToRead: boolean // 是否安全读取（不会卡顿）
  readMethod: 'html' | 'text' | 'image' | 'none' // 读取方式
  reason?: string // 不支持的原因
}

export interface WordCountResult {
  characters: number // 总字符数（包括空格）
  words: number // 单词数
}


// 图片数据接口
export interface ImageData {
  dataUrl: string
  mimeType: string
  size: number
  extension: string
}
