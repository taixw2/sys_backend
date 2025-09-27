import { PrismaClient } from '../../../generated/prisma'

const prisma = new PrismaClient()

// 句子类型枚举
export enum SentenceType {
  IMAGE = 'image',
  VIDEO = 'video', 
  VOICE = 'voice',
  TEXT = 'text'
}

// 句子结构接口
export interface Sentence {
  content?: string
  translation?: string
  media_url?: string
  type: SentenceType
}

// 情境美文接口
export interface BeautifulArticle {
  id: string
  local_book_id: string
  book_name: string
  unit_id: string
  title: string
  sentences: Sentence[]
  image?: string
  created_at: Date
  updated_at: Date
}

export class BeautifulArticleService {
  /**
   * 根据单元ID获取随机一篇情境美文
   */
  static async getRandomArticleByUnitId(unitId: string): Promise<BeautifulArticle | null> {
    try {
      // 获取该单元下的所有美文
      const articles = await prisma.beautifulArticle.findMany({
        where: { unitId },
        select: {
          id: true,
          localBookId: true,
          bookName: true,
          unitId: true,
          title: true,
          sentences: true,
          image: true,
          createdAt: true,
          updatedAt: true
        }
      })
      
      if (articles.length === 0) {
        return null
      }
      
      // 随机选择一篇美文
      const randomIndex = Math.floor(Math.random() * articles.length)
      const selectedArticle = articles[randomIndex]
      
      // sentences 已经是解析后的 JSON 对象
      const sentences = selectedArticle.sentences as Sentence[]
      
      return {
        id: selectedArticle.id,
        local_book_id: selectedArticle.localBookId,
        book_name: selectedArticle.bookName,
        unit_id: selectedArticle.unitId,
        title: selectedArticle.title,
        sentences: sentences,
        image: selectedArticle.image,
        created_at: selectedArticle.createdAt,
        updated_at: selectedArticle.updatedAt
      }
      
    } catch (error) {
      console.error('获取随机情境美文失败:', error)
      throw error
    }
  }
  
  /**
   * 根据单元ID获取情境美文列表
   */
  static async getArticlesByUnitId(
    unitId: string, 
    limit: number = 10, 
    offset: number = 0
  ): Promise<{ articles: BeautifulArticle[], total: number }> {
    try {
      const [articles, total] = await Promise.all([
        prisma.beautifulArticle.findMany({
          where: { unitId },
          select: {
            id: true,
            localBookId: true,
            bookName: true,
            unitId: true,
            title: true,
            sentences: true,
            image: true,
            createdAt: true,
            updatedAt: true
          },
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.beautifulArticle.count({
          where: { unitId }
        })
      ])
      
      // 处理文章数据，sentences 已经是解析后的 JSON 对象
      const processedArticles = articles.map(article => ({
        id: article.id,
        local_book_id: article.localBookId,
        book_name: article.bookName,
        unit_id: article.unitId,
        title: article.title,
        sentences: article.sentences as Sentence[],
        image: article.image,
        created_at: article.createdAt,
        updated_at: article.updatedAt
      }))
      
      return {
        articles: processedArticles,
        total
      }
      
    } catch (error) {
      console.error('获取情境美文列表失败:', error)
      throw error
    }
  }
  
  /**
   * 创建新的情境美文
   */
  static async createArticle(data: {
    localBookId: string
    bookName: string
    unitId: string
    title: string
    sentences: Sentence[]
    image?: string
  }): Promise<BeautifulArticle> {
    try {
      const article = await prisma.beautifulArticle.create({
        data: {
          localBookId: data.localBookId,
          bookName: data.bookName,
          unitId: data.unitId,
          title: data.title,
          sentences: data.sentences, // Prisma 会自动序列化 JSON
          image: data.image
        }
      })
      
      return {
        id: article.id,
        local_book_id: article.localBookId,
        book_name: article.bookName,
        unit_id: article.unitId,
        title: article.title,
        sentences: data.sentences,
        image: article.image,
        created_at: article.createdAt,
        updated_at: article.updatedAt
      }
      
    } catch (error) {
      console.error('创建情境美文失败:', error)
      throw error
    }
  }
  
  /**
   * 更新情境美文
   */
  static async updateArticle(
    id: string, 
    data: Partial<{
      localBookId: string
      bookName: string
      unitId: string
      title: string
      sentences: Sentence[]
      image: string
    }>
  ): Promise<BeautifulArticle | null> {
    try {
      const article = await prisma.beautifulArticle.update({
        where: { id },
        data: data // Prisma 会自动处理 JSON 序列化
      })
      
      // sentences 已经是解析后的 JSON 对象
      const sentences = article.sentences as Sentence[]
      
      return {
        id: article.id,
        local_book_id: article.localBookId,
        book_name: article.bookName,
        unit_id: article.unitId,
        title: article.title,
        sentences: sentences,
        image: article.image,
        created_at: article.createdAt,
        updated_at: article.updatedAt
      }
      
    } catch (error) {
      console.error('更新情境美文失败:', error)
      throw error
    }
  }
  
  /**
   * 删除情境美文
   */
  static async deleteArticle(id: string): Promise<boolean> {
    try {
      await prisma.beautifulArticle.delete({
        where: { id }
      })
      return true
    } catch (error) {
      console.error('删除情境美文失败:', error)
      throw error
    }
  }
  
  /**
   * 获取统计信息
   */
  static async getStats(): Promise<{
    totalArticles: number
    bookStats: Array<{ bookName: string, count: number }>
    unitStats: Array<{ unitId: string, count: number }>
  }> {
    try {
      const [totalArticles, bookStats, unitStats] = await Promise.all([
        prisma.beautifulArticle.count(),
        prisma.beautifulArticle.groupBy({
          by: ['bookName'],
          _count: {
            id: true
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          }
        }),
        prisma.beautifulArticle.groupBy({
          by: ['unitId'],
          _count: {
            id: true
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          }
        })
      ])
      
      return {
        totalArticles,
        bookStats: bookStats.map(stat => ({
          bookName: stat.bookName,
          count: stat._count.id
        })),
        unitStats: unitStats.map(stat => ({
          unitId: stat.unitId,
          count: stat._count.id
        }))
      }
      
    } catch (error) {
      console.error('获取统计信息失败:', error)
      throw error
    }
  }
}


