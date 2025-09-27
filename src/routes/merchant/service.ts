import { db } from '../../utils/db';
import { generateMerchantCode } from '../../utils/crypto';
import { MerchantStatusType, PurchaseStatusType, ActivationDurationType } from './model';

export class MerchantService {
  /**
   * 获取商户信息
   */
  static async getMerchantProfile(merchantId: string) {
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
      include: {
        _count: {
          select: {
            activationCodes: true,
            purchases: true,
            rewards: true
          }
        }
      }
    });

    if (!merchant) {
      throw new Error('商户不存在');
    }

    return {
      id: merchant.id,
      name: merchant.name,
      code: merchant.code,
      contact: merchant.contact,
      phone: merchant.phone,
      bankAccount: merchant.bankAccount,
      status: merchant.status,
      createdAt: merchant.createdAt,
      stats: {
        activationCodes: merchant._count.activationCodes,
        purchases: merchant._count.purchases,
        rewards: merchant._count.rewards
      }
    };
  }

  /**
   * 更新商户信息
   */
  static async updateMerchantProfile(merchantId: string, data: { contact?: string; bankAccount?: string }) {
    const merchant = await db.merchant.update({
      where: { id: merchantId },
      data: {
        contact: data.contact,
        bankAccount: data.bankAccount
      }
    });

    return {
      id: merchant.id,
      name: merchant.name,
      code: merchant.code,
      contact: merchant.contact,
      phone: merchant.phone,
      bankAccount: merchant.bankAccount,
      status: merchant.status
    };
  }

  /**
   * 创建购买订单
   */
  static async createPurchase(merchantId: string, duration: ActivationDurationType, quantity: number) {
    if (quantity < 10 || quantity > 1000) {
      throw new Error('购买数量必须在10-1000之间');
    }

    // 获取价格配置
    const priceConfig = await db.priceConfig.findFirst({
      where: {
        duration: duration as any,
        isActive: true
      }
    });

    if (!priceConfig) {
      throw new Error('价格配置不存在');
    }

    const unitPrice = Number(priceConfig.merchantPrice);
    const totalAmount = unitPrice * quantity;

    // 创建购买记录
    const purchase = await db.purchase.create({
      data: {
        merchantId,
        duration: duration as any,
        quantity,
        unitPrice,
        totalAmount,
        status: 'PENDING'
      }
    });

    return {
      id: purchase.id,
      duration: purchase.duration,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      totalAmount: purchase.totalAmount,
      status: purchase.status,
      createdAt: purchase.createdAt
    };
  }

  /**
   * 获取购买记录
   */
  static async getPurchaseRecords(merchantId: string, page: number, pageSize: number, status?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = { merchantId };

    if (status) {
      where.status = status;
    }

    const [purchases, total] = await Promise.all([
      db.purchase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      db.purchase.count({ where })
    ]);

    return {
      data: purchases,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 获取价格配置
   */
  static async getPriceConfig() {
    const prices = await db.priceConfig.findMany({
      where: { isActive: true },
      orderBy: { duration: 'asc' }
    });

    return prices.map(price => ({
      duration: price.duration,
      userPrice: price.userPrice,
      merchantPrice: price.merchantPrice
    }));
  }

  /**
   * 获取奖励记录
   */
  static async getRewardRecords(merchantId: string, page: number, pageSize: number, month?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = { merchantId };

    if (month) {
      where.month = month;
    }

    const [rewards, total] = await Promise.all([
      db.reward.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      db.reward.count({ where })
    ]);

    return {
      data: rewards,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 获取奖励规则
   */
  static async getRewardRules() {
    return await db.rewardRule.findMany({
      where: { isActive: true },
      orderBy: { minDailySales: 'asc' }
    });
  }

  /**
   * 获取销售统计
   */
  static async getSalesStatistics(merchantId: string, month?: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    
    // 获取当月销售统计
    const startOfMonth = new Date(targetMonth + '-01');
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

    const salesData = await db.activationRecord.findMany({
      where: {
        activationCode: {
          merchantId
        },
        activatedAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        activationCode: true
      }
    });

    // 计算日销量
    const dailySales: Record<string, number> = {};
    salesData.forEach(record => {
      const date = record.activatedAt.toISOString().slice(0, 10);
      dailySales[date] = (dailySales[date] || 0) + 1;
    });

    // 计算平均日销量
    const daysInMonth = endOfMonth.getDate();
    const totalSales = salesData.length;
    const averageDailySales = totalSales / daysInMonth;

    // 检查是否为旺季
    const currentMonth = startOfMonth.getMonth() + 1;
    const peakSeasons = await db.peakSeason.findMany({
      where: { isActive: true }
    });

    const isPeakSeason = peakSeasons.some(season => 
      currentMonth >= season.startMonth && currentMonth <= season.endMonth
    );

    // 根据销量确定奖励等级
    const rewardRules = await db.rewardRule.findMany({
      where: { 
        isActive: true,
        isPeakSeason: isPeakSeason
      },
      orderBy: { minDailySales: 'desc' }
    });

    let currentLevel = null;
    for (const rule of rewardRules) {
      if (averageDailySales >= rule.minDailySales && 
          (!rule.maxDailySales || averageDailySales <= rule.maxDailySales)) {
        currentLevel = rule;
        break;
      }
    }

    return {
      month: targetMonth,
      totalSales,
      averageDailySales: Math.round(averageDailySales * 100) / 100,
      isPeakSeason,
      currentLevel: currentLevel ? {
        level: currentLevel.level,
        minDailySales: currentLevel.minDailySales,
        maxDailySales: currentLevel.maxDailySales,
        rewardQuantity: currentLevel.rewardQuantity
      } : null,
      dailySales
    };
  }

  /**
   * 获取商户列表（管理员）
   */
  static async getMerchantList(page: number, pageSize: number, status?: string, keyword?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
        { contact: { contains: keyword } },
        { phone: { contains: keyword } }
      ];
    }

    const [merchants, total] = await Promise.all([
      db.merchant.findMany({
        where,
        include: {
          _count: {
            select: {
              activationCodes: true,
              purchases: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      db.merchant.count({ where })
    ]);

    const formattedMerchants = merchants.map(merchant => ({
      id: merchant.id,
      name: merchant.name,
      code: merchant.code,
      contact: merchant.contact,
      phone: merchant.phone,
      status: merchant.status,
      createdAt: merchant.createdAt,
      stats: {
        activationCodes: merchant._count.activationCodes,
        purchases: merchant._count.purchases
      }
    }));

    return {
      data: formattedMerchants,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 创建商户（管理员）
   */
  static async createMerchant(data: { name: string; contact: string; phone: string; bankAccount?: string; adminId: string }) {
    // 检查手机号是否已存在
    const existingMerchant = await db.merchant.findFirst({
      where: { phone: data.phone }
    });

    if (existingMerchant) {
      throw new Error('该手机号已被使用');
    }

    // 生成商户编号
    const code = generateMerchantCode();

    const merchant = await db.merchant.create({
      data: {
        name: data.name,
        code,
        contact: data.contact,
        phone: data.phone,
        bankAccount: data.bankAccount,
        status: 'ACTIVE',
        adminId: data.adminId,
      }
    });

    return {
      id: merchant.id,
      name: merchant.name,
      code: merchant.code,
      contact: merchant.contact,
      phone: merchant.phone,
      bankAccount: merchant.bankAccount,
      status: merchant.status,
      createdAt: merchant.createdAt
    };
  }

  /**
   * 更新商户（管理员）
   */
  static async updateMerchant(merchantId: string, data: {
    name?: string;
    contact?: string;
    phone?: string;
    bankAccount?: string;
    status?: MerchantStatusType;
  }) {
    const merchant = await db.merchant.update({
      where: { id: merchantId },
      data: {
        name: data.name,
        contact: data.contact,
        phone: data.phone,
        bankAccount: data.bankAccount,
        status: data.status as any
      }
    });

    return {
      id: merchant.id,
      name: merchant.name,
      code: merchant.code,
      contact: merchant.contact,
      phone: merchant.phone,
      bankAccount: merchant.bankAccount,
      status: merchant.status
    };
  }

  /**
   * 切换商户状态（管理员）
   */
  static async toggleMerchantStatus(merchantId: string, status: 'ACTIVE' | 'DISABLED', reason?: string) {
    const merchant = await db.merchant.update({
      where: { id: merchantId },
      data: {
        status,
        disabledReason: status === 'DISABLED' ? reason : null
      }
    });

    return {
      id: merchant.id,
      name: merchant.name,
      status: merchant.status,
      disabledReason: merchant.disabledReason
    };
  }

  /**
   * 获取商户详情（管理员）
   */
  static async getMerchantDetail(merchantId: string) {
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
      include: {
        _count: {
          select: {
            activationCodes: true,
            purchases: true,
            rewards: true
          }
        },
        purchases: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        rewards: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!merchant) {
      throw new Error('商户不存在');
    }

    return {
      id: merchant.id,
      name: merchant.name,
      code: merchant.code,
      contact: merchant.contact,
      phone: merchant.phone,
      bankAccount: merchant.bankAccount,
      status: merchant.status,
      disabledReason: merchant.disabledReason,
      createdAt: merchant.createdAt,
      stats: {
        activationCodes: merchant._count.activationCodes,
        purchases: merchant._count.purchases,
        rewards: merchant._count.rewards
      },
      recentPurchases: merchant.purchases,
      recentRewards: merchant.rewards
    };
  }

  /**
   * 删除商户（管理员）
   */
  static async deleteMerchant(merchantId: string) {
    // 检查商户是否有激活码
    const activationCodeCount = await db.activationCode.count({
      where: { merchantId }
    });

    if (activationCodeCount > 0) {
      throw new Error('该商户还有激活码，无法删除');
    }

    await db.merchant.delete({
      where: { id: merchantId }
    });
  }
} 