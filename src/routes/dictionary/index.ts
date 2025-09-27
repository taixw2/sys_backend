import { Elysia, t } from 'elysia'
import { PrismaClient } from '../../../generated/prisma'

const prisma = new PrismaClient()

export const dictionaryRoutes = new Elysia({ prefix: '/dictionary' })
  .get('/', async ({ query }) => {
    const { word, limit = 10, offset = 0 } = query
    
    try {
      if (word) {
        // 精确查询
        const exactMatch = await prisma.dictionary.findUnique({
          where: { word },
          include: { wordDetail: true }
        })
        
        if (exactMatch) {
          return { success: true, data: [exactMatch] }
        }
        
        // 模糊查询
        const fuzzyMatches = await prisma.dictionary.findMany({
          where: {
            OR: [
              { word: { contains: word } },
              { sw: { contains: word.toLowerCase().replace(/[^a-z0-9]/g, '') } }
            ]
          },
          include: { wordDetail: true },
          take: parseInt(limit as string),
          skip: parseInt(offset as string)
        })
        
        return { success: true, data: fuzzyMatches }
      }
      
      // 获取常用词列表
      const commonWords = await prisma.dictionary.findMany({
        where: {
          collins: { not: null, lte: 3 }
        },
        orderBy: { collins: 'asc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: { wordDetail: true }
      })
      
      return { success: true, data: commonWords }
      
    } catch (error) {
      console.error('查询词典失败:', error)
      return { success: false, message: '查询失败', error: (error as Error).message }
    }
  }, {
    query: t.Object({
      word: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String())
    })
  })
  
  .get('/random', async ({ query }) => {
    const { count = 5 } = query
    
    try {
      // 随机获取单词
      const randomWords = await prisma.dictionary.findMany({
        where: {
          collins: { not: null, lte: 3 }
        },
        orderBy: {
          // SQLite 的随机排序
          id: 'asc'
        },
        take: parseInt(count as string),
        include: { wordDetail: true }
      })
      
      return { success: true, data: randomWords }
      
    } catch (error) {
      console.error('获取随机单词失败:', error)
      return { success: false, message: '获取失败', error: (error as Error).message }
    }
  }, {
    query: t.Object({
      count: t.Optional(t.String())
    })
  })
  
  .get('/stats', async () => {
    try {
      const totalWords = await prisma.dictionary.count()
      const wordsWithDetails = await prisma.wordDetail.count()
      const commonWords = await prisma.dictionary.count({
        where: { collins: { not: null, lte: 3 } }
      })
      
      return {
        success: true,
        data: {
          totalWords,
          wordsWithDetails,
          commonWords,
          detailCoverage: Math.round((wordsWithDetails / totalWords) * 100)
        }
      }
      
    } catch (error) {
      console.error('获取统计信息失败:', error)
      return { success: false, message: '获取统计信息失败', error: (error as Error).message }
    }
  })
  
  .get('/search', async ({ query }) => {
    const { q, type = 'all', limit = 20 } = query
    
    if (!q) {
      return { success: false, message: '搜索关键词不能为空' }
    }
    
    try {
      let whereClause: any = {}
      
      switch (type) {
        case 'word':
          whereClause = {
            OR: [
              { word: { contains: q } },
              { sw: { contains: q.toLowerCase().replace(/[^a-z0-9]/g, '') } }
            ]
          }
          break
        case 'translation':
          whereClause = { translation: { contains: q } }
          break
        case 'definition':
          whereClause = { definition: { contains: q } }
          break
        default:
          whereClause = {
            OR: [
              { word: { contains: q } },
              { translation: { contains: q } },
              { definition: { contains: q } },
              { sw: { contains: q.toLowerCase().replace(/[^a-z0-9]/g, '') } }
            ]
          }
      }
      
      const results = await prisma.dictionary.findMany({
        where: whereClause,
        include: { wordDetail: true },
        take: parseInt(limit as string),
        orderBy: [
          { collins: 'asc' },
          { frq: 'desc' }
        ]
      })
      
      return { success: true, data: results }
      
    } catch (error) {
      console.error('搜索失败:', error)
      return { success: false, message: '搜索失败', error: (error as Error).message }
    }
  }, {
    query: t.Object({
      q: t.String(),
      type: t.Optional(t.String()),
      limit: t.Optional(t.String())
    })
  })
