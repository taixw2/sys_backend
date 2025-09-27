import { t } from 'elysia';

// 通知类型枚举
export const NotificationType = {
  SYSTEM: 'SYSTEM',
  MEMBER_EXPIRY: 'MEMBER_EXPIRY',
  STOCK_LOW: 'STOCK_LOW',
  ACTIVATION: 'ACTIVATION',
  REFUND: 'REFUND'
} as const;

export type NotificationTypeType = typeof NotificationType[keyof typeof NotificationType];

// 接收者类型枚举
export const RecipientType = {
  USER: 'USER',
  MERCHANT: 'MERCHANT',
  ADMIN: 'ADMIN'
} as const;

export type RecipientTypeType = typeof RecipientType[keyof typeof RecipientType];

// 通知状态枚举
export const NotificationStatus = {
  UNREAD: 'UNREAD',
  READ: 'READ'
} as const;

export type NotificationStatusType = typeof NotificationStatus[keyof typeof NotificationStatus];

// 用户通知相关模型
export const UserNotificationModels = {
  // 获取通知列表查询参数
  GetNotificationsQuery: t.Object({
    page: t.Optional(t.Number({ minimum: 1 })),
    pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
  }),

  // 通知项
  NotificationItem: t.Object({
    id: t.String(),
    title: t.String(),
    content: t.String(),
    type: t.String(),
    status: t.String(),
    createdAt: t.Date(),
    readAt: t.Optional(t.Date())
  }),

  // 标记通知已读参数
  MarkReadParams: t.Object({
    id: t.String()
  }),

  // 未读数量响应
  UnreadCountResponse: t.Object({
    count: t.Number()
  })
};

// 商户通知相关模型
export const MerchantNotificationModels = {
  // 获取通知列表查询参数
  GetNotificationsQuery: t.Object({
    page: t.Optional(t.Number({ minimum: 1 })),
    pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
  }),

  // 通知项
  NotificationItem: t.Object({
    id: t.String(),
    title: t.String(),
    content: t.String(),
    type: t.String(),
    status: t.String(),
    createdAt: t.Date(),
    readAt: t.Optional(t.Date())
  }),

  // 标记通知已读参数
  MarkReadParams: t.Object({
    id: t.String()
  }),

  // 未读数量响应
  UnreadCountResponse: t.Object({
    count: t.Number()
  })
};

// 管理员通知相关模型
export const AdminNotificationModels = {
  // 发送系统通知请求
  SendNotificationBody: t.Object({
    recipientType: t.Union([
      t.Literal('USER'),
      t.Literal('MERCHANT'),
      t.Literal('ADMIN')
    ]),
    recipientIds: t.Array(t.String(), { minItems: 1 }),
    title: t.String({
      minLength: 1,
      maxLength: 100,
      error: '标题不能为空且长度不能超过100字符'
    }),
    content: t.String({
      minLength: 1,
      maxLength: 1000,
      error: '内容不能为空且长度不能超过1000字符'
    }),
    type: t.String({
      minLength: 1,
      maxLength: 50,
      error: '通知类型不能为空且长度不能超过50字符'
    })
  }),

  // 发送通知结果项
  SendResultItem: t.Object({
    recipientId: t.String(),
    success: t.Boolean()
  }),

  // 发送通知响应
  SendNotificationResponse: t.Object({
    sent: t.Number(),
    results: t.Array(t.Object({
      recipientId: t.String(),
      success: t.Boolean()
    }))
  })
};

// 导出所有模型
export const NotificationModels = {
  User: UserNotificationModels,
  Merchant: MerchantNotificationModels,
  Admin: AdminNotificationModels
}; 