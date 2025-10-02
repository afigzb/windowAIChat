import storage from '../storage'
import type { PromptCard, CreatePromptCardParams, UpdatePromptCardParams } from './types'
import { DEFAULT_PROMPT_CARDS } from './defaults'

const STORAGE_KEY = 'prompt_cards'

/**
 * 提示词卡片管理器
 * 负责提示词卡片的存储、增删改查
 */
class PromptCardManager {
  private cards: PromptCard[] = []
  private initialized = false

  /**
   * 初始化：从存储加载所有卡片
   * 如果是第一次使用（存储为空），则加载默认配置
   */
  initialize(): void {
    if (this.initialized) return
    
    const storedCards = storage.loadGenericData<PromptCard[]>(STORAGE_KEY, [])
    
    // 如果存储为空（第一次使用），使用默认配置
    if (storedCards.length === 0) {
      this.cards = [...DEFAULT_PROMPT_CARDS]
      this.save() // 保存默认配置到存储
      console.log('初始化默认提示词卡片')
    } else {
      this.cards = storedCards
    }
    
    this.initialized = true
  }

  /**
   * 保存卡片到存储
   */
  private save(): void {
    storage.saveGenericData(STORAGE_KEY, this.cards)
  }

  /**
   * 获取所有卡片（按order排序）
   */
  getAllCards(): PromptCard[] {
    this.initialize()
    return [...this.cards].sort((a, b) => a.order - b.order)
  }

  /**
   * 获取启用的卡片（按order排序）
   */
  getEnabledCards(): PromptCard[] {
    return this.getAllCards().filter(card => card.enabled)
  }

  /**
   * 根据ID获取卡片
   */
  getCardById(id: string): PromptCard | undefined {
    this.initialize()
    return this.cards.find(card => card.id === id)
  }

  /**
   * 创建新卡片
   */
  createCard(params: CreatePromptCardParams): PromptCard {
    this.initialize()
    
    const now = Date.now()
    const maxOrder = this.cards.length > 0 
      ? Math.max(...this.cards.map(c => c.order))
      : -1
    
    const newCard: PromptCard = {
      id: `prompt_${now}_${Math.random().toString(36).substr(2, 9)}`,
      title: params.title,
      content: params.content,
      placement: params.placement || 'system',
      enabled: params.enabled !== undefined ? params.enabled : true,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now
    }

    this.cards.push(newCard)
    this.save()
    return newCard
  }

  /**
   * 更新卡片
   */
  updateCard(id: string, params: UpdatePromptCardParams): PromptCard | null {
    this.initialize()
    
    const index = this.cards.findIndex(card => card.id === id)
    if (index < 0) return null

    const updatedCard: PromptCard = {
      ...this.cards[index],
      ...params,
      updatedAt: Date.now()
    }

    this.cards[index] = updatedCard
    this.save()
    return updatedCard
  }

  /**
   * 删除卡片
   */
  deleteCard(id: string): boolean {
    this.initialize()
    
    const index = this.cards.findIndex(card => card.id === id)
    if (index < 0) return false

    this.cards.splice(index, 1)
    this.save()
    return true
  }

  /**
   * 切换卡片启用状态
   */
  toggleCard(id: string): PromptCard | null {
    const card = this.getCardById(id)
    if (!card) return null

    return this.updateCard(id, { enabled: !card.enabled })
  }

  /**
   * 更新卡片顺序
   */
  reorderCards(orderedIds: string[]): void {
    this.initialize()
    
    const idToCard = new Map(this.cards.map(card => [card.id, card]))
    
    orderedIds.forEach((id, index) => {
      const card = idToCard.get(id)
      if (card) {
        card.order = index
        card.updatedAt = Date.now()
      }
    })

    this.save()
  }

  /**
   * 清空所有卡片
   */
  clearAll(): void {
    this.initialize()
    this.cards = []
    this.save()
  }
}

export const promptCardManager = new PromptCardManager()

