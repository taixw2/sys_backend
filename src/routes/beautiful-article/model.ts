import { t } from 'elysia'

// 句子类型枚举
export const SentenceTypeEnum = t.Union([
  t.Literal('image'),
  t.Literal('video'),
  t.Literal('voice'),
  t.Literal('text')
])

// 句子结构模型
export const SentenceModel = t.Object({
  content: t.Optional(t.String()),
  translation: t.Optional(t.String()),
  media_url: t.Optional(t.String()),
  type: SentenceTypeEnum
})

// 情境美文创建模型
export const CreateBeautifulArticleModel = t.Object({
  local_book_id: t.String(),
  book_name: t.String(),
  unit_id: t.String(),
  title: t.String(),
  sentences: t.Array(SentenceModel),
  image: t.Optional(t.String())
})

// 情境美文更新模型
export const UpdateBeautifulArticleModel = t.Object({
  local_book_id: t.Optional(t.String()),
  book_name: t.Optional(t.String()),
  unit_id: t.Optional(t.String()),
  title: t.Optional(t.String()),
  sentences: t.Optional(t.Array(SentenceModel)),
  image: t.Optional(t.String())
})

// 情境美文响应模型
export const BeautifulArticleResponseModel = t.Object({
  id: t.String(),
  local_book_id: t.String(),
  book_name: t.String(),
  unit_id: t.String(),
  title: t.String(),
  sentences: t.Array(SentenceModel),
  image: t.Optional(t.String()),
  created_at: t.Date(),
  updated_at: t.Date()
})

// 情境美文列表响应模型
export const BeautifulArticleListResponseModel = t.Object({
  articles: t.Array(BeautifulArticleResponseModel),
  total: t.Number(),
  limit: t.Number(),
  offset: t.Number()
})

// 统计信息响应模型
export const BeautifulArticleStatsResponseModel = t.Object({
  totalArticles: t.Number(),
  bookStats: t.Array(t.Object({
    bookName: t.String(),
    count: t.Number()
  })),
  unitStats: t.Array(t.Object({
    unitId: t.String(),
    count: t.Number()
  }))
})

// 通用响应模型
export const ApiResponseModel = t.Object({
  success: t.Boolean(),
  message: t.Optional(t.String()),
  data: t.Optional(t.Any()),
  error: t.Optional(t.String())
})



