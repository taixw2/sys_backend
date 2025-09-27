import { t } from 'elysia';

// 用户管理相关模型
export const AdminUserModels = {
  // 获取用户列表查询参数
  GetUserListQuery: t.Object({
    page: t.Optional(t.Number({ minimum: 1 })),
    pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
    keyword: t.Optional(t.String()),
    memberStatus: t.Optional(t.String()),
    isActive: t.Optional(t.String())
  }),

  // 用户参数
  UserParams: t.Object({
    id: t.String()
  }),

  // 切换用户状态请求
  ToggleUserStatusBody: t.Object({
    isActive: t.Boolean(),
    reason: t.Optional(t.String())
  }),

  // 调整用户会员时长请求
  AdjustMembershipBody: t.Object({
    adjustType: t.Union([t.Literal('extend'), t.Literal('reduce')]),
    duration: t.Number(),
    reason: t.String()
  })
};

// 系统配置管理相关模型
export const AdminConfigModels = {
  // 创建价格配置请求
  CreatePriceConfigBody: t.Object({
    duration: t.Union([
      t.Literal('ONE_YEAR'),
      t.Literal('THREE_YEARS'),
      t.Literal('TWELVE_YEARS'),
      t.Literal('TWENTY_YEARS')
    ]),
    userPrice: t.Number(),
    merchantPrice: t.Number()
  }),

  // 创建奖励规则请求
  CreateRewardRuleBody: t.Object({
    level: t.Union([
      t.Literal('BASIC'),
      t.Literal('ADVANCED'),
      t.Literal('PEAK'),
      t.Literal('TOP')
    ]),
    minDailySales: t.Number(),
    maxDailySales: t.Optional(t.Number()),
    rewardQuantity: t.Number(),
    isPeakSeason: t.Boolean()
  }),

  // 更新奖励规则请求
  UpdateRewardRuleBody: t.Object({
    level: t.Optional(t.Union([
      t.Literal('BASIC'),
      t.Literal('ADVANCED'),
      t.Literal('PEAK'),
      t.Literal('TOP')
    ])),
    minDailySales: t.Optional(t.Number()),
    maxDailySales: t.Optional(t.Number()),
    rewardQuantity: t.Optional(t.Number()),
    isPeakSeason: t.Optional(t.Boolean()),
    isActive: t.Optional(t.Boolean())
  }),

  // 奖励规则参数
  RewardRuleParams: t.Object({
    id: t.String()
  }),

  // 创建旺季配置请求
  CreatePeakSeasonBody: t.Object({
    name: t.String(),
    startMonth: t.Number(),
    endMonth: t.Number()
  }),

  // 更新系统配置请求
  UpdateSystemConfigBody: t.Object({
    value: t.String(),
    description: t.Optional(t.String())
  }),

  // 系统配置参数
  SystemConfigParams: t.Object({
    key: t.String()
  })
};

// 统计报表相关模型
export const AdminStatisticsModels = {
  // 统计查询参数
  StatisticsQuery: t.Object({
    startDate: t.Optional(t.String()),
    endDate: t.Optional(t.String())
  })
};

// 操作日志相关模型
export const AdminLogModels = {
  // 获取操作日志查询参数
  GetOperationLogsQuery: t.Object({
    page: t.Optional(t.Number({ minimum: 1 })),
    pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
    operatorType: t.Optional(t.String()),
    operation: t.Optional(t.String())
  })
};

// 导出所有模型
export const AdminModels = {
  User: AdminUserModels,
  Config: AdminConfigModels,
  Statistics: AdminStatisticsModels,
  Log: AdminLogModels
}; 