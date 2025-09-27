import { t } from 'elysia';

// 商户状态枚举
export const MerchantStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED'
} as const;

export type MerchantStatusType = typeof MerchantStatus[keyof typeof MerchantStatus];

// 购买状态枚举
export const PurchaseStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED'
} as const;

export type PurchaseStatusType = typeof PurchaseStatus[keyof typeof PurchaseStatus];

// 激活码时长枚举
export const ActivationDuration = {
  ONE_YEAR: 'ONE_YEAR',
  THREE_YEARS: 'THREE_YEARS',
  TWELVE_YEARS: 'TWELVE_YEARS',
  TWENTY_YEARS: 'TWENTY_YEARS'
} as const;

export type ActivationDurationType = typeof ActivationDuration[keyof typeof ActivationDuration];

// 商户个人信息相关模型
export const MerchantProfileModels = {
  // 商户信息响应
  MerchantProfileResponse: t.Object({
    id: t.String(),
    name: t.String(),
    code: t.String(),
    contact: t.Optional(t.String()),
    phone: t.String(),
    bankAccount: t.Optional(t.String()),
    status: t.String(),
    createdAt: t.Date(),
    stats: t.Object({
      activationCodes: t.Number(),
      purchases: t.Number(),
      rewards: t.Number()
    })
  }),

  // 更新商户信息请求
  UpdateProfileBody: t.Object({
    contact: t.Optional(t.String()),
    bankAccount: t.Optional(t.String())
  }),

  // 更新商户信息响应
  UpdateProfileResponse: t.Object({
    id: t.String(),
    name: t.String(),
    code: t.String(),
    contact: t.Optional(t.String()),
    phone: t.String(),
    bankAccount: t.Optional(t.String()),
    status: t.String()
  })
};

// 购买管理相关模型
export const MerchantPurchaseModels = {
  // 创建购买订单请求
  CreatePurchaseBody: t.Object({
    duration: t.Union([
      t.Literal('ONE_YEAR'),
      t.Literal('THREE_YEARS'),
      t.Literal('TWELVE_YEARS'),
      t.Literal('TWENTY_YEARS')
    ]),
    quantity: t.Number({
      minimum: 10,
      maximum: 1000,
      error: '购买数量必须在10-1000之间'
    })
  }),

  // 创建购买订单响应
  CreatePurchaseResponse: t.Object({
    id: t.String(),
    duration: t.String(),
    quantity: t.Number(),
    unitPrice: t.Number(),
    totalAmount: t.Number(),
    status: t.String(),
    createdAt: t.Date()
  }),

  // 获取购买记录查询参数
  GetPurchaseRecordsQuery: t.Object({
    page: t.Optional(t.Number({ minimum: 1 })),
    pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
    status: t.Optional(t.String())
  }),

  // 价格配置项
  PriceConfigItem: t.Object({
    duration: t.String(),
    userPrice: t.Number(),
    merchantPrice: t.Number()
  })
};

// 奖励管理相关模型
export const MerchantRewardModels = {
  // 获取奖励记录查询参数
  GetRewardRecordsQuery: t.Object({
    page: t.Optional(t.Number({ minimum: 1 })),
    pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
    month: t.Optional(t.String())
  }),

  // 销售统计响应
  SalesStatisticsResponse: t.Object({
    month: t.String(),
    totalSales: t.Number(),
    averageDailySales: t.Number(),
    isPeakSeason: t.Boolean(),
    currentLevel: t.Optional(t.Object({
      level: t.String(),
      minDailySales: t.Number(),
      maxDailySales: t.Optional(t.Number()),
      rewardQuantity: t.Number()
    })),
    dailySales: t.Record(t.String(), t.Number())
  })
};

// 管理员商户管理相关模型
export const AdminMerchantModels = {
  // 获取商户列表查询参数
  GetMerchantListQuery: t.Object({
      page: t.Optional(t.String({ minimum: 1 })),
      pageSize: t.Optional(t.String({ minimum: 1, maximum: 100 })),
    status: t.Optional(t.String()),
    keyword: t.Optional(t.String())
  }),

  // 商户列表项
  MerchantListItem: t.Object({
    id: t.String(),
    name: t.String(),
    code: t.String(),
    contact: t.Optional(t.String()),
    phone: t.String(),
    status: t.String(),
    createdAt: t.Date(),
    stats: t.Object({
      activationCodes: t.Number(),
      purchases: t.Number()
    })
  }),

  // 创建商户请求
  CreateMerchantBody: t.Object({
    name: t.String({
      minLength: 1,
      maxLength: 100,
      error: '商户名称不能为空且长度不能超过100字符'
    }),
    contact: t.String({
      minLength: 1,
      maxLength: 100,
      error: '联系人不能为空且长度不能超过100字符'
    }),
    phone: t.String({
      minLength: 11,
      maxLength: 11,
      error: '手机号格式不正确'
    }),
    bankAccount: t.Optional(t.String()),
    remark: t.Optional(t.String())
  }),

  // 创建商户响应
  CreateMerchantResponse: t.Object({
    id: t.String(),
    name: t.String(),
    code: t.String(),
    contact: t.Optional(t.String()),
    phone: t.String(),
    bankAccount: t.Optional(t.String()),
    status: t.String(),
    createdAt: t.Date()
  }),

  // 更新商户请求
  UpdateMerchantBody: t.Object({
    name: t.Optional(t.String()),
    contact: t.Optional(t.String()),
    phone: t.Optional(t.String()),
    bankAccount: t.Optional(t.String()),
    status: t.Optional(t.Union([
      t.Literal('PENDING'),
      t.Literal('ACTIVE'),
      t.Literal('DISABLED')
    ]))
  }),

  // 更新商户状态请求
  ToggleStatusBody: t.Object({
    status: t.Union([t.Literal('ACTIVE'), t.Literal('DISABLED')]),
    reason: t.Optional(t.String())
  }),

  // 更新商户状态响应
  ToggleStatusResponse: t.Object({
    id: t.String(),
    name: t.String(),
    status: t.String(),
    disabledReason: t.Optional(t.String())
  }),

  // 商户详情响应
  MerchantDetailResponse: t.Object({
    id: t.String(),
    name: t.String(),
    code: t.String(),
    contact: t.Optional(t.String()),
    phone: t.String(),
    bankAccount: t.Optional(t.String()),
    status: t.String(),
    disabledReason: t.Optional(t.String()),
    createdAt: t.Date(),
    stats: t.Object({
      activationCodes: t.Number(),
      purchases: t.Number(),
      rewards: t.Number()
    }),
    recentPurchases: t.Array(t.Any()),
    recentRewards: t.Array(t.Any())
  }),

  // 商户参数
  MerchantParams: t.Object({
    id: t.String()
  })
};

// 导出所有模型
export const MerchantModels = {
  Profile: MerchantProfileModels,
  Purchase: MerchantPurchaseModels,
  Reward: MerchantRewardModels,
  Admin: AdminMerchantModels
}; 