import { Elysia } from 'elysia';
import { success, error, paginated } from '../../utils/response';
import { adminAuth } from '../../middleware/auth';
import { AdminService } from './service';
import { AdminModels } from './model';

export const adminRoutes = new Elysia({ prefix: '/admin' })
  // 用户管理
  .group('/users', (app) =>
    app
      .use(adminAuth)
        // 获取当前管理员信息
      .get('/profile', async ({ currentUser }) => {
        try {
          // 根据用户类型返回相应信息
          return success({
            id: currentUser.id,
            phone: currentUser.phone,
            name: currentUser.name || currentUser.phone,
            role: currentUser.role,
            isActive: currentUser.isActive,
            createdAt: currentUser.createdAt,
            merchants: currentUser.merchants || []
          });
        } catch (err: any) {
          console.error('获取管理员信息失败:', err);
          return error('获取管理员信息失败');
        }
      })
      // 获取用户列表
      .get('/', async ({ query }) => {
        const {
          page = 1,
          pageSize = 20,
          keyword,
          memberStatus,
          isActive
        } = query as {
          page?: number;
          pageSize?: number;
          keyword?: string;
          memberStatus?: string;
          isActive?: string;
        };

        try {
          const result = await AdminService.getUserList(page, pageSize, keyword, memberStatus, isActive);
          return paginated(result.data, result.total, page, pageSize);
        } catch (err: any) {
          console.error('获取用户列表失败:', err);
          return error('获取用户列表失败');
        }
      }, {
        query: AdminModels.User.GetUserListQuery
      })

      // 获取用户详情
      .get('/:id', async ({ params }) => {
        const { id } = params as { id: string };

        try {
          const result = await AdminService.getUserDetail(id);
          return success(result);
        } catch (err: any) {
          console.error('获取用户详情失败:', err);
          return error('获取用户详情失败');
        }
      }, {
        params: AdminModels.User.UserParams
      })

      // 禁用/启用用户
      .post('/:id/toggle-status', async ({ params, body }) => {
        const { id } = params as { id: string };
        const { isActive, reason } = body as {
          isActive: boolean;
          reason?: string;
        };

        try {
          const result = await AdminService.toggleUserStatus(id, isActive, reason);
          return success(result, `用户已${isActive ? '启用' : '禁用'}`);
        } catch (err: any) {
          console.error('更新用户状态失败:', err);
          return error('更新用户状态失败');
        }
      }, {
        params: AdminModels.User.UserParams,
        body: AdminModels.User.ToggleUserStatusBody
      })

      // 调整用户会员时长
      .post('/:id/adjust-membership', async ({ params, body }) => {
        const { id } = params as { id: string };
        const { adjustType, duration, reason } = body as {
          adjustType: 'extend' | 'reduce';
          duration: number;
          reason: string;
        };

        try {
          const result = await AdminService.adjustUserMembership(id, adjustType, duration, reason);
          return success(result, `会员时长调整成功`);
        } catch (err: any) {
          console.error('调整用户会员时长失败:', err);
          return error('调整用户会员时长失败');
        }
      }, {
        params: AdminModels.User.UserParams,
        body: AdminModels.User.AdjustMembershipBody
      })
  )

  // 系统配置管理
  .group('/config', (app) =>
    app
      .use(adminAuth)
      // 获取价格配置
      .get('/prices', async () => {
        try {
          const result = await AdminService.getPriceConfigs();
          return success(result);
        } catch (err: any) {
          console.error('获取价格配置失败:', err);
          return error('获取价格配置失败');
        }
      })

      // 创建价格配置
      .post('/prices', async ({ body }) => {
        const { duration, userPrice, merchantPrice } = body as {
          duration: string;
          userPrice: number;
          merchantPrice: number;
        };

        try {
          const result = await AdminService.createPriceConfig(duration, userPrice, merchantPrice);
          return success(result, '价格配置创建成功');
        } catch (err: any) {
          console.error('创建价格配置失败:', err);
          return error('创建价格配置失败');
        }
      }, {
        body: AdminModels.Config.CreatePriceConfigBody
      })

      // 获取奖励规则
      .get('/reward-rules', async () => {
        try {
          const result = await AdminService.getRewardRules();
          return success(result);
        } catch (err: any) {
          console.error('获取奖励规则失败:', err);
          return error('获取奖励规则失败');
        }
      })

      // 创建奖励规则
      .post('/reward-rules', async ({ body }) => {
        const {
          level,
          minDailySales,
          maxDailySales,
          rewardQuantity,
          isPeakSeason
        } = body as {
          level: string;
          minDailySales: number;
          maxDailySales?: number;
          rewardQuantity: number;
          isPeakSeason: boolean;
        };

        try {
          const result = await AdminService.createRewardRule(level, minDailySales, rewardQuantity, isPeakSeason, maxDailySales);
          return success(result, '奖励规则创建成功');
        } catch (err: any) {
          console.error('创建奖励规则失败:', err);
          return error('创建奖励规则失败');
        }
      }, {
        body: AdminModels.Config.CreateRewardRuleBody
      })

      // 更新奖励规则
      .put('/reward-rules/:id', async ({ params, body }) => {
        const { id } = params as { id: string };
        const {
          level,
          minDailySales,
          maxDailySales,
          rewardQuantity,
          isPeakSeason,
          isActive
        } = body as {
          level?: string;
          minDailySales?: number;
          maxDailySales?: number;
          rewardQuantity?: number;
          isPeakSeason?: boolean;
          isActive?: boolean;
        };

        try {
          const result = await AdminService.updateRewardRule(id, {
            level,
            minDailySales,
            maxDailySales,
            rewardQuantity,
            isPeakSeason,
            isActive
          });
          return success(result, '奖励规则更新成功');
        } catch (err: any) {
          console.error('更新奖励规则失败:', err);
          return error('更新奖励规则失败');
        }
      }, {
        params: AdminModels.Config.RewardRuleParams,
        body: AdminModels.Config.UpdateRewardRuleBody
      })

      // 获取旺季配置
      .get('/peak-seasons', async () => {
        try {
          const result = await AdminService.getPeakSeasons();
          return success(result);
        } catch (err: any) {
          console.error('获取旺季配置失败:', err);
          return error('获取旺季配置失败');
        }
      })

      // 创建旺季配置
      .post('/peak-seasons', async ({ body }) => {
        const { name, startMonth, endMonth } = body as {
          name: string;
          startMonth: number;
          endMonth: number;
        };

        try {
          const result = await AdminService.createPeakSeason(name, startMonth, endMonth);
          return success(result, '旺季配置创建成功');
        } catch (err: any) {
          console.error('创建旺季配置失败:', err);
          return error('创建旺季配置失败');
        }
      }, {
        body: AdminModels.Config.CreatePeakSeasonBody
      })

      // 获取系统配置
      .get('/system', async () => {
        try {
          const result = await AdminService.getSystemConfigs();
          return success(result);
        } catch (err: any) {
          console.error('获取系统配置失败:', err);
          return error('获取系统配置失败');
        }
      })

      // 更新系统配置
      .put('/system/:key', async ({ params, body }) => {
        const { key } = params as { key: string };
        const { value, description } = body as {
          value: string;
          description?: string;
        };

        try {
          const result = await AdminService.updateSystemConfig(key, value, description);
          return success(result, '系统配置更新成功');
        } catch (err: any) {
          console.error('更新系统配置失败:', err);
          return error('更新系统配置失败');
        }
      }, {
        params: AdminModels.Config.SystemConfigParams,
        body: AdminModels.Config.UpdateSystemConfigBody
      })
  )

  // 统计报表
  .group('/statistics', (app) =>
    app
      .use(adminAuth)
      // 获取用户统计
      .get('/users', async ({ query }) => {
        const { startDate, endDate } = query as {
          startDate?: string;
          endDate?: string;
        };

        try {
          const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const end = endDate ? new Date(endDate) : new Date();
          const result = await AdminService.getUserStatistics(start, end);
          return success(result);
        } catch (err: any) {
          console.error('获取用户统计失败:', err);
          return error('获取用户统计失败');
        }
      }, {
        query: AdminModels.Statistics.StatisticsQuery
      })

      // 获取商户统计
      .get('/merchants', async ({ query }) => {
        const { startDate, endDate } = query as {
          startDate?: string;
          endDate?: string;
        };

        try {
          const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const end = endDate ? new Date(endDate) : new Date();
          const result = await AdminService.getMerchantStatistics(start, end);
          return success(result);
        } catch (err: any) {
          console.error('获取商户统计失败:', err);
          return error('获取商户统计失败');
        }
      }, {
        query: AdminModels.Statistics.StatisticsQuery
      })

      // 获取激活码统计
      .get('/activation-codes', async ({ query }) => {
        const { startDate, endDate } = query as {
          startDate?: string;
          endDate?: string;
        };

        try {
          const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const end = endDate ? new Date(endDate) : new Date();
          const result = await AdminService.getActivationCodeStatistics(start, end);
          return success(result);
        } catch (err: any) {
          console.error('获取激活码统计失败:', err);
          return error('获取激活码统计失败');
        }
      }, {
        query: AdminModels.Statistics.StatisticsQuery
      })
  )

  // 操作日志
  .get('/operation-logs', async ({ query }) => {
    const { page = 1, pageSize = 20, operatorType, operation } = query as {
      page?: number;
      pageSize?: number;
      operatorType?: string;
      operation?: string;
    };

    try {
      const result = await AdminService.getOperationLogs(page, pageSize, operatorType, operation);
      return paginated(result.data, result.total, page, pageSize);
    } catch (err: any) {
      console.error('获取操作日志失败:', err);
      return error('获取操作日志失败');
    }
  }, {
    query: AdminModels.Log.GetOperationLogsQuery
  }); 