import { db } from '../utils/db';
import { SmsService } from './sms';

/**
 * 通知服务类
 */
export class NotificationService {
  /**
   * 发送会员到期提醒
   */
  static async sendMemberExpiryReminder(userId: string): Promise<boolean> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.memberExpireAt) {
        return false;
      }

      const expiryDate = user.memberExpireAt.toLocaleDateString();

             // 发送短信通知
       await SmsService.sendVerificationCode(
         user.phone,
         'MEMBER_EXPIRY',
         []
       );

      // 创建系统通知
      await this.createNotification({
        recipientId: userId,
        recipientType: 'USER',
        type: 'MEMBER_EXPIRY',
        title: '会员到期提醒',
        content: `您的会员将于${expiryDate}到期，请及时续费。`
      });

      return true;
    } catch (error) {
      console.error('发送会员到期提醒失败:', error);
      return false;
    }
  }

  /**
   * 发送激活成功通知
   */
  static async sendActivationSuccessNotification(userId: string, duration: string, expireAt: Date): Promise<boolean> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return false;
      }

             const durationMap: Record<string, string> = {
         ONE_YEAR: '1年',
         THREE_YEARS: '3年',
         TWELVE_YEARS: '12年',
         TWENTY_YEARS: '20年'
       };
       const durationText = durationMap[duration] || duration;

      const expiryDate = expireAt.toLocaleDateString();

             // 发送短信通知
       await SmsService.sendVerificationCode(
         user.phone,
         'ACTIVATION_SUCCESS',
         [durationText, expiryDate]
       );

      // 创建系统通知
      await this.createNotification({
        recipientId: userId,
        recipientType: 'USER',
        type: 'ACTIVATION_SUCCESS',
        title: '激活成功',
        content: `激活码激活成功！您的${durationText}会员已生效，有效期至${expiryDate}。`
      });

      return true;
    } catch (error) {
      console.error('发送激活成功通知失败:', error);
      return false;
    }
  }

  /**
   * 发送奖励到账通知
   */
  static async sendRewardNotification(merchantId: string, month: string, quantity: number): Promise<boolean> {
    try {
      const merchant = await db.merchant.findUnique({
        where: { id: merchantId }
      });

      if (!merchant) {
        return false;
      }

             // 发送短信通知
       await SmsService.sendVerificationCode(
         merchant.phone,
         'REWARD_RECEIVED',
         [month, quantity.toString()]
       );

      // 创建系统通知
      await this.createNotification({
        recipientId: merchantId,
        recipientType: 'MERCHANT',
        type: 'REWARD_RECEIVED',
        title: '奖励到账',
        content: `您${month}月销售达标，奖励${quantity}个激活码已到账。`
      });

      return true;
    } catch (error) {
      console.error('发送奖励通知失败:', error);
      return false;
    }
  }

  /**
   * 发送库存不足提醒
   */
  static async sendStockLowAlert(merchantId: string, currentStock: number): Promise<boolean> {
    try {
      const merchant = await db.merchant.findUnique({
        where: { id: merchantId }
      });

      if (!merchant) {
        return false;
      }

             // 发送短信通知
       await SmsService.sendVerificationCode(
         merchant.phone,
         'STOCK_LOW',
         [currentStock.toString()]
       );

      // 创建系统通知
      await this.createNotification({
        recipientId: merchantId,
        recipientType: 'MERCHANT',
        type: 'STOCK_LOW',
        title: '库存不足',
        content: `您的激活码库存不足（剩余${currentStock}个），请及时补充。`
      });

      return true;
    } catch (error) {
      console.error('发送库存不足提醒失败:', error);
      return false;
    }
  }

  /**
   * 发送商户审核通知
   */
  static async sendMerchantApprovalNotification(merchantId: string, approved: boolean, reason?: string): Promise<boolean> {
    try {
      const merchant = await db.merchant.findUnique({
        where: { id: merchantId }
      });

      if (!merchant) {
        return false;
      }

      const status = approved ? '通过' : '驳回';
      const message = approved 
        ? `【英语管理平台】您的商户申请已审核通过，可以开始使用平台服务。`
        : `【英语管理平台】您的商户申请被驳回。${reason ? `原因：${reason}` : ''}`;

             // 发送短信通知
       await SmsService.sendVerificationCode(merchant.phone, 'MERCHANT_APPROVED', [message]);

      // 创建系统通知
      await this.createNotification({
        recipientId: merchantId,
        recipientType: 'MERCHANT',
        type: approved ? 'MERCHANT_APPROVED' : 'MERCHANT_REJECTED',
        title: `商户审核${status}`,
        content: approved 
          ? '您的商户申请已审核通过，可以开始使用平台服务。'
          : `您的商户申请被驳回。${reason ? `原因：${reason}` : ''}`
      });

      return true;
    } catch (error) {
      console.error('发送商户审核通知失败:', error);
      return false;
    }
  }

  /**
   * 创建系统通知
   */
  static async createNotification(data: {
    recipientId: string;
    recipientType: 'USER' | 'MERCHANT' | 'ADMIN';
    type: string;
    title: string;
    content: string;
  }): Promise<void> {
    try {
      await db.notification.create({
        data: {
          recipientId: data.recipientId,
          recipientType: data.recipientType as any,
          type: data.type as any,
          title: data.title,
          content: data.content
        }
      });
    } catch (error) {
      console.error('创建系统通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户通知列表
   */
  static async getUserNotifications(userId: string, page: number = 1, pageSize: number = 20) {
    try {
      const skip = (page - 1) * pageSize;

      const [notifications, total] = await Promise.all([
        db.notification.findMany({
          where: {
            recipientId: userId,
            recipientType: 'USER'
          },
          orderBy: { sentAt: 'desc' },
          skip,
          take: pageSize
        }),
        db.notification.count({
          where: {
            recipientId: userId,
            recipientType: 'USER'
          }
        })
      ]);

      return { notifications, total };
    } catch (error) {
      console.error('获取用户通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取商户通知列表
   */
  static async getMerchantNotifications(merchantId: string, page: number = 1, pageSize: number = 20) {
    try {
      const skip = (page - 1) * pageSize;

      const [notifications, total] = await Promise.all([
        db.notification.findMany({
          where: {
            recipientId: merchantId,
            recipientType: 'MERCHANT'
          },
          orderBy: { sentAt: 'desc' },
          skip,
          take: pageSize
        }),
        db.notification.count({
          where: {
            recipientId: merchantId,
            recipientType: 'MERCHANT'
          }
        })
      ]);

      return { notifications, total };
    } catch (error) {
      console.error('获取商户通知失败:', error);
      throw error;
    }
  }

  /**
   * 标记通知为已读
   */
  static async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      await db.notification.update({
        where: { id: notificationId },
        data: {
          read: true,
          readAt: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('标记通知已读失败:', error);
      return false;
    }
  }

  /**
   * 批量标记通知为已读
   */
  static async markNotificationsAsRead(recipientId: string, recipientType: 'USER' | 'MERCHANT' | 'ADMIN'): Promise<boolean> {
    try {
      await db.notification.updateMany({
        where: {
          recipientId,
          recipientType: recipientType as any,
          read: false
        },
        data: {
          read: true,
          readAt: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('批量标记通知已读失败:', error);
      return false;
    }
  }

  /**
   * 获取未读通知数量
   */
  static async getUnreadCount(recipientId: string, recipientType: 'USER' | 'MERCHANT' | 'ADMIN'): Promise<number> {
    try {
      const count = await db.notification.count({
        where: {
          recipientId,
          recipientType: recipientType as any,
          read: false
        }
      });

      return count;
    } catch (error) {
      console.error('获取未读通知数量失败:', error);
      return 0;
    }
  }

  /**
   * 定时检查会员到期提醒
   */
  static async checkMemberExpiryReminders(): Promise<void> {
    try {
      // 查找3天内到期的会员
      const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const now = new Date();

      const expiringUsers = await db.user.findMany({
        where: {
          memberExpireAt: {
            gte: now,
            lte: threeDaysLater
          },
          isActive: true
        }
      });

      for (const user of expiringUsers) {
        await this.sendMemberExpiryReminder(user.id);
      }

      console.log(`发送了${expiringUsers.length}条会员到期提醒`);
    } catch (error) {
      console.error('检查会员到期提醒失败:', error);
    }
  }

  /**
   * 定时检查库存不足提醒
   */
  static async checkStockLowAlerts(): Promise<void> {
    try {
      // 查找库存不足的商户
      const merchants = await db.merchant.findMany({
        where: { status: 'ACTIVE' },
        include: {
          _count: {
            select: {
              activationCodes: {
                where: { status: 'ASSIGNED' }
              }
            }
          }
        }
      });

      for (const merchant of merchants) {
        const stockCount = merchant._count.activationCodes;
        if (stockCount < 50) { // 库存少于50个时提醒
          await this.sendStockLowAlert(merchant.id, stockCount);
        }
      }
    } catch (error) {
      console.error('检查库存不足提醒失败:', error);
    }
  }
} 