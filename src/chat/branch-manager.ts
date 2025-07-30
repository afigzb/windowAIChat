import type { 
  ConversationTree, 
  BranchNavigation 
} from './types'
import {
  getBranchNavigation,
  navigateBranch
} from './tree-utils'

// 分支管理器的操作接口
export interface BranchManager {
  getBranchNavigationForNode: (nodeId: string) => BranchNavigation
  navigateToSibling: (nodeId: string, direction: 'left' | 'right') => void
}

// 分支管理器配置
export interface BranchManagerConfig {
  conversationTree: ConversationTree
  updateActivePath: (newPath: string[]) => void
}

// 创建分支管理器
export function useBranchManager({
  conversationTree,
  updateActivePath
}: {
  conversationTree: ConversationTree
  updateActivePath: (newPath: string[]) => void
}): BranchManager {

  // 获取节点的分支导航信息
  const getBranchNavigationForNode = (nodeId: string): BranchNavigation => {
    return getBranchNavigation(nodeId, conversationTree.activePath, conversationTree.rootNodes)
  }

  // 导航到兄弟节点
  const navigateToSibling = (nodeId: string, direction: 'left' | 'right'): void => {
    const newActivePath = navigateBranch(
      nodeId, 
      direction, 
      conversationTree.activePath, 
      conversationTree.rootNodes
    )
    
    if (newActivePath) {
      updateActivePath(newActivePath)
    }
  }

  return {
    getBranchNavigationForNode,
    navigateToSibling
  }
} 