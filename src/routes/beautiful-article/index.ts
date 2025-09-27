import { Elysia, t } from 'elysia'
import { BeautifulArticleService } from './service'
import { 
  BeautifulArticleResponseModel, 
  BeautifulArticleListResponseModel,
  BeautifulArticleStatsResponseModel,
  ApiResponseModel
} from './model'

export const beautifulArticleRoutes = new Elysia({ prefix: '/beautiful-article' })
  .get('/random/:unitId', async ({ params }) => {
    const { unitId } = params
    
    try {
      const article = await BeautifulArticleService.getRandomArticleByUnitId(unitId)
      
      if (!article) {
        return { 
          success: false, 
          message: '该单元下没有找到情境美文' 
        }
      }
      
      return {
        success: true,
        data: article
      }
      
    } catch (error) {
      console.error('获取随机情境美文失败:', error)
      return { 
        success: false, 
        message: '获取失败', 
        error: (error as Error).message 
      }
    }
  }, {
    params: t.Object({
      unitId: t.String()
    }),
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.Optional(t.String()),
        data: t.Optional(BeautifulArticleResponseModel),
        error: t.Optional(t.String())
      })
    }
  })
  
  .get('/list/:unitId', async ({ params, query }) => {
    const { unitId } = params
    const { limit = 10, offset = 0 } = query
    
    try {
      const result = await BeautifulArticleService.getArticlesByUnitId(
        unitId,
        parseInt(limit as string),
        parseInt(offset as string)
      )
      
      return {
        success: true,
        data: {
          articles: result.articles,
          total: result.total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      }
      
    } catch (error) {
      console.error('获取情境美文列表失败:', error)
      return { 
        success: false, 
        message: '获取失败', 
        error: (error as Error).message 
      }
    }
  }, {
    params: t.Object({
      unitId: t.String()
    }),
    query: t.Object({
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String())
    }),
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.Optional(t.String()),
        data: t.Optional(BeautifulArticleListResponseModel),
        error: t.Optional(t.String())
      })
    }
  })
  
  .get('/stats', async () => {
    try {
      const stats = await BeautifulArticleService.getStats()
      
      return {
        success: true,
        data: stats
      }
      
    } catch (error) {
      console.error('获取统计信息失败:', error)
      return { 
        success: false, 
        message: '获取统计信息失败', 
        error: (error as Error).message 
      }
    }
  }, {
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.Optional(t.String()),
        data: t.Optional(BeautifulArticleStatsResponseModel),
        error: t.Optional(t.String())
      })
    }
  })
