import { success, error } from '../../utils/response';
import { Elysia } from 'elysia';
import { AuthService } from './service';
import { AuthModels } from './model';
import { auth } from '../../lib/auth';
import { plogger } from '../../utils/plogger';

export const authRoutes = new Elysia({ prefix: '/auth' })
  // 发送验证码
  .post('/send-code', async ({ body }) => {
    const { phone } = body as { phone: string; type: 'LOGIN' | 'REGISTER' | 'RESET' };

    await auth.api.sendPhoneNumberOTP({
      body: {
        phoneNumber: phone,
      },
      // path: type
    })
    return success(null, '验证码发送成功');
  }, {
    body: AuthModels.SendCode.SendCodeBody
  })

  // 用户登录
  .post('/user/login', async ({ body, headers }) => {
    const { phone, code, deviceId } = body;

    try {
      // 提取设备信息
      const userAgent = headers['user-agent'];
      const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';

      const result = await AuthService.userLogin(phone, code, deviceId, userAgent, ip);
      return success(result, '登录成功');
    } catch (err: any) {
      // 记录失败日志
      const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';
      await AuthService.recordLoginFailure(phone, 'user', ip);
      return error(err.message || '登录失败');
    }
  }, {
    body: AuthModels.UserLogin.UserLoginBody
  })

  // 商户注册
  .post('/merchant/register', async ({ body, status }) => {
    const { email, password, name, contact } = body as {
      email: string;
      password: string;
      name: string;
      contact: string;
    };

    try {
      const result = await AuthService.merchantRegister(email, password, name, contact);
      return success(result, '注册成功');
    } catch (err: any) {
      plogger.error(err);
      return status(500, {
        message: err.message || '注册失败'
      });
    }
  }, {
    body: AuthModels.MerchantLogin.MerchantRegisterBody
  })
