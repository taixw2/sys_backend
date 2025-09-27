import { db } from '../../utils/db';
import { ActivationDurationType } from './model';

export class RefundService {
  /**
   * 回收激活码（商户）
   */
  static async recycleCodes(merchantId: string, codes: string[], reason?: string) {
    // 查找激活码并验证
    const activationCodes = await db.activationCode.findMany({
      where: {
        code: { in: codes },
        merchantId
      },
      include: {
        activationRecord: {
          include: {
            user: true
          }
        }
      }
    });

    if (activationCodes.length !== codes.length) {
      throw new Error('部分激活码不存在或不属于当前商户');
    }

    // 检查激活码状态
    const invalidCodes = activationCodes.filter(code => 
      code.status !== 'USED' && code.status !== 'ASSIGNED'
    );
    if (invalidCodes.length > 0) {
      throw new Error('只能回收已使用或已分配的激活码');
    }

    // 事务处理
    return await db.$transaction(async (tx) => {
      const recycledCodes = [];
      const memberAdjustments = [];

      for (const activationCode of activationCodes) {
        // 更新激活码状态
        await tx.activationCode.update({
          where: { id: activationCode.id },
          data: { 
            status: 'RECYCLED',
            merchantId: null
          }
        });
        recycledCodes.push({
          code: activationCode.code,
          duration: activationCode.duration,
          status: activationCode.status
        });

        // 如果激活码已被使用，需要调整用户会员时长
        if (activationCode.status === 'USED' && activationCode.activationRecord) {
          const user = activationCode.activationRecord.user;
          const durationDays = {
            ONE_YEAR: 365,
            THREE_YEARS: 365 * 3,
            TWELVE_YEARS: 365 * 12,
            TWENTY_YEARS: 365 * 20
          }[activationCode.duration as ActivationDurationType];

          const currentUser = await tx.user.findUnique({ where: { id: user.id } });
          if (currentUser?.memberExpireAt) {
            const newExpireAt = new Date(
              currentUser.memberExpireAt.getTime() - durationDays * 24 * 60 * 60 * 1000
            );
            await tx.user.update({
              where: { id: user.id },
              data: { memberExpireAt: newExpireAt }
            });
            await tx.memberRecord.create({
              data: {
                userId: user.id,
                type: 'REFUND',
                duration: -durationDays,
                startDate: currentUser.memberExpireAt,
                endDate: newExpireAt,
                reason: `退款回收激活码：${activationCode.code}${reason ? ` - ${reason}` : ''}`
              }
            });
            memberAdjustments.push({
              userId: user.id,
              phone: user.phone,
              adjustedDays: -durationDays,
              newExpireAt
            });
          }
        }
      }
      return { recycledCodes, memberAdjustments };
    });
  }

  /**
   * 获取可回收激活码列表（商户）
   */
  static async getRecyclableCodes(merchantId: string, page: number, pageSize: number, duration?: string, keyword?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = {
      merchantId,
      status: { in: ['USED', 'ASSIGNED'] }
    };
    if (duration) where.duration = duration;
    if (keyword) where.code = { contains: keyword };
    const [codes, total] = await Promise.all([
      db.activationCode.findMany({
        where,
        include: {
          activationRecord: {
            include: { user: true }
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
      createdAt: code.createdAt,
      usedBy: code.activationRecord?.user ? {
        phone: code.activationRecord.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      } : null,
      usedAt: code.activationRecord?.activatedAt
    }));
    return { data: formattedCodes, total };
  }

  /**
   * 获取回收记录（商户）
   */
  static async getRecycleRecords(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [codes, total] = await Promise.all([
      db.activationCode.findMany({
        where: { status: 'RECYCLED' },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize
      }),
      db.activationCode.count({ where: { status: 'RECYCLED' } })
    ]);
    const formattedCodes = codes.map(code => ({
      id: code.id,
      code: code.code,
      duration: code.duration,
      status: code.status,
      recycledAt: code.updatedAt
    }));
    return { data: formattedCodes, total };
  }

  /**
   * 获取所有回收记录（管理员）
   */
  static async getAllRecycleRecords(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const where: any = { status: 'RECYCLED' };
    const [codes, total] = await Promise.all([
      db.activationCode.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize
      }),
      db.activationCode.count({ where })
    ]);
    return { data: codes, total };
  }

  /**
   * 重新分配回收的激活码（管理员）
   */
  static async reassignCodes(codeIds: string[], merchantId: string) {
    // 检查商户是否存在
    const merchant = await db.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new Error('商户不存在');
    if (merchant.status !== 'ACTIVE') throw new Error('商户状态异常，无法分配激活码');
    // 检查激活码是否可重新分配
    const codes = await db.activationCode.findMany({
      where: { id: { in: codeIds }, status: 'RECYCLED' }
    });
    if (codes.length !== codeIds.length) throw new Error('部分激活码不可重新分配');
    // 重新分配激活码
    await db.activationCode.updateMany({
      where: { id: { in: codeIds } },
      data: { merchantId, status: 'ASSIGNED' }
    });
    return { reassigned: codes.length, merchantId, merchantName: merchant.name };
  }

  /**
   * 退款统计（管理员）
   */
  static async getRefundStatistics(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const recycledCodes = await db.activationCode.findMany({
      where: {
        status: 'RECYCLED',
        updatedAt: { gte: start, lte: end }
      }
    });
    const recycledByDuration = recycledCodes.reduce((acc, code) => {
      acc[code.duration] = (acc[code.duration] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const recycledByDate = recycledCodes.reduce((acc, code) => {
      const date = code.updatedAt.toISOString().slice(0, 10);
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return {
      totalRecycled: recycledCodes.length,
      recycledByDuration,
      recycledByDate,
      timeRange: { start, end }
    };
  }
} 