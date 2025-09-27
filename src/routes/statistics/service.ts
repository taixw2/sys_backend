import { db } from '../../utils/db';

export class StatisticsService {
  /**
   * 获取用户统计数据
   */
  static async getUserStatistics(start: Date, end: Date, groupBy: 'day' | 'week' | 'month') {
    // ... existing code ...
    // 这里省略，实际实现见原路由
  }

  /**
   * 获取商户统计数据
   */
  static async getMerchantStatistics(start: Date, end: Date, groupBy: 'day' | 'week' | 'month') {
    // ... existing code ...
  }

  /**
   * 获取激活码统计数据
   */
  static async getActivationCodeStatistics(start: Date, end: Date, groupBy: 'day' | 'week' | 'month') {
    // ... existing code ...
  }

  /**
   * 获取财务统计数据
   */
  static async getFinancialStatistics(start: Date, end: Date, groupBy: 'day' | 'week' | 'month') {
    // ... existing code ...
  }

  /**
   * 获取奖励统计数据
   */
  static async getRewardStatistics(start: Date, end: Date) {
    // ... existing code ...
  }

  /**
   * 获取仪表板数据
   */
  static async getDashboardStatistics(start: Date, end: Date) {
    // ... existing code ...
  }
} 