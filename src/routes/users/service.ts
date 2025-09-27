import { db } from '../../utils/db';
import { ActivationDurationType } from './model';

// 激活码时长对应的天数
const DURATION_DAYS = {
  ONE_YEAR: 365,
  THREE_YEARS: 365 * 3,
  TWELVE_YEARS: 365 * 12,
  TWENTY_YEARS: 365 * 20
} as const;

export class UserService {
  /**
   * 获取用户个人信息
   */
  static async getUserProfile(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        memberRecords: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        activationRecords: {
          orderBy: { activatedAt: 'desc' },
          take: 5,
          include: {
            activationCode: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 计算会员状态
    const now = new Date();
    const isMember = user.memberExpireAt && user.memberExpireAt > now;
    const daysUntilExpiry = user.memberExpireAt ? 
      Math.ceil((user.memberExpireAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      id: user.id,
      phone: user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'), // 脱敏显示
      memberExpireAt: user.memberExpireAt,
      isMember,
      daysUntilExpiry: isMember ? daysUntilExpiry : 0,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  /**
   * 激活码激活
   */
  static async activateCode(userId: string, activationCode: string) {
    if (!activationCode || activationCode.length !== 8) {
      throw new Error('激活码格式错误');
    }

    // 查找激活码
    const code = await db.activationCode.findUnique({
      where: { code: activationCode },
      include: { merchant: true }
    });

    if (!code) {
      throw new Error('激活码不存在');
    }

    if (code.status !== 'ASSIGNED') {
      const statusMap = {
        'AVAILABLE': '该激活码尚未分配给商户',
        'USED': '该激活码已被使用',
        'RECYCLED': '该激活码已被回收'
      };
      throw new Error(statusMap[code.status as keyof typeof statusMap] || '激活码状态异常');
    }

    if (code.expiresAt && code.expiresAt < new Date()) {
      throw new Error('激活码已过期');
    }

    if (!code.merchantId) {
      throw new Error('激活码未生效，请联系商户确认');
    }

    // 获取用户信息
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 计算会员到期时间
    const days = DURATION_DAYS[code.duration as keyof typeof DURATION_DAYS];
    const currentExpire = user.memberExpireAt || new Date();
    const newExpireAt = new Date(Math.max(currentExpire.getTime(), Date.now()) + days * 24 * 60 * 60 * 1000);

    // 开始事务
    await db.$transaction(async (tx) => {
      // 更新激活码状态
      await tx.activationCode.update({
        where: { id: code.id },
        data: { status: 'USED' }
      });

      // 创建激活记录
      await tx.activationRecord.create({
        data: {
          userId,
          activationCodeId: code.id,
          status: 'SUCCESS',
          activatedAt: new Date()
        }
      });

      // 更新用户会员信息
      await tx.user.update({
        where: { id: userId },
        data: { memberExpireAt: newExpireAt }
      });

      // 创建会员记录
      await tx.memberRecord.create({
        data: {
          userId,
          type: 'ACTIVATION',
          duration: days,
          startDate: new Date(),
          endDate: newExpireAt,
          reason: `激活码激活：${activationCode}`
        }
      });
    });

    return {
      message: '激活成功',
      memberExpireAt: newExpireAt,
      duration: `${days}天`,
      durationText: {
        'ONE_YEAR': '1年',
        'THREE_YEARS': '3年',
        'TWELVE_YEARS': '12年',
        'TWENTY_YEARS': '20年'
      }[code.duration] || `${days}天`
    };
  }

  /**
   * 获取激活记录
   */
  static async getActivationRecords(userId: string, page: number, pageSize: number) {
    const [records, total] = await Promise.all([
      db.activationRecord.findMany({
        where: { userId },
        include: {
          activationCode: {
            include: {
              merchant: true
            }
          }
        },
        orderBy: { activatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      db.activationRecord.count({
        where: { userId }
      })
    ]);

    const formattedRecords = records.map(record => ({
      id: record.id,
      activationCode: record.activationCode.code,
      duration: record.activationCode.duration,
      durationText: {
        'ONE_YEAR': '1年',
        'THREE_YEARS': '3年',
        'TWELVE_YEARS': '12年',
        'TWENTY_YEARS': '20年'
      }[record.activationCode.duration] || record.activationCode.duration,
      merchantName: record.activationCode.merchant?.name || '未知商户',
      activatedAt: record.activatedAt,
      status: record.status,
      errorMessage: record.errorMessage
    }));

    return {
      data: formattedRecords,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 获取会员记录
   */
  static async getMemberRecords(userId: string, page: number, pageSize: number, type?: string) {
    const whereCondition: any = { userId };
    if (type) {
      whereCondition.type = type;
    }

    const [records, total] = await Promise.all([
      db.memberRecord.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      db.memberRecord.count({
        where: whereCondition
      })
    ]);

    const formattedRecords = records.map(record => ({
      id: record.id,
      type: record.type,
      typeText: {
        'FIRST_LOGIN': '首次登录赠送',
        'ACTIVATION': '激活码激活',
        'MANUAL_ADJUST': '手动调整',
        'REFUND': '退款扣除'
      }[record.type] || record.type,
      duration: record.duration,
      durationText: record.duration ? `${record.duration}天` : '-',
      startDate: record.startDate,
      endDate: record.endDate,
      reason: record.reason,
      createdAt: record.createdAt
    }));

    return {
      data: formattedRecords,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 获取会员统计信息
   */
  static async getMemberStats(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        memberRecords: true,
        activationRecords: {
          include: {
            activationCode: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    const now = new Date();
    const isMember = user.memberExpireAt && user.memberExpireAt > now;
    const daysUntilExpiry = user.memberExpireAt ? 
      Math.ceil((user.memberExpireAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // 统计各类型激活码使用情况
    const activationStats = user.activationRecords.reduce((stats, record) => {
      const duration = record.activationCode.duration;
      if (!stats[duration]) {
        stats[duration] = 0;
      }
      stats[duration]++;
      return stats;
    }, {} as Record<string, number>);

    // 统计会员记录类型
    const memberRecordStats = user.memberRecords.reduce((stats, record) => {
      const type = record.type;
      if (!stats[type]) {
        stats[type] = { count: 0, totalDays: 0 };
      }
      stats[type].count++;
      stats[type].totalDays += record.duration || 0;
      return stats;
    }, {} as Record<string, { count: number; totalDays: number }>);

    return {
      memberStatus: {
        isMember,
        memberExpireAt: user.memberExpireAt,
        daysUntilExpiry: isMember ? daysUntilExpiry : 0,
        isExpiringSoon: isMember && daysUntilExpiry <= 7
      },
      totalStats: {
        totalActivations: user.activationRecords.length,
        totalMemberDays: user.memberRecords.reduce((sum, record) => sum + (record.duration || 0), 0),
        totalMemberRecords: user.memberRecords.length
      },
      activationStats,
      memberRecordStats
    };
  }

  /**
   * 获取登录日志
   */
  static async getLoginLogs(userId: string, page: number, pageSize: number) {
    const [logs, total] = await Promise.all([
      db.loginLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      db.loginLog.count({
        where: { userId }
      })
    ]);

    const formattedLogs = logs.map(log => ({
      id: log.id,
      device: log.device,
      ip: log.ip,
      status: log.status,
      statusText: log.status === 'SUCCESS' ? '成功' : '失败',
      createdAt: log.createdAt
    }));

    return {
      data: formattedLogs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }
} 