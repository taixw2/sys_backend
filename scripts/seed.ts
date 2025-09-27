import { PrismaClient, RewardLevel } from '../generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

enum Duration {
  ONE_YEAR = 'ONE_YEAR',
  THREE_YEARS = 'THREE_YEARS',
  TWELVE_YEARS = 'TWELVE_YEARS',
  TWENTY_YEARS = 'TWENTY_YEARS'
}


async function main() {
  console.log('🌱 开始初始化数据库...');

  // 清理现有数据（可选，生产环境请谨慎使用）
  console.log('🧹 清理现有配置数据...');
  await prisma.priceConfig.deleteMany({});
  await prisma.rewardRule.deleteMany({});
  await prisma.peakSeason.deleteMany({});
  await prisma.systemConfig.deleteMany({});

  // 1. 创建价格配置
  console.log('💰 创建价格配置...');
  const priceConfigs = [
    {
      duration: Duration.ONE_YEAR,
      userPrice: 299.00,
      merchantPrice: 199.00,
      isActive: true
    },
    {
      duration: Duration.THREE_YEARS,
      userPrice: 799.00,
      merchantPrice: 599.00,
      isActive: true
    },
    {
      duration: Duration.TWELVE_YEARS,
      userPrice: 2999.00,
      merchantPrice: 2299.00,
      isActive: true
    },
    {
      duration: Duration.TWENTY_YEARS,
      userPrice: 4999.00,
      merchantPrice: 3999.00,
      isActive: true
    }
  ];

  for (const config of priceConfigs) {
    await prisma.priceConfig.create({
      data: config
    });
    console.log(`✅ 创建价格配置: ${config.duration} - 用户价: ¥${config.userPrice}, 商户价: ¥${config.merchantPrice}`);
  }

  // 2. 创建奖励规则配置
  console.log('🎁 创建奖励规则配置...');
  const rewardRules = [
    // 基础层 - 非旺季
    {
      level: RewardLevel.BASIC,
      minDailySales: 1,
      maxDailySales: 5,
      rewardQuantity: 2,
      isPeakSeason: false,
      isActive: true
    },
    // 进阶层 - 非旺季
    {
      level: RewardLevel.ADVANCED,
      minDailySales: 6,
      maxDailySales: 15,
      rewardQuantity: 5,
      isPeakSeason: false,
      isActive: true
    },
    // 头部层 - 非旺季
    {
      level: RewardLevel.TOP,
      minDailySales: 16,
      maxDailySales: null,
      rewardQuantity: 10,
      isPeakSeason: false,
      isActive: true
    },
    // 基础层 - 旺季
    {
      level: RewardLevel.BASIC,
      minDailySales: 1,
      maxDailySales: 5,
      rewardQuantity: 3,
      isPeakSeason: true,
      isActive: true
    },
    // 进阶层 - 旺季
    {
      level: RewardLevel.ADVANCED,
      minDailySales: 6,
      maxDailySales: 15,
      rewardQuantity: 8,
      isPeakSeason: true,
      isActive: true
    },
    // 旺季层 - 旺季
    {
      level: RewardLevel.PEAK,
      minDailySales: 16,
      maxDailySales: 30,
      rewardQuantity: 15,
      isPeakSeason: true,
      isActive: true
    },
    // 头部层 - 旺季
    {
      level: RewardLevel.TOP,
      minDailySales: 31,
      maxDailySales: null,
      rewardQuantity: 25,
      isPeakSeason: true,
      isActive: true
    }
  ];

  for (const rule of rewardRules) {
    await prisma.rewardRule.create({
      data: rule
    });
    const seasonText = rule.isPeakSeason ? '旺季' : '非旺季';
    const maxText = rule.maxDailySales ? `${rule.maxDailySales}` : '无上限';
    console.log(`✅ 创建奖励规则: ${rule.level} ${seasonText} - 日销量: ${rule.minDailySales}-${maxText}, 奖励: ${rule.rewardQuantity}个`);
  }

  // 3. 创建旺季配置
  console.log('🌟 创建旺季配置...');
  const peakSeasons = [
    {
      name: '春节档',
      startMonth: 1,
      endMonth: 2,
      isActive: true
    },
    {
      name: '暑假档',
      startMonth: 7,
      endMonth: 8,
      isActive: true
    },
    {
      name: '双十一档',
      startMonth: 11,
      endMonth: 11,
      isActive: true
    },
    {
      name: '年末档',
      startMonth: 12,
      endMonth: 12,
      isActive: true
    }
  ];

  for (const season of peakSeasons) {
    await prisma.peakSeason.create({
      data: season
    });
    console.log(`✅ 创建旺季配置: ${season.name} (${season.startMonth}月-${season.endMonth}月)`);
  }

  // 4. 创建系统配置
  console.log('⚙️  创建系统配置...');
  const systemConfigs = [
    {
      key: 'SYSTEM_NAME',
      value: '英语管理平台',
      description: '系统名称'
    },
    {
      key: 'SYSTEM_VERSION',
      value: '1.0.0',
      description: '系统版本'
    },
    {
      key: 'FIRST_LOGIN_GIFT_DAYS',
      value: '1',
      description: '首次登录赠送会员天数'
    },
    {
      key: 'VERIFICATION_CODE_EXPIRE_MINUTES',
      value: '5',
      description: '验证码有效期（分钟）'
    },
    {
      key: 'VERIFICATION_CODE_RATE_LIMIT',
      value: '60',
      description: '验证码发送间隔（秒）'
    },
    {
      key: 'JWT_EXPIRE_DAYS',
      value: '7',
      description: 'JWT令牌有效期（天）'
    },
    {
      key: 'MEMBER_EXPIRY_REMINDER_DAYS',
      value: '3',
      description: '会员到期提醒天数'
    },
    {
      key: 'STOCK_LOW_THRESHOLD',
      value: '50',
      description: '库存不足提醒阈值'
    },
    {
      key: 'ACTIVATION_CODE_LENGTH',
      value: '8',
      description: '激活码长度'
    },
    {
      key: 'MERCHANT_CODE_PREFIX',
      value: 'M',
      description: '商户编号前缀'
    },
    {
      key: 'SMS_PROVIDER',
      value: 'ALIYUN',
      description: '短信服务商'
    },
    {
      key: 'NOTIFICATION_ENABLED',
      value: 'true',
      description: '是否启用通知功能'
    },
    {
      key: 'AUTO_APPROVE_MERCHANT',
      value: 'false',
      description: '是否自动审核商户'
    },
    {
      key: 'REWARD_CALCULATION_DAY',
      value: '1',
      description: '奖励计算日期（每月几号）'
    },
    {
      key: 'CONTACT_PHONE',
      value: '400-888-8888',
      description: '客服电话'
    },
    {
      key: 'CONTACT_EMAIL',
      value: 'support@english-admin.com',
      description: '客服邮箱'
    }
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.create({
      data: config
    });
    console.log(`✅ 创建系统配置: ${config.key} = ${config.value}`);
  }

  // 5. 创建默认管理员账户
  console.log('👤 创建默认管理员账户...');
  
  // 检查是否已存在管理员
  const existingAdmin = await prisma.admin.findFirst({
    where: { phone: '13800138001' }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123456', 10);
    
    await prisma.admin.create({
      data: {
        phone: '13800138001',
        password: hashedPassword,
        name: '系统管理员',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });
    
    console.log('✅ 创建默认管理员账户: admin / admin123456');
  } else {
    console.log('ℹ️  管理员账户已存在，跳过创建');
  }

  // 6. 创建测试商户（可选）
  console.log('🏪 创建测试商户...');
  
  const existingMerchant = await prisma.merchant.findFirst({
    where: { code: 'M001' }
  });

  if (!existingMerchant) {
    await prisma.merchant.create({
      data: {
        name: '测试商户',
        code: 'M001',
        contact: '张三',
        phone: '13800138001',
        bankAccount: '6228480000000000001',
        status: 'ACTIVE'
      }
    });
    
    console.log('✅ 创建测试商户: 测试商户 (M001)');
  } else {
    console.log('ℹ️  测试商户已存在，跳过创建');
  }

  // 7. 创建测试用户（可选）
  console.log('👥 创建测试用户...');
  
  const existingUser = await prisma.user.findFirst({
    where: { phone: '13800138002' }
  });

  if (!existingUser) {
    const memberExpireAt = new Date();
    memberExpireAt.setDate(memberExpireAt.getDate() + 30); // 30天会员

    await prisma.user.create({
      data: {
        phone: '13800138002',
        memberExpireAt,
        isActive: true
      }
    });
    
    console.log('✅ 创建测试用户: 13800138002 (30天会员)');
  } else {
    console.log('ℹ️  测试用户已存在，跳过创建');
  }

  console.log('🎉 数据库初始化完成！');
  console.log('');
  console.log('📋 初始化摘要:');
  console.log('- 价格配置: 4个时长的定价');
  console.log('- 奖励规则: 7个等级的奖励标准');
  console.log('- 旺季配置: 4个旺季时段');
  console.log('- 系统配置: 16个系统参数');
  console.log('- 默认管理员: admin / admin123456');
  console.log('- 测试商户: 测试商户 (M001)');
  console.log('- 测试用户: 13800138002');
  console.log('');
  console.log('🚀 现在可以启动应用程序了！');
}

main()
  .catch((e) => {
    console.error('❌ 数据库初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 