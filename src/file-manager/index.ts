/**
 * 文件管理模块 (File Manager)
 * 
 * 核心职责：
 * - 工作区（Workspace）管理：选择、加载、持久化
 * - 文件树展示：递归渲染、展开/折叠状态管理
 * - 文件系统操作：创建、删除、重命名、移动
 * - 文件夹状态管理：展开状态持久化、拖拽支持
 * 
 * 设计理念：
 * - 专注于"文件系统的UI层"，不处理文件内容读取
 * - 通过 storage/file-system.ts 与底层Electron通信
 * - 提供可复用的文件树组件和状态管理Hook
 * 
 * 注意：
 * - 通用工具已移至 components/ 和 storage/
 * - 文件内容读取交由 md-html-dock/utils 处理
 */
export * from './components'
export * from './hooks'
export * from './utils'

