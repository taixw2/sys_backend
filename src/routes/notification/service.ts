import { NotificationService as BaseNotificationService } from '../../services/notification';
import { RecipientTypeType } from './model';

export class NotificationService {
  /**
   * 获取用户通知列表
   */
  static async getUserNotifications(userId: string, page: number, pageSize: number) {
    return await BaseNotificationService.getUserNotifications(userId, page, pageSize);
  }

  /**
   * 获取商户通知列表
   */
  static async getMerchantNotifications(merchantId: string, page: number, pageSize: number) {
    return await BaseNotificationService.getMerchantNotifications(merchantId, page, pageSize);
  }

  /**
   * 获取未读通知数量
   */
  static async getUnreadCount(recipientId: string, recipientType: RecipientTypeType) {
    return await BaseNotificationService.getUnreadCount(recipientId, recipientType);
  }

  /**
   * 标记通知为已读
   */
  static async markNotificationAsRead(notificationId: string) {
    return await BaseNotificationService.markNotificationAsRead(notificationId);
  }

  /**
   * 批量标记所有通知为已读
   */
  static async markNotificationsAsRead(recipientId: string, recipientType: RecipientTypeType) {
    return await BaseNotificationService.markNotificationsAsRead(recipientId, recipientType);
  }

  /**
   * 创建通知
   */
  static async createNotification(data: {
    recipientId: string;
    recipientType: RecipientTypeType;
    type: string;
    title: string;
    content: string;
  }) {
    return await BaseNotificationService.createNotification(data);
  }

  /**
   * 检查会员到期提醒
   */
  static async checkMemberExpiryReminders() {
    return await BaseNotificationService.checkMemberExpiryReminders();
  }

  /**
   * 检查库存不足提醒
   */
  static async checkStockLowAlerts() {
    return await BaseNotificationService.checkStockLowAlerts();
  }
} 