import { db } from '../../utils/db';
import { SmsService } from '../../services/sms';
import { isValidPhone, isValidVerificationCode } from '../../utils/validation';
import { JwtUtils } from '../../plugins/jwt';
import { VerificationCodeTypeType, UserTypeType, LoginStatusType } from './model';
import { generateDeviceId, parseDeviceInfo, registerOrUpdateDevice } from '../../utils/device';
import { hashPassword, verifyPassword, generateSalt, generateMerchantCode, generateRandomString } from '../../utils/crypto';
import { AdminRole } from '../../../generated/prisma';
import { VerificationCodeRedis, VerificationCodeType } from '../../utils/redis';
import svgCaptcha from 'svg-captcha';
import { auth } from '../../lib/auth';
import { phoneNumber, UserWithPhoneNumber } from 'better-auth/plugins';
import { authClient } from '../../lib/auth-client';

export class AuthService {
  static async generateCaptcha() {
    const id = generateRandomString(16);

    // 生成4位验证码（字母数字混合）
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // 存储验证码到 Redis，5分钟过期
    await VerificationCodeRedis.setCaptcha(id, code, 300);

    // 生成 SVG 图片验证码
    const capt = svgCaptcha.create({
      size: 4,           // 4位验证码
      ignoreChars: '0O1I', // 忽略容易混淆的字符
      noise: 2,          // 干扰线数量
      color: true,       // 彩色
      background: '#f0f0f0', // 背景色
      width: 100,        // 宽度
      height: 40         // 高度
    });

    // 更新 Redis 中的验证码为实际生成的验证码
    await VerificationCodeRedis.setCaptcha(id, capt.text, 300);

    return { id, captObject: capt };
  }

  /**
   * 发送验证码
   */
  static async sendVerificationCode(phone: string, type: VerificationCodeTypeType) {
    if (!isValidPhone(phone)) {
      throw new Error('手机号格式不正确');
    }

    if (!['LOGIN', 'REGISTER', 'RESET'].includes(type)) {
      throw new Error('验证码类型不正确');
    }

    await SmsService.sendVerificationCode(phone, type);
  }

  /**
   * 用户登录
   */
  static async userLogin(phone: string, code: string, deviceId: string, userAgent?: string, ip?: string) {
    if (!isValidPhone(phone)) {
      throw new Error('手机号格式不正确');
    }

    if (!isValidVerificationCode(code)) {
      throw new Error('验证码格式不正确');
    }

    const existedUser = await db.user.findUnique({
      where: { phoneNumber: phone }
    });

    const data = await auth.api.verifyPhoneNumber({
      body: {
        phoneNumber: phone, // required
        code: code, // required
      },
    });

    if (!data.status) {
      throw new Error('验证码无效或已过期');
    }

    if (!existedUser) {
      // 新用户注册，赠送3天会员
      const memberExpireAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      await db.user.update({
        where: { id: data.user.id },
        data: {
          phoneNumber: phone,
          phoneNumberVerified: true,
          memberExpireAt,
          memberRecords: {
            create: {
              type: 'FIRST_LOGIN',
              duration: 3,
              startDate: new Date(),
              endDate: memberExpireAt,
              reason: '首次登录赠送'
            }
          }
        }
      });
    }

    // 检查用户状态
    if (!data.user) {
      throw new Error('账号已被限制使用，请联系客服');
    }

    // 处理设备注册
    const deviceInfo = parseDeviceInfo(userAgent);

    try {
      await registerOrUpdateDevice(
        data.user.id,
        deviceId,
        deviceInfo.deviceName,
        deviceInfo.deviceType,
      );
    } catch (err) {
      console.error('设备注册失败:', err);
      throw new Error('设备注册失败，请稍后重试');
    }

    // 记录登录日志
    await db.loginLog.create({
      data: {
        userId: data.user.id,
        status: 'SUCCESS',
        ip,
        device: deviceInfo.deviceName
      }
    });

    return {
      token: data.token,
      user: {
        id: data.user.id,
        phone: data.user.phoneNumber,
      }
    };
  }

  /**
   * 商户注册
   */
  static async merchantRegister(email: string, password: string, name: string, contact: string) {

    const existedUser = await db.user.findFirst({
      where: { email }
    })

    if (existedUser) {
      throw new Error('该邮箱已被注册');
    }
    const existedPhoneUser = await db.user.findFirst({
      where: { phoneNumber: contact }
    })

    if (existedPhoneUser) {
      throw new Error('该手机号已被注册');
    }

    await auth.api.createUser({
      body: {
        email: email, // required
        password: password, // required
        name: name, // required
        role: "admin",
        data: { phoneNumber: contact },
      },
    });

    const data = await auth.api.signInEmail({
      body: {
        email: email, // required
        password: password,
      },
    });

    return {
      token: data.token,
      merchant: data.user
    };
  }

  /**
   * 记录登录失败日志
   */
  static async recordLoginFailure(phone: string, type: UserTypeType, ip?: string) {
    // 查找用户
    let userId: string | null = null;

    if (type === 'user') {
      const user = await db.user.findUnique({
        where: { phoneNumber: phone }
      });
      userId = user?.id || null;
    } else if (type === 'merchant') {
      const merchant = await db.merchant.findFirst({
        where: { phone }
      });
      userId = merchant?.id || null;
    }

    if (userId) {
      if (type === 'user') {
        await db.loginLog.create({
          data: {
            userId,
            status: 'FAILED',
            ip
          }
        });
      } else if (type === 'merchant') {
        await db.merchantLoginLog.create({
          data: {
            merchantId: userId,
            status: 'FAILED',
            ip
          }
        });
      }
    }
  }
} 