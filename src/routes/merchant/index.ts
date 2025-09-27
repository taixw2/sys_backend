import { Elysia } from 'elysia';
import { success, error, paginated } from '../../utils/response';
import { merchantAuth, adminAuth } from '../../middleware/auth';
import { MerchantService } from './service';
import { MerchantModels } from './model';

export const merchantRoutes = new Elysia({ prefix: '/merchant' })
  // 商户自身信息管理
  .group('/profile', (app) => 
    app
      .use(merchantAuth)
      // 获取商户信息
      .get('/', async ({ currentUser }) => {
        try {
          const result = await MerchantService.getMerchantProfile(currentUser.id);
          return success(result);
        } catch (err: any) {
          console.error('获取商户信息失败:', err);
          return error('获取商户信息失败');
        }
      })

      // 更新商户信息
      .put('/', async ({ body, currentUser }) => {
        const { contact, bankAccount } = body as {
          contact?: string;
          bankAccount?: string;
        };

        try {
          const result = await MerchantService.updateMerchantProfile(currentUser.id, { contact, bankAccount });
          return success(result, '商户信息更新成功');
        } catch (err: any) {
          console.error('更新商户信息失败:', err);
          return error('更新商户信息失败');
        }
      }, {
        body: MerchantModels.Profile.UpdateProfileBody
      })
  )

  // 激活码购买管理
  .group('/purchase', (app) => 
    app
      .use(merchantAuth)
      // 创建购买订单
      .post('/create', async ({ body, currentUser }) => {
        const { duration, quantity } = body as {
          duration: string;
          quantity: number;
        };

        try {
          const result = await MerchantService.createPurchase(currentUser.id, duration as any, quantity);
          return success(result, '购买订单创建成功，请完成支付');
        } catch (err: any) {
          console.error('创建购买订单失败:', err);
          return error('创建购买订单失败');
        }
      }, {
        body: MerchantModels.Purchase.CreatePurchaseBody
      })

      // 获取购买记录
      .get('/records', async ({ query, currentUser }) => {
        const { page = 1, pageSize = 10, status } = query as {
          page?: number;
          pageSize?: number;
          status?: string;
        };

        try {
          const result = await MerchantService.getPurchaseRecords(currentUser.id, page, pageSize, status);
          return paginated(result.data, result.pagination.total, result.pagination.page, result.pagination.pageSize);
        } catch (err: any) {
          console.error('获取购买记录失败:', err);
          return error('获取购买记录失败');
        }
      }, {
        query: MerchantModels.Purchase.GetPurchaseRecordsQuery
      })

      // 获取价格配置
      .get('/prices', async ({ currentUser }) => {
        try {
          const result = await MerchantService.getPriceConfig();
          return success(result);
        } catch (err: any) {
          console.error('获取价格配置失败:', err);
          return error('获取价格配置失败');
        }
      })
  )

  // 销售奖励管理
  .group('/reward', (app) => 
    app
      .use(merchantAuth)
      // 获取奖励记录
      .get('/records', async ({ query, currentUser }) => {
        const { page = 1, pageSize = 10, month } = query as {
          page?: number;
          pageSize?: number;
          month?: string;
        };

        try {
          const result = await MerchantService.getRewardRecords(currentUser.id, page, pageSize, month);
          return paginated(result.data, result.pagination.total, result.pagination.page, result.pagination.pageSize);
        } catch (err: any) {
          console.error('获取奖励记录失败:', err);
          return error('获取奖励记录失败');
        }
      }, {
        query: MerchantModels.Reward.GetRewardRecordsQuery
      })

      // 获取奖励规则
      .get('/rules', async ({ currentUser }) => {
        try {
          const result = await MerchantService.getRewardRules();
          return success(result);
        } catch (err: any) {
          console.error('获取奖励规则失败:', err);
          return error('获取奖励规则失败');
        }
      })

      // 获取销售统计
      .get('/statistics', async ({ query, currentUser }) => {
        const { month } = query as { month?: string };

        try {
          const result = await MerchantService.getSalesStatistics(currentUser.id, month);
          return success(result);
        } catch (err: any) {
          console.error('获取销售统计失败:', err);
          return error('获取销售统计失败');
        }
      })
  )

  // 管理员商户管理
  .group('/admin', (app) => 
    app
      .use(adminAuth)
      // 获取商户列表
      .get('/list', async ({ query }) => {
        const { 
          page = 1, 
          pageSize = 20, 
          status,
          keyword 
        } = query as {
          page?: number;
          pageSize?: number;
          status?: string;
          keyword?: string;
        };

        try {
          const result = await MerchantService.getMerchantList(Number(page), Number(pageSize), status, keyword);
          return paginated(result.data, result.pagination.total, result.pagination.page, result.pagination.pageSize);
        } catch (err: any) {
          console.error('获取商户列表失败:', err);
          return error('获取商户列表失败');
        }
      }, {
        query: MerchantModels.Admin.GetMerchantListQuery
      })

      // 创建商户
      .post('/create', async ({ body, currentUser }) => {
        const { name, contact, phone, bankAccount } = body as {
          name: string;
          contact: string;
          phone: string;
          bankAccount?: string;
        };

        try {
          const result = await MerchantService.createMerchant({ name, contact, phone, bankAccount, adminId: currentUser.id });
          return success(result, '商户创建成功');
        } catch (err: any) {
          console.error('创建商户失败:', err);
          return error('创建商户失败');
        }
      }, {
        body: MerchantModels.Admin.CreateMerchantBody
      })

      // 更新商户
      .put('/:id', async ({ params, body, currentUser }) => {
        const { id } = params as { id: string };
        const { name, contact, phone, bankAccount, status } = body as {
          name?: string;
          contact?: string;
          phone?: string;
          bankAccount?: string;
          status?: string;
        };

        try {
          const result = await MerchantService.updateMerchant(id, { name, contact, phone, bankAccount, status: status as any });
          return success(result, '商户信息更新成功');
        } catch (err: any) {
          console.error('更新商户失败:', err);
          return error('更新商户失败');
        }
      }, {
        // params: MerchantModels.Admin.MerchantParams,
        // body: MerchantModels.Admin.UpdateMerchantBody
      })

      // 禁用/启用商户
      .post('/:id/toggle-status', async ({ params, body, currentUser }) => {
        const { id } = params as { id: string };
        const { status, reason } = body as {
          status: 'ACTIVE' | 'DISABLED';
          reason?: string;
        };

        try {
          const result = await MerchantService.toggleMerchantStatus(id, status, reason);
          return success(result, `商户已${status === 'ACTIVE' ? '启用' : '禁用'}`);
        } catch (err: any) {
          console.error('更新商户状态失败:', err);
          return error('更新商户状态失败');
        }
      }, {
        params: MerchantModels.Admin.MerchantParams,
        body: MerchantModels.Admin.ToggleStatusBody
      })

      // 获取商户详情
      .get('/:id', async ({ params, currentUser }) => {
        const { id } = params as { id: string };

        try {
          const result = await MerchantService.getMerchantDetail(id);
          return success(result);
        } catch (err: any) {
          console.error('获取商户详情失败:', err);
          return error('获取商户详情失败');
        }
      }, {
        params: MerchantModels.Admin.MerchantParams
      })

      // 删除商户
      .delete('/:id', async ({ params, currentUser }) => {
        const { id } = params as { id: string };

        try {
          await MerchantService.deleteMerchant(id);
          return success(null, '商户删除成功');
        } catch (err: any) {
          console.error('删除商户失败:', err);
          return error('删除商户失败');
        }
      }, {
        params: MerchantModels.Admin.MerchantParams
      })
  ); 