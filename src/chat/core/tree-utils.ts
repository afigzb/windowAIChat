import type { 
  FlatMessage, 
  MessageNode, 
  ConversationTree, 
  BranchNavigation,
  MessageComponents
} from '../types'

// ===== 工具函数 =====

// 生成唯一ID
export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

// 创建扁平消息
export function createFlatMessage(
  content: string, 
  role: FlatMessage['role'], 
  parentId: string | null,
  reasoning_content?: string,
  components?: MessageComponents
): FlatMessage {
  return {
    id: generateId(),
    content,
    role,
    timestamp: new Date(),
    parentId,
    reasoning_content,
    components
  }
}

// ===== 树构建与管理 =====

// 从扁平结构构建树
export function buildTreeFromFlat(flatMessages: Map<string, FlatMessage>): MessageNode[] {
  const nodes = new Map<string, MessageNode>()
  const roots: MessageNode[] = []

  // 创建所有节点
  for (const [id, message] of flatMessages) {
    nodes.set(id, {
      ...message,
      children: [],
      depth: 0
    })
  }

  // 建立父子关系
  for (const [id, node] of nodes) {
    if (node.parentId === null) {
      roots.push(node)
    } else {
      const parent = nodes.get(node.parentId)
      if (parent) {
        parent.children.push(node)
        node.depth = parent.depth + 1
      }
    }
  }

  // 排序子节点
  const sortByTime = (a: MessageNode, b: MessageNode) => a.timestamp.getTime() - b.timestamp.getTime()
  for (const node of nodes.values()) {
    node.children.sort(sortByTime)
  }

  return roots.sort(sortByTime)
}

// 从根节点构建节点映射（避免重复遍历）
export function buildNodeMap(roots: MessageNode[]): Map<string, MessageNode> {
  const nodeMap = new Map<string, MessageNode>()
  
  function addToMap(node: MessageNode) {
    nodeMap.set(node.id, node)
    node.children.forEach(addToMap)
  }
  
  roots.forEach(addToMap)
  return nodeMap
}

// 在树中查找节点（使用预构建的节点映射）
// 已移除未使用的 findNode

// ===== 路径管理 =====

// 获取从根到指定节点的路径（利用扁平存储直接追溯）
// 已移除未使用的 getPathToNode

// 根据激活路径获取要渲染的节点序列
export function getActiveNodesFromPath(activePath: string[], roots: MessageNode[]): MessageNode[] {
  if (activePath.length === 0) return []
  
  // 构建节点映射，避免重复搜索
  const nodeMap = buildNodeMap(roots)
  
  // 直接从映射中获取节点，过滤掉不存在的
  return activePath
    .map(nodeId => nodeMap.get(nodeId))
    .filter((node): node is MessageNode => node !== undefined)
}

// ===== 分支导航（优化版本） =====

// 获取分支导航信息 - 使用缓存的节点映射
export function getBranchNavigation(nodeId: string, activePath: string[], roots: MessageNode[]): BranchNavigation {
  const nodeMap = buildNodeMap(roots)
  const node = nodeMap.get(nodeId)
  
  if (!node) {
    return { currentIndex: 0, totalBranches: 1, canNavigateLeft: false, canNavigateRight: false }
  }

  let siblings: MessageNode[]
  if (node.parentId === null) {
    siblings = roots
  } else {
    const parent = nodeMap.get(node.parentId)
    siblings = parent?.children || [node]
  }

  const currentIndex = siblings.findIndex(sibling => sibling.id === nodeId)
  return {
    currentIndex,
    totalBranches: siblings.length,
    canNavigateLeft: currentIndex > 0,
    canNavigateRight: currentIndex < siblings.length - 1
  }
}

// 切换分支
export function navigateBranch(
  nodeId: string, 
  direction: 'left' | 'right', 
  activePath: string[], 
  roots: MessageNode[]
): string[] | null {
  const nodeMap = buildNodeMap(roots)
  const node = nodeMap.get(nodeId)
  
  if (!node) return null

  const navigation = getBranchNavigation(nodeId, activePath, roots)
  
  let newIndex: number
  if (direction === 'left' && navigation.canNavigateLeft) {
    newIndex = navigation.currentIndex - 1
  } else if (direction === 'right' && navigation.canNavigateRight) {
    newIndex = navigation.currentIndex + 1
  } else {
    return null // 无法导航
  }

  // 获取兄弟节点
  let siblings: MessageNode[]
  if (node.parentId === null) {
    siblings = roots
  } else {
    const parent = nodeMap.get(node.parentId)
    if (!parent) return null
    siblings = parent.children
  }

  const targetSibling = siblings[newIndex]
  if (!targetSibling) return null

  // 获取当前节点在激活路径中的位置
  const nodeIndex = activePath.findIndex(id => id === nodeId)
  if (nodeIndex === -1) return null

  // 分支切换逻辑：
  // 1. 保留到切换节点之前的路径
  // 2. 切换到目标兄弟节点
  // 3. 在新分支中找到最深的可用路径
  const pathBeforeNode = activePath.slice(0, nodeIndex)
  const newBasePath = [...pathBeforeNode, targetSibling.id]
  
  // 找到最深路径
  const deepestPath = findDeepestPath(targetSibling)
  
  return [...newBasePath, ...deepestPath]
}

// 在给定分支中找到最深的路径
function findDeepestPath(branchRoot: MessageNode): string[] {
  const deepPath: string[] = []
  let currentNode = branchRoot
  
  // 沿着每层最新的子节点向下走（子节点已按时间排序）
  while (currentNode.children.length > 0) {
    // 选择最新的子节点（时间戳最大的）
    const latestChild = currentNode.children[currentNode.children.length - 1]
    deepPath.push(latestChild.id)
    currentNode = latestChild
  }
  
  return deepPath
}

// ===== 对话历史构建 =====

// 获取到指定节点的对话历史
export function getConversationHistory(nodeId: string, flatMessages: Map<string, FlatMessage>): FlatMessage[] {
  const history: FlatMessage[] = []
  let currentId: string | null = nodeId

  // 从目标节点向上追溯到根节点
  while (currentId) {
    const message = flatMessages.get(currentId)
    if (!message) break
    
    history.unshift(message) // 插入到开头，保持时间顺序
    currentId = message.parentId
  }

  return history
}

// ===== 重新生成支持 =====

// 获取重新生成的上下文
// 已移除未使用的 getRegenerateContext

// ===== 树操作 =====

// 添加新消息到树中
export function addMessageToTree(
  flatMessages: Map<string, FlatMessage>,
  activePath: string[],
  newMessage: FlatMessage
): { newFlatMessages: Map<string, FlatMessage>, newActivePath: string[] } {
  // 复制现有的扁平消息映射
  const newFlatMessages = new Map(flatMessages)
  newFlatMessages.set(newMessage.id, newMessage)

  // 更新激活路径
  const newActivePath = [...activePath, newMessage.id]

  return { newFlatMessages, newActivePath }
}

// 编辑用户消息（创建新分支）
export function editUserMessage(
  flatMessages: Map<string, FlatMessage>,
  activePath: string[],
  targetNodeId: string,
  newContent: string,
  components?: MessageComponents
): { newFlatMessages: Map<string, FlatMessage>, newActivePath: string[] } | null {
  const targetMessage = flatMessages.get(targetNodeId)
  if (!targetMessage || targetMessage.role !== 'user') {
    return null
  }

  // 创建编辑后的新用户消息（作为兄弟节点）
  const editedMessage = createFlatMessage(
    newContent.trim(), 
    'user', 
    targetMessage.parentId,
    undefined,
    components
  )
  
  // 复制现有的扁平消息映射并添加新消息
  const newFlatMessages = new Map(flatMessages)
  newFlatMessages.set(editedMessage.id, editedMessage)

  // 计算新的激活路径
  const targetNodeIndex = activePath.indexOf(targetNodeId)
  if (targetNodeIndex === -1) {
    // 如果目标节点不在当前路径中，直接添加到路径末尾
    return { newFlatMessages, newActivePath: [...activePath, editedMessage.id] }
  }

  // 替换路径中的目标节点为新编辑的消息，并移除后续节点
  const newActivePath = [
    ...activePath.slice(0, targetNodeIndex),
    editedMessage.id
  ]

  return { newFlatMessages, newActivePath }
}

// 直接编辑AI消息（不创建分支，不重新发送）
export function updateAssistantMessage(
  flatMessages: Map<string, FlatMessage>,
  targetNodeId: string,
  newContent: string
): Map<string, FlatMessage> | null {
  const targetMessage = flatMessages.get(targetNodeId)
  if (!targetMessage || targetMessage.role !== 'assistant') {
    return null
  }

  // 创建更新后的消息（保留原ID和其他属性）
  const updatedMessage: FlatMessage = {
    ...targetMessage,
    content: newContent.trim(),
    timestamp: new Date() // 更新时间戳
  }
  
  // 复制现有的扁平消息映射并更新消息
  const newFlatMessages = new Map(flatMessages)
  newFlatMessages.set(targetNodeId, updatedMessage)

  return newFlatMessages
}

// 删除节点及其兄弟节点，保留被删除节点的子节点
export function deleteNodeAndSiblings(
  flatMessages: Map<string, FlatMessage>,
  activePath: string[],
  targetNodeId: string
): { newFlatMessages: Map<string, FlatMessage>, newActivePath: string[] } | null {
  const targetMessage = flatMessages.get(targetNodeId)
  if (!targetMessage) {
    return null
  }

  // 构建树以获取结构信息
  const roots = buildTreeFromFlat(flatMessages)
  const nodeMap = buildNodeMap(roots)
  const targetNode = nodeMap.get(targetNodeId)
  
  if (!targetNode) {
    return null
  }

  // 找到目标节点的兄弟节点
  let siblings: MessageNode[]
  if (targetNode.parentId === null) {
    siblings = roots
  } else {
    const parent = nodeMap.get(targetNode.parentId)
    if (!parent) return null
    siblings = parent.children
  }

  // 先保存目标节点的直接子节点ID，这些节点需要被保留
  const targetNodeChildrenIds = new Set(targetNode.children.map(child => child.id))
  
  // 收集所有要删除的节点ID（目标节点 + 所有兄弟节点及其子树，但排除目标节点的直接子节点）
  const nodesToDelete = new Set<string>()
  
  // 递归收集节点及其所有子节点
  function collectNodeAndDescendants(node: MessageNode, isTargetNode: boolean) {
    nodesToDelete.add(node.id)
    // 如果是目标节点，跳过其直接子节点（但仍需递归处理兄弟节点的子树）
    node.children.forEach(child => {
      if (!(isTargetNode && targetNodeChildrenIds.has(child.id))) {
        collectNodeAndDescendants(child, false)
      }
    })
  }
  
  // 收集所有兄弟节点及其子树
  siblings.forEach(sibling => {
    const isTargetNode = sibling.id === targetNodeId
    collectNodeAndDescendants(sibling, isTargetNode)
  })

  // 复制扁平消息映射，删除标记的节点
  const newFlatMessages = new Map(flatMessages)
  nodesToDelete.forEach(id => {
    newFlatMessages.delete(id)
  })

  // 将被删除节点的子节点提升到父节点下
  targetNode.children.forEach(child => {
    const childMessage = flatMessages.get(child.id)
    if (childMessage) {
      // 更新子节点的 parentId 为被删除节点的父节点
      newFlatMessages.set(child.id, {
        ...childMessage,
        parentId: targetNode.parentId
      })
    }
  })

  // 更新激活路径：移除被删除的节点
  const newActivePath = activePath.filter(id => !nodesToDelete.has(id))

  return { newFlatMessages, newActivePath }
}

// 创建初始对话树
export function createInitialConversationTree(welcomeMessage?: string): ConversationTree {
  const flatMessages = new Map<string, FlatMessage>()
  
  if (welcomeMessage) {
    const welcomeMsg = createFlatMessage(welcomeMessage, 'assistant', null)
    flatMessages.set(welcomeMsg.id, welcomeMsg)
    
    return {
      flatMessages,
      rootNodes: buildTreeFromFlat(flatMessages),
      activePath: [welcomeMsg.id]
    }
  }

  return {
    flatMessages,
    rootNodes: [],
    activePath: []
  }
} 