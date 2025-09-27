import { redis } from 'bun';

/**
 * 验证码类型枚举
 */
export enum VerificationCodeType {
  CAPTCHA = 'CAPTCHA',     // 图片验证码
  SMS_LOGIN = 'SMS_LOGIN', // 短信登录验证码
  SMS_REGISTER = 'SMS_REGISTER', // 短信注册验证码
  SMS_RESET = 'SMS_RESET'  // 短信重置验证码
}

/**
 * 验证码存储键的前缀
 */
const VERIFICATION_CODE_PREFIX = 'verification_code';

/**
 * Redis 工具类 - 验证码管理
 */
export class VerificationCodeRedis {
  /**
   * 生成存储验证码的 Redis 键
   */
  private static getKey(phone: string, type: VerificationCodeType): string {
    return `${VERIFICATION_CODE_PREFIX}:${type}:${phone}`;
  }

  /**
   * 生成验证码 ID 的 Redis 键
   */
  private static getCaptchaIdKey(id: string): string {
    return `${VERIFICATION_CODE_PREFIX}:captcha:${id}`;
  }

  /**
   * 存储验证码到 Redis
   * @param phone 手机号
   * @param type 验证码类型
   * @param code 验证码
   * @param expireInSeconds 过期时间（秒）
   */
  static async setCode(
    phone: string,
    type: VerificationCodeType,
    code: string,
    expireInSeconds: number = 300 // 默认5分钟
  ): Promise<void> {
    const key = this.getKey(phone, type);
    await redis.set(key, code, 'EX', expireInSeconds);
  }

  /**
   * 获取验证码
   * @param phone 手机号
   * @param type 验证码类型
   */
  static async getCode(phone: string, type: VerificationCodeType): Promise<string | null> {
    const key = this.getKey(phone, type);
    return await redis.get(key);
  }

  /**
   * 验证验证码并删除
   * @param phone 手机号
   * @param type 验证码类型
   * @param code 待验证的验证码
   */
  static async verifyAndDelete(
    phone: string,
    type: VerificationCodeType,
    code: string
  ): Promise<boolean> {
    const key = this.getKey(phone, type);
    const storedCode = await redis.get(key);

    if (!storedCode || storedCode.toLowerCase() !== code.toLowerCase()) {
      return false;
    }

    // 删除验证码（验证成功后立即删除）
    await redis.del(key);
    return true;
  }

  /**
   * 存储图片验证码
   * @param id 验证码ID
   * @param code 验证码
   * @param expireInSeconds 过期时间（秒）
   */
  static async setCaptcha(id: string, code: string, expireInSeconds: number = 300): Promise<void> {
    const key = this.getCaptchaIdKey(id);
    await redis.set(key, code, 'EX', expireInSeconds);
  }

  /**
   * 获取图片验证码
   * @param id 验证码ID
   */
  static async getCaptcha(id: string): Promise<string | null> {
    const key = this.getCaptchaIdKey(id);
    return await redis.get(key);
  }

  /**
   * 验证图片验证码并删除
   * @param id 验证码ID
   * @param code 待验证的验证码
   */
  static async verifyCaptchaAndDelete(id: string, code: string): Promise<boolean> {
    const key = this.getCaptchaIdKey(id);
    const storedCode = await redis.get(key);

    if (!storedCode || storedCode.toLowerCase() !== code.toLowerCase()) {
      return false;
    }

    // 删除验证码（验证成功后立即删除）
    await redis.del(key);
    return true;
  }

  /**
   * 删除验证码
   * @param phone 手机号
   * @param type 验证码类型
   */
  static async deleteCode(phone: string, type: VerificationCodeType): Promise<void> {
    const key = this.getKey(phone, type);
    await redis.del(key);
  }

  /**
   * 删除图片验证码
   * @param id 验证码ID
   */
  static async deleteCaptcha(id: string): Promise<void> {
    const key = this.getCaptchaIdKey(id);
    await redis.del(key);
  }

  /**
   * 检查验证码是否存在
   * @param phone 手机号
   * @param type 验证码类型
   */
  static async exists(phone: string, type: VerificationCodeType): Promise<boolean> {
    const key = this.getKey(phone, type);
    return await redis.exists(key);
  }

  /**
   * 获取验证码剩余过期时间（秒）
   * @param phone 手机号
   * @param type 验证码类型
   */
  static async getTtl(phone: string, type: VerificationCodeType): Promise<number> {
    const key = this.getKey(phone, type);
    return await redis.ttl(key);
  }

  /**
   * 批量删除某手机号的所有验证码
   * @param phone 手机号
   */
  static async deleteAllCodes(phone: string): Promise<void> {
    const pattern = `${VERIFICATION_CODE_PREFIX}:*:${phone}`;
    // 使用 SCAN 命令来查找所有匹配的键
    const keys: string[] = [];

    // 注意：这里需要实现一个 SCAN 的包装器
    // 或者使用更简单的方法：直接删除所有可能的类型
    const types = Object.values(VerificationCodeType);
    const deletePromises = types.map(type => {
      const key = this.getKey(phone, type);
      return redis.del(key);
    });

    await Promise.all(deletePromises);
  }

  /**
   * 检查发送频率限制（基于 Redis 计数器）
   * @param phone 手机号
   * @param windowSeconds 时间窗口（秒）
   * @param maxCount 最大发送次数
   */
  static async checkSendLimit(
    phone: string,
    windowSeconds: number = 60,
    maxCount: number = 5
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = `${VERIFICATION_CODE_PREFIX}:limit:${phone}`;
    const currentCount = await redis.incr(key);

    // 设置过期时间
    if (currentCount === 1) {
      await redis.expire(key, windowSeconds);
    }

    const remaining = Math.max(0, maxCount - currentCount);
    return {
      allowed: currentCount <= maxCount,
      remaining
    };
  }

  /**
   * 清理过期验证码（定期清理任务）
   */
  static async cleanup(): Promise<void> {
    // Redis 会自动清理过期的键，我们不需要手动清理
    // 这个方法主要用于记录清理操作的日志
    console.log('[VerificationCodeRedis] Redis 自动清理过期验证码');
  }
}
