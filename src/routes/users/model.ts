import { t } from 'elysia';

// 会员记录类型枚举
export const MemberRecordType = {
  FIRST_LOGIN: 'FIRST_LOGIN',
  ACTIVATION: 'ACTIVATION',
  MANUAL_ADJUST: 'MANUAL_ADJUST',
  REFUND: 'REFUND'
} as const;

export type MemberRecordTypeType = typeof MemberRecordType[keyof typeof MemberRecordType];

// 激活码时长枚举
export const ActivationDuration = {
  ONE_YEAR: 'ONE_YEAR',
  THREE_YEARS: 'THREE_YEARS',
  TWELVE_YEARS: 'TWELVE_YEARS',
  TWENTY_YEARS: 'TWENTY_YEARS'
} as const;

export type ActivationDurationType = typeof ActivationDuration[keyof typeof ActivationDuration];

// 登录状态枚举
export const LoginStatus = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
} as const;

export type LoginStatusType = typeof LoginStatus[keyof typeof LoginStatus];

// 用户个人信息相关模型
export const UserProfileModels = {
  // 用户个人信息响应
  UserProfileResponse: t.Object({
    id: t.String(),
    phone: t.String(),
    memberExpireAt: t.Optional(t.Date()),
    isMember: t.Boolean(),
    daysUntilExpiry: t.Number(),
    isActive: t.Boolean(),
    createdAt: t.Date()
  })
};

// 激活码激活相关模型
export const UserActivationModels = {
  // 激活码激活请求
  ActivateBody: t.Object({
    activationCode: t.String({
      minLength: 8,
      maxLength: 8,
      error: '激活码格式错误'
    })
  }),

  // 激活码激活响应
  ActivateResponse: t.Object({
    message: t.String(),
    memberExpireAt: t.Date(),
    duration: t.String(),
    durationText: t.String()
  }),

  // 获取激活记录查询参数
  GetActivationRecordsQuery: t.Object({
    page: t.Optional(t.Number({ minimum: 1 })),
    pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
  }),

  // 激活记录项
  ActivationRecordItem: t.Object({
    id: t.String(),
    activationCode: t.String(),
    duration: t.String(),
    durationText: t.String(),
    merchantName: t.String(),
    activatedAt: t.Date(),
    status: t.String(),
    errorMessage: t.Optional(t.String())
  })
};

// 会员记录相关模型
export const UserMemberRecordModels = {
  // 获取会员记录查询参数
  GetMemberRecordsQuery: t.Object({
    page: t.Optional(t.Number({ minimum: 1 })),
    pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
    type: t.Optional(t.String())
  }),

  // 会员记录项
  MemberRecordItem: t.Object({
    id: t.String(),
    type: t.String(),
    typeText: t.String(),
    duration: t.Optional(t.Number()),
    durationText: t.String(),
    startDate: t.Date(),
    endDate: t.Date(),
    reason: t.String(),
    createdAt: t.Date()
  })
};

// 会员统计相关模型
export const UserMemberStatsModels = {
  // 会员状态
  MemberStatus: t.Object({
    isMember: t.Boolean(),
    memberExpireAt: t.Optional(t.Date()),
    daysUntilExpiry: t.Number(),
    isExpiringSoon: t.Boolean()
  }),

  // 总统计
  TotalStats: t.Object({
    totalActivations: t.Number(),
    totalMemberDays: t.Number(),
    totalMemberRecords: t.Number()
  }),

  // 会员记录统计
  MemberRecordStats: t.Record(t.String(), t.Object({
    count: t.Number(),
    totalDays: t.Number()
  })),

  // 会员统计响应
  MemberStatsResponse: t.Object({
    memberStatus: t.Object({
      isMember: t.Boolean(),
      memberExpireAt: t.Optional(t.Date()),
      daysUntilExpiry: t.Number(),
      isExpiringSoon: t.Boolean()
    }),
    totalStats: t.Object({
      totalActivations: t.Number(),
      totalMemberDays: t.Number(),
      totalMemberRecords: t.Number()
    }),
    activationStats: t.Record(t.String(), t.Number()),
    memberRecordStats: t.Record(t.String(), t.Object({
      count: t.Number(),
      totalDays: t.Number()
    }))
  })
};

// 登录日志相关模型
export const UserLoginLogModels = {
  // 获取登录日志查询参数
  GetLoginLogsQuery: t.Object({
    page: t.Optional(t.Number({ minimum: 1 })),
    pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
  }),

  // 登录日志项
  LoginLogItem: t.Object({
    id: t.String(),
    device: t.Optional(t.String()),
    ip: t.Optional(t.String()),
    status: t.String(),
    statusText: t.String(),
    createdAt: t.Date()
  })
};

// 导出所有模型
export const UserModels = {
  Profile: UserProfileModels,
  Activation: UserActivationModels,
  MemberRecord: UserMemberRecordModels,
  MemberStats: UserMemberStatsModels,
  LoginLog: UserLoginLogModels
}; 