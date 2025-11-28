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
 * 架构设计：
 * - 高内聚：每个模块专注单一职责
 * - 低耦合：通过 hooks 和 utils 解耦业务逻辑
 * - 可复用：组件和 hooks 可独立使用
 * 
 * 模块结构：
 * - components/: UI 组件（FileTreePanel, FileTreeNode, InlineEdit）
 * - hooks/: 业务逻辑和状态管理
 *   - useFileTree: 工作区和文件树管理
 *   - useFileSelection: 多文件选择（用于AI对话）
 *   - useDragDrop: 拖拽操作逻辑
 *   - useFileDragSort: 文件列表排序
 *   - useWorkspaceDrop: 工作区拖放
 * - utils/: 工具函数
 *   - pathHelper: 路径处理
 *   - fileHelper: 文件格式化
 *   - dragDropHelper: 拖拽数据传输
 */

// 组件导出
export * from './components'

// Hooks 导出
export * from './hooks'

// 工具函数导出
export * from './utils'
