import { t } from 'elysia';

// TextBook 相关模型
export const TextBookModels = {
  // 创建 TextBook 请求体
  CreateBody: t.Object({
    name: t.String({
      minLength: 1,
      maxLength: 200,
      error: '教材名称不能为空，且不能超过200个字符'
    }),
    typeName: t.String(),
    stageName: t.String(),
    // units: t.Array(t.Object({
    //   name: t.String(),
    //   words: t.Array(t.String()),
    // })),
  }),

  CreateUnitBody: t.Object({
    textBookId: t.String(),
    name: t.String(),
    words: t.Array(t.String()),
  }),

  // TextBook 列表项
  TextBookItem: t.Object({
    id: t.String(),
    name: t.String(),
    typeName: t.Optional(t.String()),
    stageName: t.Optional(t.String()),
    unitsCount: t.Number(),
    createdAt: t.Date(),
    updatedAt: t.Date()
  }),

  // TextBook 详情
  TextBookDetail: t.Object({
    id: t.String(),
    name: t.String(),
    typeName: t.Optional(t.String()),
    stageName: t.Optional(t.String()),
    units: t.Array(t.Object({
      id: t.String(),
      name: t.String(),
      words: t.Optional(t.Any()),
      createdAt: t.Date(),
      updatedAt: t.Date()
    })),
    createdAt: t.Date(),
    updatedAt: t.Date()
  }),

  // 创建响应
  CreateResponse: t.Object({
    id: t.String(),
    name: t.String(),
    typeName: t.Optional(t.String()),
    stageName: t.Optional(t.String()),
    createdAt: t.Date()
  }),

  CreateUnitResponse: t.Object({
    id: t.String(),
    name: t.String(),
    words: t.Array(t.String()),
    textBookId: t.String(),
    createdAt: t.Date()
  }),
};

// 导出通用分页响应模型
export const PaginatedResponse = (itemSchema: any) => t.Object({
  data: t.Array(itemSchema),
  pagination: t.Object({
    page: t.Number(),
    pageSize: t.Number(),
    total: t.Number(),
    totalPages: t.Number()
  })
});
