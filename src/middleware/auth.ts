import { Elysia, t, NotFoundError } from 'elysia';
import { db } from '../utils/db';
import { error } from '../utils/response';
import { JwtPayload, JwtUtils } from '../plugins/jwt';
import { generateDeviceId } from '../utils/device';
import { AdminRole } from '../../generated/prisma';

/**
 * 通用认证中间件
 */
export const authMiddleware = (allowedTypes: ('USER' | 'ADMIN' | 'SUPER_ADMIN')[]) => {
  return new Elysia()
    .derive(async ({ headers, request, status }) => {
      const authorization = headers.authorization;

      if (!authorization || !authorization.startsWith('Bearer ')) {
        throw new Error('未提供有效的认证令牌');
      }

      const token = authorization.substring(7);
      const payload = JwtUtils.verifyToken(token);

      if (!payload) {
        return status(401, {
          message: '未提供有效的认证令牌'
        });
      }


      if (!allowedTypes.includes(payload.type)) {
        return status(401, {
          message: '权限不足'
        });
      }

      // 验证用户是否存在且状态正常
      let user: any = null;
      switch (payload.type) {
        case 'USER':
          user = await db.user.findUnique({
            where: { id: payload.id }
          });
          if (!user || !user.isActive) {
            return status(401, {
              message: '用户账号已被限制使用'
            });
          }

          // 对用户类型进行设备验证
          // const userAgent = headers['user-agent'];
          // const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';
          // const deviceId = generateDeviceId(userAgent, ip);

          // // 检查设备是否被授权
          // const userDevice = await db.userDevice.findUnique({
          //   where: {
          //     userId_deviceId: {
          //       userId: payload.id,
          //       deviceId
          //     }
          //   }
          // });

          // if (!userDevice || !userDevice.isActive) {
          //   throw new Error('当前设备未被授权，请重新登录');
          // }

          // 更新设备最后活跃时间
          // await db.userDevice.update({
          //   where: {
          //     id: userDevice.id
          //   },
          //   data: {
          //     lastLoginAt: new Date(),
          //     ip
          //   }
          // });

          break;
        case 'SUPER_ADMIN':
          const sadmin = await db.admin.findUnique({
            where: { id: payload.id }
          });
          if (sadmin?.role !== AdminRole.ADMIN && sadmin?.role !== AdminRole.SUPER_ADMIN) {
            return status(401, {
              message: '管理员账号权限不足'
            });
          }
          user = sadmin;
          break;
        case 'ADMIN':
          const admin = await db.admin.findUnique({
            where: { id: payload.id }
          });
          if (admin?.role !== AdminRole.ADMIN) {
            return status(401, {
              message: '管理员账号权限不足'
            });
          }
          user = admin;
          break;
      }

      return {
        currentUser: user,
        userType: payload.type
      };
    });
};

/**
 * 用户认证中间件
 */
export const userAuth = authMiddleware(['USER']);

/**
 * 商户认证中间件
 */
export const merchantAuth = authMiddleware(['ADMIN']);

/**
 * 管理员认证中间件
 */
export const adminAuth = authMiddleware(['SUPER_ADMIN']);

/**
 * 管理员和商户认证中间件
 */
export const adminOrMerchantAuth = authMiddleware(['ADMIN', 'SUPER_ADMIN']);

/**
 * 所有类型用户认证中间件
 */
export const allAuth = authMiddleware(['USER', 'ADMIN', 'SUPER_ADMIN']);

/**
 * 记录操作日志的中间件
 */
export const logOperation = (operation: string, targetType?: string) => {
  return new Elysia()
    .use(allAuth)
    .derive(async ({ }) => {
      // 记录操作日志
      // await db.operationLog.create({
      //   data: {
      //     operatorId: currentUser.id,
      //     operatorType: userType.toUpperCase() as any,
      //     operation: operation as any,
      //     targetType,
      //     ip: request.headers.get('x-forwarded-for') || 
      //         request.headers.get('x-real-ip') || 
      //         'unknown'
      //   }
      // });

      return {};
    });
}; 