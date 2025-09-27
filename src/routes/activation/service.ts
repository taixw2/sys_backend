import { db } from '../../utils/db';
import { generateActivationCode } from '../../utils/crypto';
import { 
  ActivationDurationType, 
  ActivationCodeStatusType, 
  ActivationRecordStatusType,
  TimeRangeType 
} from './model';

// 激活码时长对应的天数
const DURATION_DAYS = {
  ONE_YEAR: 365,
  THREE_YEARS: 365 * 3,
  TWELVE_YEARS: 365 * 12,
  TWENTY_YEARS: 365 * 20
} as const;

export class ActivationService {
  /**
   * 用户激活码激活
   */
  static async activateCode(userId: string, code: string) {
    // 查找激活码
    const activationCode = await db.activationCode.findUnique({
      where: { code },
      include: { merchant: true }
    });

    if (!activationCode) {
      throw new Error('激活码格式错误，请检查后重试');
    }

    // 检查激活码状态
    if (activationCode.status !== 'ASSIGNED') {
      if (activationCode.status === 'USED') {
        throw new Error('该激活码已被使用');
      } else if (activationCode.status === 'AVAILABLE') {
        throw new Error('激活码未生效，请联系商户确认');
      } else {
        throw new Error('激活码已过期');
      }
    }

    // 检查是否已过期
    if (activationCode.expiresAt && activationCode.expiresAt < new Date()) {
      throw new Error('激活码已过期');
    }

    // 检查是否已被使用
    const existingRecord = await db.activationRecord.findUnique({
      where: { activationCodeId: activationCode.id }
    });

    if (existingRecord) {
      throw new Error('该激活码已被使用');
    }

    // 计算会员时长
    const durationDays = DURATION_DAYS[activationCode.duration as keyof typeof DURATION_DAYS];

    // 获取当前用户会员信息
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    // 计算新的会员到期时间
    const now = new Date();
    const currentExpireAt = user?.memberExpireAt && user.memberExpireAt > now
      ? user.memberExpireAt
      : now;
    const newExpireAt = new Date(currentExpireAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // 开始事务
    const result = await db.$transaction(async (tx) => {
      // 创建激活记录
      const activationRecord = await tx.activationRecord.create({
        data: {
          userId,
          activationCodeId: activationCode.id,
          status: 'SUCCESS'
        }
      });

      // 更新激活码状态
      await tx.activationCode.update({
        where: { id: activationCode.id },
        data: { status: 'USED' }
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
          duration: durationDays,
          startDate: currentExpireAt,
          endDate: newExpireAt,
          reason: `激活码激活：${code}`
        }
      });

      return activationRecord;
    });

    return {
      memberExpireAt: newExpireAt,
      duration: durationDays,
      activationCode: code
    };
  }

  /**
   * 获取用户激活记录
   */
  static async getUserActivationRecords(userId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;

    const [records, total] = await Promise.all([
      db.activationRecord.findMany({
        where: { userId },
        include: {
          activationCode: true
        },
        orderBy: { activatedAt: 'desc' },
        skip,
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
   * 获取商户激活码库存
   */
  static async getMerchantInventory(
    merchantId: string, 
    page: number, 
    pageSize: number,
    status?: string, 
    duration?: string
  ) {
    const skip = (page - 1) * pageSize;
    const where: any = { merchantId };

    if (status) {
      where.status = status;
    }
    if (duration) {
      where.duration = duration;
    }

    const [codes, total] = await Promise.all([
      db.activationCode.findMany({
        where,
        include: {
          activationRecord: {
            include: {
              user: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      db.activationCode.count({ where })
    ]);

    const formattedCodes = codes.map(code => ({
      id: code.id,
      code: code.code,
      duration: code.duration,
      status: code.status,
      expiresAt: code.expiresAt,
      createdAt: code.createdAt,
      usedBy: code.activationRecord?.user ? {
        phone: code.activationRecord.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      } : null,
      usedAt: code.activationRecord?.activatedAt
    }));

    return {
      data: formattedCodes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 获取商户激活码统计
   */
  static async getMerchantStatistics(merchantId: string, timeRange: TimeRangeType = 'month') {
    // 计算时间范围
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // 获取各状态激活码数量
    const statusCounts = await db.activationCode.groupBy({
      by: ['status'],
      where: {
        merchantId
      },
      _count: true
    });

    // 获取各时长激活码数量
    const durationCounts = await db.activationCode.groupBy({
      by: ['duration'],
      where: {
        merchantId
      },
      _count: true
    });

    // 获取使用统计
    const usageStats = await db.activationRecord.findMany({
      where: {
        activationCode: {
          merchantId
        },
        activatedAt: {
          gte: startDate
        }
      },
      include: {
        activationCode: true
      }
    });

    // 按时长分组使用统计
    const usageByDuration = usageStats.reduce((acc, record) => {
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
      usageStats: {
        total: usageStats.length,
        byDuration: usageByDuration
      },
      timeRange: {
        start: startDate,
        end: now
      }
    };
  }

  /**
   * 批量生成激活码
   */
  static async generateActivationCodes(
    duration: ActivationDurationType,
    quantity: number,
    merchantId?: string,
    expiresAt?: string
  ) {
    const codes = [];
    const expireDate = expiresAt ? new Date(expiresAt) : null;

    // 生成激活码
    for (let i = 0; i < quantity; i++) {
      let code: string;
      let isUnique = false;

      // 确保生成的激活码唯一
      while (!isUnique) {
        code = generateActivationCode();
        const existing = await db.activationCode.findUnique({
          where: { code }
        });
        if (!existing) {
          isUnique = true;
          codes.push({
            code,
            duration,
            merchantId: merchantId || null,
            status: merchantId ? 'ASSIGNED' as const : 'AVAILABLE' as const,
            expiresAt: expireDate
          });
        }
      }
    }

    // 批量插入数据库
    const result = await db.activationCode.createMany({
      data: codes
    });

    return {
      generated: result.count,
      duration,
      merchantId,
      expiresAt: expireDate
    };
  }

  /**
   * 分配激活码给商户
   */
  static async assignActivationCodes(codeIds: string[], merchantId: string) {
    // 检查商户是否存在
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant) {
      throw new Error('商户不存在');
    }

    if (merchant.status !== 'ACTIVE') {
      throw new Error('商户状态异常，无法分配激活码');
    }

    // 检查激活码是否可分配 AVAILABLE
    const codes = await db.activationCode.findMany({
      where: {
        code: { in: codeIds },
        status: 'AVAILABLE'
      }
    });

    console.log('codes', codes.length, codeIds.length)

    if (codes.length !== codeIds.length) {
      throw new Error('部分激活码不可分配');
    }

    // 分配激活码
    await db.activationCode.updateMany({
      where: { code: { in: codeIds } },
      data: {
        merchantId,
        status: 'ASSIGNED'
      }
    });

    return {
      assigned: codes.length,
      merchantId,
      merchantName: merchant.name
    };
  }

  /**
   * 回收激活码
   */
  static async recycleActivationCodes(codeIds: string[], reason?: string) {
    // 检查激活码状态
    const codes = await db.activationCode.findMany({
      where: {
        id: { in: codeIds },
        status: { in: ['ASSIGNED', 'USED'] }
      }
    });

    if (codes.length !== codeIds.length) {
      throw new Error('部分激活码无法回收');
    }

    // 回收激活码
    await db.activationCode.updateMany({
      where: { id: { in: codeIds } },
      data: {
        status: 'RECYCLED',
        merchantId: null
      }
    });

    return {
      recycled: codes.length,
      reason
    };
  }

  /**
   * 获取激活码列表
   */
  static async getActivationCodeList(
    page: number,
    pageSize: number,
    status?: string,
    duration?: string,
    merchantId?: string
  ) {
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = {};

    if (status) where.status = status;
    if (duration) where.duration = duration;
    if (merchantId) where.merchantId = merchantId;

    const [codes, total] = await Promise.all([
      db.activationCode.findMany({
        where,
        include: {
          merchant: true,
          activationRecord: {
            include: {
              user: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(pageSize)
      }),
      db.activationCode.count({ where })
    ]);

    const formattedCodes = codes.map(code => ({
      id: code.id,
      code: code.code,
      duration: code.duration,
      status: code.status,
      expiresAt: code.expiresAt,
      createdAt: code.createdAt,
      merchant: code.merchant ? {
        id: code.merchant.id,
        name: code.merchant.name,
        code: code.merchant.code
      } : null,
      usedBy: code.activationRecord?.user ? {
        id: code.activationRecord.user.id,
        phone: code.activationRecord.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      } : null,
      usedAt: code.activationRecord?.activatedAt
    }));

    console.log('formattedCodes', formattedCodes.length, codes.length)

    return {
      data: formattedCodes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }
} 