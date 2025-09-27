import { db } from '../utils/db';
import { generateVerificationCode } from '../utils/crypto';
import { VerificationCodeType } from '../../generated/prisma';
import { VerificationCodeRedis, VerificationCodeType as RedisVerificationCodeType } from '../utils/redis';

// 测试环境万能验证码
const TEST_UNIVERSAL_CODE = '123456';
const isTestEnvironment = process.env.NODE_ENV !== 'production';

/**
 * 短信服务类
 */
export class SmsService {
  /**
   * 发送验证码
   */
  static async sendVerificationCode(phone: string, type: VerificationCodeType, args: string[] = []): Promise<boolean> {
    try {
      // 将数据库类型转换为 Redis 类型
      const redisType = this.convertToRedisType(type);

      // 使用 Redis 检查发送频率限制（1分钟内最多1次）
      const oneMinuteLimit = await VerificationCodeRedis.checkSendLimit(phone, 60, 1);
      if (!oneMinuteLimit.allowed) {
        throw new Error('验证码发送过于频繁，请稍后再试');
      }

      // 检查10分钟内发送次数（最多5次）
      const tenMinuteLimit = await VerificationCodeRedis.checkSendLimit(phone, 600, 5);
      if (!tenMinuteLimit.allowed) {
        throw new Error('验证码发送次数过多，请10分钟后再试');
      }

      // 生成验证码
      const code = generateVerificationCode();
      const expireInSeconds = 300; // 5分钟过期

      console.log('code', code);
      console.log('expireInSeconds', expireInSeconds);

      // 保存验证码到 Redis
      await VerificationCodeRedis.setCode(phone, redisType, code, expireInSeconds);

      // 仍然保存到数据库以保持历史记录（可选）
      const expiresAt = new Date(Date.now() + expireInSeconds * 1000);
      await db.verificationCode.create({
        data: {
          phone,
          code,
          type,
          expiresAt
        }
      });

      // 发送短信（这里模拟发送）
      await this.sendSms(phone, code, type, args);

      return true;
    } catch (error) {
      console.error('发送验证码失败:', error);
      throw error;
    }
  }

  /**
   * 验证验证码
   */
  static async verifyCode(phone: string, code: string, type: 'LOGIN' | 'REGISTER' | 'RESET'): Promise<boolean> {
    try {
      // 测试环境万能验证码检查
      if (isTestEnvironment && code === TEST_UNIVERSAL_CODE) {
        console.log(`[测试环境] 使用万能验证码: ${TEST_UNIVERSAL_CODE}`);
        return true;
      }

      // 将数据库类型转换为 Redis 类型
      const redisType = this.convertToRedisType(type);

      // 首先尝试从 Redis 验证（更快）
      const redisValid = await VerificationCodeRedis.verifyAndDelete(phone, redisType, code);
      if (redisValid) {
        return true;
      }

      // 如果 Redis 验证失败，尝试从数据库验证（兼容旧数据）
      const verificationCode = await db.verificationCode.findFirst({
        where: {
          phone,
          code,
          type,
          used: false,
          expiresAt: { gt: new Date() }
        }
      });

      if (!verificationCode) {
        return false;
      }

      // 标记为已使用
      await db.verificationCode.update({
        where: { id: verificationCode.id },
        data: { used: true }
      });

      return true;
    } catch (error) {
      console.error('验证码验证失败:', error);
      return false;
    }
  }

  /**
   * 将数据库验证码类型转换为 Redis 验证码类型
   */
  private static convertToRedisType(type: VerificationCodeType | 'LOGIN' | 'REGISTER' | 'RESET'): RedisVerificationCodeType {
    switch (type) {
      case 'LOGIN':
        return RedisVerificationCodeType.SMS_LOGIN;
      case 'REGISTER':
        return RedisVerificationCodeType.SMS_REGISTER;
      case 'RESET':
        return RedisVerificationCodeType.SMS_RESET;
      default:
        throw new Error(`不支持的验证码类型: ${type}`);
    }
  }

  /**
   * 发送短信（模拟实现）
   */
  private static async sendSms(phone: string, code: string, type: VerificationCodeType, args: string[]): Promise<void> {
    // 在实际项目中，这里应该调用真实的短信服务商API
    const templates = {
      LOGIN: `【英语管理平台】您的登录验证码为：${code}，5分钟内有效，请勿泄露。`,
      REGISTER: `【英语管理平台】您的注册验证码为：${code}，5分钟内有效，请勿泄露。`,
      RESET: `【英语管理平台】您的重置验证码为：${code}，5分钟内有效，请勿泄露。`,
      MEMBER_EXPIRY: `【英语管理平台】您的会员即将到期，请及时续费。`,
      ACTIVATION_SUCCESS: `【英语管理平台】激活码激活成功！您的$0会员已生效，有效期至$1。`.replace('$0', args[0]).replace('$1', args[1]),
      STOCK_LOW: `【英语管理平台】您的激活码库存不足（剩余$0个），请及时补充。`.replace('$0', args[0]),
      MERCHANT_APPROVED: `【英语管理平台】您的商户申请已审核通过，可以开始使用平台服务。`,
      REWARD_RECEIVED: `【英语管理平台】您$0月销售达标，奖励$1个激活码已到账，可在库存中查看。`.replace('$0', args[0]).replace('$1', args[1])
    };

    const message = templates[type];
    
    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`发送短信到 ${phone}: ${message}`);
    
    // 测试环境额外提示
    if (isTestEnvironment) {
      console.log(`[测试环境] 万能验证码: ${TEST_UNIVERSAL_CODE}`);
    }
  }
} 