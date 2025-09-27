import { db } from '../../utils/db';

export class AdminService {
  /**
   * 获取用户列表
   */
  static async getUserList(page: number, pageSize: number, keyword?: string, memberStatus?: string, isActive?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (keyword) {
      where.phone = { contains: keyword };
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (memberStatus) {
      const now = new Date();
      if (memberStatus === 'active') {
        where.memberExpireAt = { gt: now };
      } else if (memberStatus === 'expired') {
        where.OR = [
          { memberExpireAt: { lte: now } },
          { memberExpireAt: null }
        ];
      }
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        include: {
          _count: {
            select: {
              activationRecords: true,
              memberRecords: true,
              loginLogs: true
            }
          },
          loginLogs: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      db.user.count({ where })
    ]);

    const formattedUsers = users.map(user => ({
      id: user.id,
      phone: user.phone,
      isActive: user.isActive,
      disabledReason: user.disabledReason,
      memberExpireAt: user.memberExpireAt,
      createdAt: user.createdAt,
      lastLoginAt: user.loginLogs[0]?.createdAt || null,
      stats: {
        activationRecords: user._count.activationRecords,
        memberRecords: user._count.memberRecords,
        loginLogs: user._count.loginLogs
      }
    }));

    return { data: formattedUsers, total };
  }

  /**
   * 获取用户详情
   */
  static async getUserDetail(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        memberRecords: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        activationRecords: {
          include: {
            activationCode: true
          },
          orderBy: { activatedAt: 'desc' },
          take: 10
        },
        loginLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    return {
      id: user.id,
      phone: user.phone,
      isActive: user.isActive,
      disabledReason: user.disabledReason,
      memberExpireAt: user.memberExpireAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      memberRecords: user.memberRecords,
      activationRecords: user.activationRecords.map(record => ({
        id: record.id,
        activationCode: record.activationCode.code,
        duration: record.activationCode.duration,
        activatedAt: record.activatedAt,
        status: record.status
      })),
      loginLogs: user.loginLogs
    };
  }

  /**
   * 切换用户状态
   */
  static async toggleUserStatus(userId: string, isActive: boolean, reason?: string) {
    const user = await db.user.update({
      where: { id: userId },
      data: {
        isActive,
        disabledReason: !isActive ? reason : null
      }
    });

    return {
      id: user.id,
      phone: user.phone,
      isActive: user.isActive,
      disabledReason: user.disabledReason
    };
  }

  /**
   * 调整用户会员时长
   */
  static async adjustUserMembership(userId: string, adjustType: 'extend' | 'reduce', duration: number, reason: string) {
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    const now = new Date();
    const currentExpireAt = user.memberExpireAt && user.memberExpireAt > now 
      ? user.memberExpireAt 
      : now;

    const adjustmentDays = adjustType === 'extend' ? duration : -duration;
    const newExpireAt = new Date(
      currentExpireAt.getTime() + adjustmentDays * 24 * 60 * 60 * 1000
    );

    await db.$transaction(async (tx) => {
      // 更新用户会员时长
      await tx.user.update({
        where: { id: userId },
        data: { memberExpireAt: newExpireAt }
      });

      // 创建会员记录
      await tx.memberRecord.create({
        data: {
          userId,
          type: 'MANUAL_ADJUST',
          duration: adjustmentDays,
          startDate: currentExpireAt,
          endDate: newExpireAt,
          reason
        }
      });
    });

    return {
      userId,
      adjustType,
      duration,
      newExpireAt,
      reason
    };
  }

  /**
   * 获取价格配置
   */
  static async getPriceConfigs() {
    return await db.priceConfig.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * 创建价格配置
   */
  static async createPriceConfig(duration: string, userPrice: number, merchantPrice: number) {
    // 停用现有配置
    await db.priceConfig.updateMany({
      where: { 
        duration: duration as any,
        isActive: true 
      },
      data: { isActive: false }
    });

    // 创建新配置
    return await db.priceConfig.create({
      data: {
        duration: duration as any,
        userPrice,
        merchantPrice,
        isActive: true
      }
    });
  }

  /**
   * 获取奖励规则
   */
  static async getRewardRules() {
    return await db.rewardRule.findMany({
      orderBy: { minDailySales: 'asc' }
    });
  }

  /**
   * 创建奖励规则
   */
  static async createRewardRule(level: string, minDailySales: number, rewardQuantity: number, isPeakSeason: boolean, maxDailySales?: number) {
    return await db.rewardRule.create({
      data: {
        level: level as any,
        minDailySales,
        maxDailySales,
        rewardQuantity,
        isPeakSeason,
        isActive: true
      }
    });
  }

  /**
   * 更新奖励规则
   */
  static async updateRewardRule(ruleId: string, data: {
    level?: string;
    minDailySales?: number;
    maxDailySales?: number;
    rewardQuantity?: number;
    isPeakSeason?: boolean;
    isActive?: boolean;
  }) {
    return await db.rewardRule.update({
      where: { id: ruleId },
      data: {
        level: data.level as any,
        minDailySales: data.minDailySales,
        maxDailySales: data.maxDailySales,
        rewardQuantity: data.rewardQuantity,
        isPeakSeason: data.isPeakSeason,
        isActive: data.isActive
      }
    });
  }

  /**
   * 获取旺季配置
   */
  static async getPeakSeasons() {
    return await db.peakSeason.findMany({
      orderBy: { startMonth: 'asc' }
    });
  }

  /**
   * 创建旺季配置
   */
  static async createPeakSeason(name: string, startMonth: number, endMonth: number) {
    return await db.peakSeason.create({
      data: {
        name,
        startMonth,
        endMonth,
        isActive: true
      }
    });
  }

  /**
   * 获取系统配置
   */
  static async getSystemConfigs() {
    return await db.systemConfig.findMany({
      orderBy: { key: 'asc' }
    });
  }

  /**
   * 更新系统配置
   */
  static async updateSystemConfig(key: string, value: string, description?: string) {
    return await db.systemConfig.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description }
    });
  }

  /**
   * 获取用户统计
   */
  static async getUserStatistics(start: Date, end: Date) {
    // 用户注册统计
    const registrations = await db.user.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      select: {
        createdAt: true
      }
    });

    // 按日期分组
    const registrationsByDate = registrations.reduce((acc, user) => {
      const date = user.createdAt.toISOString().slice(0, 10);
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 会员统计
    const now = new Date();
    const [totalUsers, activeMembers, expiredMembers] = await Promise.all([
      db.user.count(),
      db.user.count({
        where: {
          memberExpireAt: { gt: now }
        }
      }),
      db.user.count({
        where: {
          OR: [
            { memberExpireAt: { lte: now } },
            { memberExpireAt: null }
          ]
        }
      })
    ]);

    return {
      totalUsers,
      activeMembers,
      expiredMembers,
      membershipRate: totalUsers > 0 ? (activeMembers / totalUsers * 100).toFixed(2) : '0',
      registrationsByDate,
      timeRange: { start, end }
    };
  }

  /**
   * 获取商户统计
   */
  static async getMerchantStatistics(start: Date, end: Date) {
    // 商户统计
    const [totalMerchants, activeMerchants, pendingMerchants, disabledMerchants] = await Promise.all([
      db.merchant.count(),
      db.merchant.count({ where: { status: 'ACTIVE' } }),
      db.merchant.count({ where: { status: 'PENDING' } }),
      db.merchant.count({ where: { status: 'DISABLED' } })
    ]);

    // 商户销售排名
    const merchantSales = await db.activationRecord.groupBy({
      by: ['activationCodeId'],
      where: {
        activatedAt: {
          gte: start,
          lte: end
        }
      },
      _count: true
    });

    // 获取商户信息
    const salesWithMerchants = await Promise.all(
      merchantSales.map(async (sale) => {
        const activationCode = await db.activationCode.findUnique({
          where: { id: sale.activationCodeId },
          include: { merchant: true }
        });
        return {
          merchant: activationCode?.merchant,
          sales: sale._count
        };
      })
    );

    // 按商户分组销售数据
    const merchantSalesRanking = salesWithMerchants
      .filter(item => item.merchant)
      .reduce((acc, item) => {
        const merchantId = item.merchant!.id;
        if (!acc[merchantId]) {
          acc[merchantId] = {
            merchant: item.merchant,
            totalSales: 0
          };
        }
        acc[merchantId].totalSales += item.sales;
        return acc;
      }, {} as Record<string, any>);

    const topMerchants = Object.values(merchantSalesRanking)
      .sort((a: any, b: any) => b.totalSales - a.totalSales)
      .slice(0, 10);

    return {
      totalMerchants,
      activeMerchants,
      pendingMerchants,
      disabledMerchants,
      topMerchants,
      timeRange: { start, end }
    };
  }

  /**
   * 获取激活码统计
   */
  static async getActivationCodeStatistics(start: Date, end: Date) {
    // 激活码状态统计
    const statusCounts = await db.activationCode.groupBy({
      by: ['status'],
      _count: true
    });

    // 激活码时长统计
    const durationCounts = await db.activationCode.groupBy({
      by: ['duration'],
      _count: true
    });

    // 激活统计
    const activations = await db.activationRecord.findMany({
      where: {
        activatedAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        activationCode: true
      }
    });

    // 按日期分组激活数据
    const activationsByDate = activations.reduce((acc, record) => {
      const date = record.activatedAt.toISOString().slice(0, 10);
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 按时长分组激活数据
    const activationsByDuration = activations.reduce((acc, record) => {
      const duration = record.activationCode.duration;
      acc[duration] = (acc[duration] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      durationCounts: durationCounts.reduce((acc, item) => {
        acc[item.duration] = item._count;
        return acc;
      }, {} as Record<string, number>),
      totalActivations: activations.length,
      activationsByDate,
      activationsByDuration,
      timeRange: { start, end }
    };
  }

  /**
   * 获取操作日志
   */
  static async getOperationLogs(page: number, pageSize: number, operatorType?: string, operation?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (operatorType) {
      where.operatorType = operatorType;
    }

    if (operation) {
      where.operation = operation;
    }

    const [logs, total] = await Promise.all([
      db.operationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      db.operationLog.count({ where })
    ]);

    return { data: logs, total };
  }
} 