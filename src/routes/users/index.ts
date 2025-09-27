import { Elysia } from 'elysia';
import { success, error, paginated } from '../../utils/response';
import { userAuth } from '../../middleware/auth';
import { UserService } from './service';
import { UserModels } from './model';
import { getUserActiveDevices, kickoutDevice } from '../../utils/device';

export const userRoutes = new Elysia({ prefix: '/users' })
  .group('', (app) =>
    app
      .use(userAuth)
  
  // 获取用户个人信息
  .get('/profile', async ({ currentUser }) => {
    try {
      console.log('currentUser', currentUser);
      const result = await UserService.getUserProfile(currentUser.id);
      console.log('result', result);
      return success(result);
    } catch (err: any) {
      console.error('获取用户信息失败:', err);
      return error('获取用户信息失败');
    }
  })

  // 激活码激活
  .post('/activate', async ({ body, currentUser }) => {
    const { activationCode } = body as { activationCode: string };

    try {
      const result = await UserService.activateCode(currentUser.id, activationCode);
      return success(result, '激活成功，会员有效期已延长');
    } catch (err: any) {
      console.error('激活失败:', err);
      return error(err.message || '激活失败');
    }
  }, {
    body: UserModels.Activation.ActivateBody
  })

  // 获取激活记录
  .get('/activation-records', async ({ query, currentUser }) => {
    const { page = 1, pageSize = 10 } = query as {
      page?: number;
      pageSize?: number;
    };

    try {
      const result = await UserService.getActivationRecords(currentUser.id, page, pageSize);
      return paginated(result.data, result.pagination.total, result.pagination.page, result.pagination.pageSize);
    } catch (err: any) {
      console.error('获取激活记录失败:', err);
      return error('获取激活记录失败');
    }
  }, {
    query: UserModels.Activation.GetActivationRecordsQuery
  })

  // 获取会员记录
  .get('/member-records', async ({ query, currentUser }) => {
    const { page = 1, pageSize = 10, type } = query as {
      page?: number;
      pageSize?: number;
      type?: string;
    };

    try {
      const result = await UserService.getMemberRecords(currentUser.id, page, pageSize, type);
      return paginated(result.data, result.pagination.total, result.pagination.page, result.pagination.pageSize);
    } catch (err: any) {
      console.error('获取会员记录失败:', err);
      return error('获取会员记录失败');
    }
  }, {
    query: UserModels.MemberRecord.GetMemberRecordsQuery
  })

  // 获取会员统计信息
  .get('/member-stats', async ({ currentUser }) => {
    try {
      const result = await UserService.getMemberStats(currentUser.id);
      return success(result);
    } catch (err: any) {
      console.error('获取会员统计失败:', err);
      return error('获取会员统计失败');
    }
  })

  // 获取登录日志
  .get('/login-logs', async ({ query, currentUser }) => {
    const { page = 1, pageSize = 10 } = query as {
      page?: number;
      pageSize?: number;
    };

    try {
      const result = await UserService.getLoginLogs(currentUser.id, page, pageSize);
      return paginated(result.data, result.pagination.total, result.pagination.page, result.pagination.pageSize);
    } catch (err: any) {
      console.error('获取登录日志失败:', err);
      return error('获取登录日志失败');
    }
  }, {
    query: UserModels.LoginLog.GetLoginLogsQuery
  })

  // 获取用户设备列表
  .get('/devices', async ({ currentUser }) => {
    try {
      const devices = await getUserActiveDevices(currentUser.id);
      return success(devices, '获取设备列表成功');
    } catch (err: any) {
      return error(err.message || '获取设备列表失败');
    }
  })

  // 踢出指定设备
  .delete('/devices/:deviceId', async ({ currentUser, params }) => {
    const { deviceId } = params;
    
    try {
      await kickoutDevice(currentUser.id, deviceId);
      return success(null, '设备已被踢出');
    } catch (err: any) {
      return error(err.message || '踢出设备失败');
    }
  })); 