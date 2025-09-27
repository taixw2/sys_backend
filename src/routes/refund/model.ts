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
  USED: 'USED',
  ASSIGNED: 'ASSIGNED',
  RECYCLED: 'RECYCLED'
} as const;

export type ActivationCodeStatusType = typeof ActivationCodeStatus[keyof typeof ActivationCodeStatus];

// 商户回收激活码请求
export const RecycleCodesBody = t.Object({
  codes: t.Array(t.String()),
  reason: t.Optional(t.String())
});

// 可回收激活码查询参数
export const RecyclableCodesQuery = t.Object({
  page: t.Optional(t.Number({ minimum: 1 })),
  pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  duration: t.Optional(t.String()),
  keyword: t.Optional(t.String())
});

// 回收记录查询参数
export const RecycleRecordsQuery = t.Object({
  page: t.Optional(t.Number({ minimum: 1 })),
  pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
});

// 管理员重新分配激活码请求
export const ReassignCodesBody = t.Object({
  codeIds: t.Array(t.String()),
  merchantId: t.String()
});

// 退款统计查询参数
export const RefundStatisticsQuery = t.Object({
  startDate: t.Optional(t.String()),
  endDate: t.Optional(t.String())
});

export const RefundModels = {
  RecycleCodesBody,
  RecyclableCodesQuery,
  RecycleRecordsQuery,
  ReassignCodesBody,
  RefundStatisticsQuery
}; 