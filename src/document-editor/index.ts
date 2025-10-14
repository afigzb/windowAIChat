/**
 * 文档编辑模块 (Document Editor)
 * 
 * 核心职责：
 * - 单文件编辑状态管理：打开、修改、保存、关闭
 * - 文件类型适配：document、image、unsupported
 * - 编辑器集成：Tiptap富文本编辑器、图片查看器
 * - 未保存提示：避免数据丢失
 * 
 * 设计理念：
 * - 专注于"文件编辑"这一核心场景
 * - 通过统一的 FileContent 接口支持多种文件类型
 * - 未来扩展：PDF查看、Markdown预览、视频播放等
 * 
 * 依赖关系：
 * - 使用 storage/file-system.ts 进行文件读写
 * - 使用 md-html-dock/utils 进行文件类型检测
 * - 使用 components/useConfirm 进行用户确认
 */
export * from './components'
export * from './hooks'

