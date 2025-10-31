import { useState, useCallback, useEffect, useRef } from 'react'
import storage from '../../storage'
import type { ConversationTree, FlatMessage } from '../types'
import { createInitialConversationTree } from './tree-utils'

// 对话元数据（索引中存储的轻量信息）
export interface ConversationMetadata {
  id: string
  title: string
  timestamp: Date
  preview: string
}

// 完整对话数据（包含对话树）
export interface ConversationHistoryItem extends ConversationMetadata {
  conversationTree: ConversationTree
}

// 对话历史管理器的返回类型
export interface ConversationHistoryManager {
  conversations: ConversationMetadata[]  // 只存储元数据列表
  currentConversationId: string | null
  createNewConversation: () => string
  loadConversation: (id: string) => ConversationTree | null
  updateConversation: (id: string, tree: ConversationTree) => void
  deleteConversation: (id: string) => void
  clearAllConversations: () => void
  renameConversation: (id: string, newTitle: string) => void
}

const STORAGE_KEY = 'writing_conversation_history'  // 旧格式的key，用于迁移
const ACTIVE_CONVERSATION_KEY = 'active_conversation_id'

// 生成对话标题（基于第一条用户消息）
function generateTitle(tree: ConversationTree): string {
  const messages = Array.from(tree.flatMessages.values())
  const firstUserMessage = messages.find(msg => msg.role === 'user')
  if (firstUserMessage && firstUserMessage.content) {
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
  if (lastMessage && lastMessage.content) {
    const preview = lastMessage.content.substring(0, 50)
    return preview.length < lastMessage.content.length ? preview + '...' : preview
  }
  return '空对话'
}

// 数据迁移：为旧消息添加 components 字段（向后兼容）
function migrateMessage(msg: FlatMessage): FlatMessage {
  // 如果消息已经有 components，直接返回
  if (msg.components) {
    return msg
  }

  // 为旧消息生成 components
  // 对于 user 消息，将 content 作为 userInput
  if (msg.role === 'user') {
    return {
      ...msg,
      components: {
        userInput: msg.content
        // attachedFiles 为空，因为旧消息没有区分
      }
    }
  }

  // assistant 和 system 消息不需要特殊处理
  return msg
}

/**
 * 序列化对话树（Map -> Object）
 */
function serializeConversationTree(tree: ConversationTree): any {
  return {
    ...tree,
    flatMessages: Object.fromEntries(tree.flatMessages)
  }
}

/**
 * 反序列化对话树（Object -> Map）
 */
function deserializeConversationTree(data: any): ConversationTree {
  return {
    ...data,
    flatMessages: new Map(
      Object.entries(data.flatMessages || {}).map(([id, msg]: [string, any]) => [
        id,
        migrateMessage({ ...msg, timestamp: new Date(msg.timestamp) })
      ])
    )
  }
}

/**
 * 从旧格式迁移数据到新格式（独立文件存储）
 */
function migrateFromOldFormat(): ConversationMetadata[] {
  try {
    const oldData = storage.loadGenericData<any[]>(STORAGE_KEY, [])
    
    if (!oldData || oldData.length === 0) {
      return []
    }

    console.log(`检测到旧格式数据，开始迁移 ${oldData.length} 个对话...`)
    
    const migratedMetadata: ConversationMetadata[] = []
    
    for (const conv of oldData) {
      try {
        // 反序列化并保存到独立文件
        const conversationTree = deserializeConversationTree(conv.conversationTree)
        const metadata: ConversationMetadata = {
          id: conv.id,
          title: conv.title,
          timestamp: new Date(conv.timestamp),
          preview: conv.preview
        }
        
        // 保存到独立文件
        storage.saveConversation(conv.id, serializeConversationTree(conversationTree))
        migratedMetadata.push(metadata)
        
        console.log(`✓ 迁移对话: ${conv.id}`)
      } catch (error) {
        console.error(`迁移对话 ${conv.id} 失败:`, error)
      }
    }
    
    // 保存新索引
    storage.saveConversationIndex(migratedMetadata)
    
    // 清理旧数据
    storage.saveGenericData(STORAGE_KEY, [])
    
    console.log(`✓ 迁移完成，共 ${migratedMetadata.length} 个对话`)
    return migratedMetadata
  } catch (error) {
    console.error('数据迁移失败:', error)
    return []
  }
}

export function useConversationHistory(): ConversationHistoryManager {
  // 缓存最近加载的对话树，避免重复读取文件
  const conversationCache = useRef<Map<string, ConversationTree>>(new Map())

  // 从存储加载对话索引（只加载元数据）
  const [conversations, setConversations] = useState<ConversationMetadata[]>(() => {
    try {
      // 尝试加载新格式索引
      let index = storage.loadConversationIndex()
      
      // 如果索引为空，尝试从旧格式迁移
      if (index.length === 0) {
        index = migrateFromOldFormat()
      }
      
      // 反序列化日期对象
      return index.map(meta => ({
        ...meta,
        timestamp: new Date(meta.timestamp)
      }))
    } catch (error) {
      console.error('加载对话索引失败:', error)
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

  // 保存索引到存储（只保存元数据）
  const saveIndexToStorage = useCallback((metadataList: ConversationMetadata[]) => {
    try {
      storage.saveConversationIndex(metadataList)
    } catch (error) {
      console.error('保存对话索引失败:', error)
    }
  }, [])

  // 自动保存索引（当对话列表变化时）
  useEffect(() => {
    saveIndexToStorage(conversations)
  }, [conversations, saveIndexToStorage])

  // 创建新对话
  const createNewConversation = useCallback((): string => {
    const newId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const conversationTree = createInitialConversationTree('')
    
    // 元数据
    const metadata: ConversationMetadata = {
      id: newId,
      title: '新对话',
      timestamp: new Date(),
      preview: '空对话'
    }
    
    // 保存到独立文件
    storage.saveConversation(newId, serializeConversationTree(conversationTree))
    
    // 缓存对话树
    conversationCache.current.set(newId, conversationTree)
    
    // 添加到索引（状态更新会触发索引保存）
    setConversations(prev => [metadata, ...prev])
    setCurrentConversationId(newId)
    saveActiveConversationId(newId)
    
    return newId
  }, [saveActiveConversationId])

  // 加载对话（从独立文件懒加载）
  const loadConversation = useCallback((id: string): ConversationTree | null => {
    // 检查对话是否存在于索引中
    const metadata = conversations.find(conv => conv.id === id)
    if (!metadata) {
      console.warn(`对话 ${id} 不存在于索引中`)
      return null
    }
    
    // 先检查缓存
    if (conversationCache.current.has(id)) {
      setCurrentConversationId(id)
      saveActiveConversationId(id)
      return conversationCache.current.get(id)!
    }
    
    // 从文件加载
    try {
      const data = storage.loadConversation(id)
      if (!data) {
        console.error(`对话文件 ${id} 不存在`)
        return null
      }
      
      const conversationTree = deserializeConversationTree(data)
      
      // 缓存
      conversationCache.current.set(id, conversationTree)
      
      setCurrentConversationId(id)
      saveActiveConversationId(id)
      
      return conversationTree
    } catch (error) {
      console.error(`加载对话 ${id} 失败:`, error)
      return null
    }
  }, [conversations, saveActiveConversationId])

  // 更新对话（保存到独立文件）
  const updateConversation = useCallback((id: string, tree: ConversationTree) => {
    try {
      // 保存到独立文件
      storage.saveConversation(id, serializeConversationTree(tree))
      
      // 更新缓存
      conversationCache.current.set(id, tree)
      
      // 更新索引中的元数据
      setConversations(prev => prev.map(conv => {
        if (conv.id === id) {
          return {
            ...conv,
            title: generateTitle(tree),
            preview: generatePreview(tree),
            timestamp: new Date()
          }
        }
        return conv
      }))
    } catch (error) {
      console.error(`更新对话 ${id} 失败:`, error)
    }
  }, [])

  // 删除对话（同时删除文件和缓存）
  const deleteConversation = useCallback((id: string) => {
    try {
      // 删除文件
      storage.deleteConversation(id)
      
      // 清除缓存
      conversationCache.current.delete(id)
      
      // 从索引中移除
      setConversations(prev => {
        const filtered = prev.filter(conv => conv.id !== id)
        
        // 如果删除的是当前对话，切换到第一个对话
        if (currentConversationId === id && filtered.length > 0) {
          const newActiveId = filtered[0].id
          setCurrentConversationId(newActiveId)
          saveActiveConversationId(newActiveId)
        } else if (filtered.length === 0) {
          setCurrentConversationId(null)
          saveActiveConversationId(null)
        }
        
        return filtered
      })
    } catch (error) {
      console.error(`删除对话 ${id} 失败:`, error)
    }
  }, [currentConversationId, saveActiveConversationId])

  // 清空所有对话（删除所有文件）
  const clearAllConversations = useCallback(() => {
    try {
      // 获取所有对话ID
      const allIds = conversations.map(c => c.id)
      
      // 删除所有对话文件
      storage.clearAllConversations(allIds)
      
      // 清空缓存
      conversationCache.current.clear()
      
      // 清空状态
      setConversations([])
      setCurrentConversationId(null)
      saveActiveConversationId(null)
    } catch (error) {
      console.error('清空所有对话失败:', error)
    }
  }, [conversations, saveActiveConversationId])

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