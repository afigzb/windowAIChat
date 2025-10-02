/**
 * 文本压缩工具 - 向后兼容导出
 * 
 * 注意：此文件已重构为模块化结构
 * 所有功能已移至 text-compressor/ 文件夹
 * 
 * 新的文件结构：
 * - text-compressor/types.ts - 类型定义和配置
 * - text-compressor/basic-compression.ts - 基础压缩方法
 * - text-compressor/advanced-compression.ts - 高级压缩方法
 * - text-compressor/compressor.ts - 主压缩器类
 * - text-compressor/index.ts - 统一导出
 */

// 重新导出所有内容以保持向后兼容
export * from './text-compressor/index'
