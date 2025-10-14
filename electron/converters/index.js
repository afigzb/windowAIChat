/**
 * 文件转换器模块统一出口
 */

const ConverterManager = require('./converter-manager')

// 导出转换器管理器（单例模式）
const converterManager = new ConverterManager()

module.exports = {
  ConverterManager,
  converterManager,
  // 向后兼容：保持原有的DocxHandler导出
  DocxHandler: require('./docx-converter')
}

