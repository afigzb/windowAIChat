/**
 * 文件管理模块
 * 
 * 核心职责：
 * - 工作区（Workspace）管理：选择、加载、持久化
 * - 文件树展示：递归渲染、展开/折叠状态管理
 * - 文件系统操作：创建、删除、重命名、移动
 * - 文件夹状态管理：展开状态持久化、拖拽支持
 * - 多文件选择：管理用于AI对话上下文的文件选择状态
 * 
 * 设计理念：
 * - 专注于"文件管理"相关的所有功能
 * - 通过 storage/file-system.ts 与底层Electron通信
 * - 提供可复用的文件树组件和状态管理Hook
 * - 文件内容读取统一使用 md-html-dock/utils 工具
 * 
 * Hook说明：
 * - useFileTree: 工作区和文件树管理
 * - useFileSelection: 多文件选择（用于AI对话）
 * - useConfirm: 通用确认对话框（已移至 components/）
 */
export * from './components'
export * from './hooks'
export * from './utils'

