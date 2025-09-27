import { t } from 'elysia';

// 激活码时长枚举
export const ActivationDuration = {
  ONE_YEAR: 'ONE_YEAR',
  THREE_YEARS: 'THREE_YEARS',
  TWELVE_YEARS: 'TWELVE_YEARS',
  TWENTY_YEARS: 'TWENTY_YEARS'
} as const;

export type ActivationDurationType = typeof ActivationDuration[keyof typeof ActivationDuration];

// 激活码状态枚举
export const ActivationCodeStatus = {
  AVAILABLE: 'AVAILABLE',
  ASSIGNED: 'ASSIGNED',
  USED: 'USED',
  RECYCLED: 'RECYCLED'
} as const;

export type ActivationCodeStatusType = typeof ActivationCodeStatus[keyof typeof ActivationCodeStatus];

// 激活记录状态枚举
export const ActivationRecordStatus = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
} as const;

export type ActivationRecordStatusType = typeof ActivationRecordStatus[keyof typeof ActivationRecordStatus];

// 时间范围枚举
export const TimeRange = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month'
} as const;

export type TimeRangeType = typeof TimeRange[keyof typeof TimeRange];

// 用户激活码相关模型
export const UserActivationModels = {
  // 激活码激活请求
  ActivateBody: t.Object({
    code: t.String({
      minLength: 8,
      maxLength: 8,
      error: '激活码格式错误，请检查后重试'
    })
  }),

  // 激活码激活响应
  ActivateResponse: t.Object({
    memberExpireAt: t.Date(),
    duration: t.Number(),
    activationCode: t.String()
  }),

  // 获取激活记录查询参数
  GetRecordsQuery: t.Object({
    page: t.Optional(t.Number({ minimum: 1 })),
    pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
  }),

  // 激活记录项
  ActivationRecordItem: t.Object({
    id: t.String(),
    activationCode: t.String(),
    duration: t.String(),
    activatedAt: t.Date(),
    status: t.String(),
    errorMessage: t.Optional(t.String())
  })
};

// 商户激活码相关模型
export const MerchantActivationModels = {
  // 获取库存查询参数
  GetInventoryQuery: t.Object({
    status: t.Optional(t.Union([
      t.Literal('AVAILABLE'),
      t.Literal('ASSIGNED'),
      t.Literal('USED'),
      t.Literal('RECYCLED')
    ])),
    duration: t.Optional(t.Union([
      t.Literal('ONE_YEAR'),
      t.Literal('THREE_YEARS'),
      t.Literal('TWELVE_YEARS'),
      t.Literal('TWENTY_YEARS')
    ])),
    page: t.Optional(t.Number({ minimum: 1 })),
    pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
  }),

  // 激活码库存项
  InventoryItem: t.Object({
    id: t.String(),
    code: t.String(),
    duration: t.String(),
    status: t.String(),
    expiresAt: t.Optional(t.Date()),
    createdAt: t.Date(),
    usedBy: t.Optional(t.Object({
      phone: t.String()
    })),
    usedAt: t.Optional(t.Date())
  }),

  // 获取统计查询参数
  GetStatisticsQuery: t.Object({
    timeRange: t.Optional(t.Union([
      t.Literal('today'),
      t.Literal('week'),
      t.Literal('month')
    ]))
  }),

  // 统计响应
  StatisticsResponse: t.Object({
    statusCounts: t.Record(t.String(), t.Number()),
    durationCounts: t.Record(t.String(), t.Number()),
    usageStats: t.Object({
      total: t.Number(),
      byDuration: t.Record(t.String(), t.Number())
    }),
    timeRange: t.Object({
      start: t.Date(),
      end: t.Date()
    })
  })
};

// 管理员激活码相关模型
export const AdminActivationModels = {
  // 生成激活码请求
  GenerateBody: t.Object({
    duration: t.Union([
      t.Literal('ONE_YEAR'),
      t.Literal('THREE_YEARS'),
      t.Literal('TWELVE_YEARS'),
      t.Literal('TWENTY_YEARS')
    ]),
    quantity: t.Number({
      minimum: 1,
      maximum: 10000,
      error: '生成数量必须在1-10000之间'
    }),
    merchantId: t.Optional(t.String()),
    expiresAt: t.Optional(t.String())
  }),

  // 生成激活码响应
  GenerateResponse: t.Object({
    generated: t.Number(),
    duration: t.String(),
    merchantId: t.Optional(t.String()),
    expiresAt: t.Optional(t.Date())
  }),

  // 分配激活码请求
  AssignBody: t.Object({
    codeIds: t.Array(t.String(), { minItems: 1 }),
    merchantId: t.String()
  }),

  // 分配激活码响应
  AssignResponse: t.Object({
    assigned: t.Number(),
    merchantId: t.String(),
    merchantName: t.String()
  }),

  // 回收激活码请求
  RecycleBody: t.Object({
    codeIds: t.Array(t.String(), { minItems: 1 }),
    reason: t.Optional(t.String())
  }),

  // 回收激活码响应
  RecycleResponse: t.Object({
    recycled: t.Number(),
    reason: t.Optional(t.String())
  }),

  // 获取激活码列表查询参数
  GetListQuery: t.Object({
    status: t.Optional(t.Union([
      t.Literal('AVAILABLE'),
      t.Literal('ASSIGNED'),
      t.Literal('USED'),
      t.Literal('RECYCLED')
    ])),
    duration: t.Optional(t.Union([
      t.Literal('ONE_YEAR'),
      t.Literal('THREE_YEARS'),
      t.Literal('TWELVE_YEARS'),
      t.Literal('TWENTY_YEARS')
    ])),
    merchantId: t.Optional(t.String()),
    page: t.Optional(t.String({ format: 'regex', pattern: '^[1-9]\\d*$' })),
    pageSize: t.Optional(t.String({ format: 'regex', pattern: '^[1-9]\\d*$' }))
  }),

  // 激活码列表项
  ActivationCodeItem: t.Object({
    id: t.String(),
    code: t.String(),
    duration: t.String(),
    status: t.String(),
    expiresAt: t.Optional(t.Date()),
    createdAt: t.Date(),
    merchant: t.Optional(t.Object({
      id: t.String(),
      name: t.String(),
      code: t.String()
    })),
    usedBy: t.Optional(t.Object({
      id: t.String(),
      phone: t.String()
    })),
    usedAt: t.Optional(t.Date())
  })
};

// 通用分页响应模型
export const PaginatedResponse = (itemSchema: any) => t.Object({
  data: t.Array(itemSchema),
  pagination: t.Object({
    page: t.Number(),
    pageSize: t.Number(),
    total: t.Number(),
    totalPages: t.Number()
  })
});

// 导出所有模型
export const ActivationModels = {
  User: UserActivationModels,
  Merchant: MerchantActivationModels,
  Admin: AdminActivationModels
}; 