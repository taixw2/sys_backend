import { Elysia } from 'elysia';
import { success, error, paginated } from '../../utils/response';
import { userAuth, merchantAuth, adminAuth } from '../../middleware/auth';
import { NotificationService } from './service';
import { NotificationModels } from './model';

export const notificationRoutes = new Elysia({ prefix: '/notification' })
  // 用户通知
  .group('/user', (app) => 
    app
      .use(userAuth)
      // 获取用户通知列表
      .get('/', async ({ query, currentUser }) => {
        const { page = 1, pageSize = 20 } = query as {
          page?: number;
          pageSize?: number;
        };

        try {
          const { notifications, total } = await NotificationService.getUserNotifications(
            currentUser.id, 
            page, 
            pageSize
          );

          return paginated(notifications, total, page, pageSize);
        } catch (err: any) {
          console.error('获取用户通知失败:', err);
          return error('获取通知列表失败');
        }
      }, {
        query: NotificationModels.User.GetNotificationsQuery
      })

      // 获取未读通知数量
      .get('/unread-count', async ({ currentUser }) => {
        try {
          const count = await NotificationService.getUnreadCount(currentUser.id, 'USER');
          return success({ count });
        } catch (err: any) {
          console.error('获取未读通知数量失败:', err);
          return error('获取未读通知数量失败');
        }
      })

      // 标记通知为已读
      .post('/:id/read', async ({ params }) => {
        const { id } = params as { id: string };

        try {
          const result = await NotificationService.markNotificationAsRead(id);
          if (result) {
            return success(null, '通知已标记为已读');
          } else {
            return error('标记通知已读失败');
          }
        } catch (err: any) {
          console.error('标记通知已读失败:', err);
          return error('标记通知已读失败');
        }
      }, {
        params: NotificationModels.User.MarkReadParams
      })

      // 批量标记所有通知为已读
      .post('/read-all', async ({ currentUser }) => {
        try {
          const result = await NotificationService.markNotificationsAsRead(currentUser.id, 'USER');
          if (result) {
            return success(null, '所有通知已标记为已读');
          } else {
            return error('批量标记通知已读失败');
          }
        } catch (err: any) {
          console.error('批量标记通知已读失败:', err);
          return error('批量标记通知已读失败');
        }
      })
  )

  // 商户通知
  .group('/merchant', (app) => 
    app
      .use(merchantAuth)
      // 获取商户通知列表
      .get('/', async ({ query, currentUser }) => {
        const { page = 1, pageSize = 20 } = query as {
          page?: number;
          pageSize?: number;
        };

        try {
          const { notifications, total } = await NotificationService.getMerchantNotifications(
            currentUser.id, 
            page, 
            pageSize
          );

          return paginated(notifications, total, page, pageSize);
        } catch (err: any) {
          console.error('获取商户通知失败:', err);
          return error('获取通知列表失败');
        }
      }, {
        query: NotificationModels.Merchant.GetNotificationsQuery
      })

      // 获取未读通知数量
      .get('/unread-count', async ({ currentUser }) => {
        try {
          const count = await NotificationService.getUnreadCount(currentUser.id, 'MERCHANT');
          return success({ count });
        } catch (err: any) {
          console.error('获取未读通知数量失败:', err);
          return error('获取未读通知数量失败');
        }
      })

      // 标记通知为已读
      .post('/:id/read', async ({ params, currentUser }) => {
        const { id } = params as { id: string };

        try {
          const result = await NotificationService.markNotificationAsRead(id);
          if (result) {
            return success(null, '通知已标记为已读');
          } else {
            return error('标记通知已读失败');
          }
        } catch (err: any) {
          console.error('标记通知已读失败:', err);
          return error('标记通知已读失败');
        }
      }, {
        params: NotificationModels.Merchant.MarkReadParams
      })

      // 批量标记所有通知为已读
      .post('/read-all', async ({ currentUser }) => {
        try {
          const result = await NotificationService.markNotificationsAsRead(currentUser.id, 'MERCHANT');
          if (result) {
            return success(null, '所有通知已标记为已读');
          } else {
            return error('批量标记通知已读失败');
          }
        } catch (err: any) {
          console.error('批量标记通知已读失败:', err);
          return error('批量标记通知已读失败');
        }
      })
  )

  // 管理员通知管理
  .group('/admin', (app) => 
    app
      .use(adminAuth)
      // 发送系统通知
      .post('/send', async ({ body, currentUser }) => {
        const { recipientType, recipientIds, title, content, type } = body as {
          recipientType: 'USER' | 'MERCHANT' | 'ADMIN';
          recipientIds: string[];
          title: string;
          content: string;
          type: string;
        };

        try {
          const results = [];
          for (const recipientId of recipientIds) {
            await NotificationService.createNotification({
              recipientId,
              recipientType,
              type,
              title,
              content
            });
            results.push({ recipientId, success: true });
          }

          return success({
            sent: results.length,
            results
          }, `成功发送${results.length}条通知`);
        } catch (err: any) {
          console.error('发送系统通知失败:', err);
          return error('发送系统通知失败');
        }
      }, {
        body: NotificationModels.Admin.SendNotificationBody
      })

      // 触发定时任务
      .post('/trigger-checks', async ({ currentUser }) => {
        try {
          // 检查会员到期提醒
          await NotificationService.checkMemberExpiryReminders();
          
          // 检查库存不足提醒
          await NotificationService.checkStockLowAlerts();

          return success(null, '定时检查任务已触发');
        } catch (err: any) {
          console.error('触发定时检查失败:', err);
          return error('触发定时检查失败');
        }
      })
  ); 