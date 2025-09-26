import { useState, useCallback, useEffect } from 'react'
import storage from '../storage'
import type { ConversationTree, FlatMessage } from './types'
import { createInitialConversationTree } from './tree-utils'

// 对话历史项的元数据
export interface ConversationHistoryItem {
  id: string
  title: string
  timestamp: Date
  preview: string
  conversationTree: ConversationTree
}

// 对话历史管理器的返回类型
export interface ConversationHistoryManager {
  conversations: ConversationHistoryItem[]
  currentConversationId: string | null
  createNewConversation: () => string
  loadConversation: (id: string) => ConversationTree | null
  updateConversation: (id: string, tree: ConversationTree) => void
  deleteConversation: (id: string) => void
  clearAllConversations: () => void
  renameConversation: (id: string, newTitle: string) => void
}

const STORAGE_KEY = 'writing_conversation_history'
const ACTIVE_CONVERSATION_KEY = 'active_conversation_id'

// 生成对话标题（基于第一条用户消息）
function generateTitle(tree: ConversationTree): string {
  const messages = Array.from(tree.flatMessages.values())
  const firstUserMessage = messages.find(msg => msg.role === 'user')
  if (firstUserMessage) {
    // 截取前30个字符作为标题
    const title = firstUserMessage.content.substring(0, 30)
    return title.length < firstUserMessage.content.length ? title + '...' : title
  }
  return '新对话'
}

// 生成预览文本（基于最后一条消息）
function generatePreview(tree: ConversationTree): string {
  const messages = Array.from(tree.flatMessages.values())
  const sortedMessages = messages.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  const lastMessage = sortedMessages[0]
  if (lastMessage) {
    const preview = lastMessage.content.substring(0, 50)
    return preview.length < lastMessage.content.length ? preview + '...' : preview
  }
  return '空对话'
}

export function useConversationHistory(): ConversationHistoryManager {
  // 从存储加载对话历史
  const [conversations, setConversations] = useState<ConversationHistoryItem[]>(() => {
    try {
      const saved = storage.loadGenericData<ConversationHistoryItem[]>(STORAGE_KEY, [])
      // 反序列化日期对象
      return saved.map(conv => ({
        ...conv,
        timestamp: new Date(conv.timestamp),
        conversationTree: {
          ...conv.conversationTree,
          flatMessages: new Map(
            Object.entries(conv.conversationTree.flatMessages as any).map(([id, msg]: [string, any]) => [
              id,
              { ...msg, timestamp: new Date(msg.timestamp) }
            ])
          )
        }
      }))
    } catch (error) {
      console.error('加载对话历史失败:', error)
      return []
    }
  })

  // 加载上次活跃的对话ID
  const loadActiveConversationId = (): string | null => {
    try {
      const savedId = storage.loadGenericData<string>(ACTIVE_CONVERSATION_KEY, '')
      // 检查保存的ID是否还存在于对话列表中
      if (savedId && conversations.some(conv => conv.id === savedId)) {
        return savedId
      }
      // 如果保存的对话不存在，返回最新的对话
      return conversations.length > 0 ? conversations[0].id : null
    } catch (error) {
      console.warn('加载活跃对话ID失败:', error)
      return conversations.length > 0 ? conversations[0].id : null
    }
  }

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(loadActiveConversationId())

  // 保存活跃对话ID到存储
  const saveActiveConversationId = useCallback((id: string | null) => {
    try {
      storage.saveGenericData(ACTIVE_CONVERSATION_KEY, id || '')
    } catch (error) {
      console.error('保存活跃对话ID失败:', error)
    }
  }, [])

  // 保存到存储
  const saveToStorage = useCallback((convs: ConversationHistoryItem[]) => {
    try {
      // 序列化Map对象
      const serializable = convs.map(conv => ({
        ...conv,
        conversationTree: {
          ...conv.conversationTree,
          flatMessages: Object.fromEntries(conv.conversationTree.flatMessages)
        }
      }))
      storage.saveGenericData(STORAGE_KEY, serializable)
    } catch (error) {
      console.error('保存对话历史失败:', error)
    }
  }, [])

  // 自动保存
  useEffect(() => {
    saveToStorage(conversations)
  }, [conversations, saveToStorage])

  // 创建新对话
  const createNewConversation = useCallback((): string => {
    const newId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newConversation: ConversationHistoryItem = {
      id: newId,
      title: '新对话',
      timestamp: new Date(),
      preview: '空对话',
      conversationTree: createInitialConversationTree('')
    }
    
    setConversations(prev => [newConversation, ...prev])
    setCurrentConversationId(newId)
    saveActiveConversationId(newId) // 保存活跃对话ID
    return newId
  }, [saveActiveConversationId])

  // 加载对话
  const loadConversation = useCallback((id: string): ConversationTree | null => {
    const conversation = conversations.find(conv => conv.id === id)
    if (conversation) {
      setCurrentConversationId(id)
      saveActiveConversationId(id) // 保存活跃对话ID
      return conversation.conversationTree
    }
    return null
  }, [conversations, saveActiveConversationId])

  // 更新对话
  const updateConversation = useCallback((id: string, tree: ConversationTree) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === id) {
        return {
          ...conv,
          title: generateTitle(tree),
          preview: generatePreview(tree),
          timestamp: new Date(),
          conversationTree: tree
        }
      }
      return conv
    }))
  }, [])

  // 删除对话
  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const filtered = prev.filter(conv => conv.id !== id)
      // 如果删除的是当前对话，切换到第一个对话
      if (currentConversationId === id && filtered.length > 0) {
        const newActiveId = filtered[0].id
        setCurrentConversationId(newActiveId)
        saveActiveConversationId(newActiveId) // 保存新的活跃对话ID
      } else if (filtered.length === 0) {
        setCurrentConversationId(null)
        saveActiveConversationId(null) // 清空活跃对话ID
      }
      return filtered
    })
  }, [currentConversationId, saveActiveConversationId])

  // 清空所有对话
  const clearAllConversations = useCallback(() => {
    setConversations([])
    setCurrentConversationId(null)
    saveActiveConversationId(null) // 清空活跃对话ID
  }, [saveActiveConversationId])

  // 重命名对话
  const renameConversation = useCallback((id: string, newTitle: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === id) {
        return { ...conv, title: newTitle }
      }
      return conv
    }))
  }, [])

  return {
    conversations,
    currentConversationId,
    createNewConversation,
    loadConversation,
    updateConversation,
    deleteConversation,
    clearAllConversations,
    renameConversation
  }
}