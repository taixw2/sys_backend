import { Elysia } from 'elysia';
import { userAuth, merchantAuth, adminAuth } from '../../middleware/auth';
import { success, error, paginated, response } from '../../utils/response';
import { ActivationService } from './service';
import { 
  UserActivationModels, 
  MerchantActivationModels, 
  AdminActivationModels,
  PaginatedResponse 
} from './model';

export const activationRoutes = new Elysia({ prefix: '/activation' })
  // 用户激活码相关
  .group('/user', (app) =>
    app
      .use(userAuth)
      // 用户激活码
      .post('/activate',
        async ({ body, currentUser }) => {
          try {
            const result = await ActivationService.activateCode(currentUser.id, body.code);
            return success(result, `激活成功，会员有效期至${result.memberExpireAt.toLocaleDateString()}`);
          } catch (err: any) {
            console.error('激活码激活失败:', err);
            return error(err.message || '激活失败，请稍后重试');
          }
        }, {
        body: UserActivationModels.ActivateBody,
        response: response(UserActivationModels.ActivateResponse)
      })

      // 获取用户激活记录
      .get('/records', async ({ query, currentUser }) => {
        const { page = 1, pageSize = 10 } = query as { page?: number; pageSize?: number };

        try {
          const result = await ActivationService.getUserActivationRecords(
            currentUser.id, 
            page, 
            pageSize
          );
          return paginated(result.data, result.pagination.total, result.pagination.page, result.pagination.pageSize);
        } catch (err: any) {
          console.error('获取激活记录失败:', err);
          return error('获取激活记录失败');
        }
      }, {
        query: UserActivationModels.GetRecordsQuery,
        response: response(PaginatedResponse(UserActivationModels.ActivationRecordItem))
      })
  )

  // 商户激活码相关
  .group('/merchant', (app) =>
    app
      .use(merchantAuth)
      // 获取激活码库存
      .get('/inventory', async ({ query, currentUser }) => {
        const { status, duration, page = 1, pageSize = 20 } = query as {
          status?: string;
          duration?: string;
          page?: number;
          pageSize?: number;
        };

        try {
          const result = await ActivationService.getMerchantInventory(
            currentUser.id,
            page,
            pageSize,
            status,
            duration
          );
          return paginated(result.data, result.pagination.total, result.pagination.page, result.pagination.pageSize);
        } catch (err: any) {
          console.error('获取激活码库存失败:', err);
          return error('获取激活码库存失败');
        }
      }, {
        query: MerchantActivationModels.GetInventoryQuery,
        response: response(PaginatedResponse(MerchantActivationModels.InventoryItem))
      })

      // 获取激活码统计
      .get('/statistics', async ({ query, currentUser }) => {
        const { timeRange = 'month' } = query as { timeRange?: string };

        try {
          const result = await ActivationService.getMerchantStatistics(currentUser.id, timeRange as any);
          return success(result);
        } catch (err: any) {
          console.error('获取激活码统计失败:', err);
          return error('获取激活码统计失败');
        }
      }, {
        query: MerchantActivationModels.GetStatisticsQuery,
        response: response(MerchantActivationModels.StatisticsResponse)
      })
  )

  // 管理员激活码相关
  .group('/admin', (app) =>
    app
      .use(adminAuth)
      // 批量生成激活码
      .post('/generate', async ({ body, currentUser }) => {
        const { duration, quantity, merchantId, expiresAt } = body as {
          duration: string;
          quantity: number;
          merchantId?: string;
          expiresAt?: string;
        };


        try {
          const result = await ActivationService.generateActivationCodes(
            duration as any,
            quantity,
            merchantId,
            expiresAt
          );
          return success(result, `成功生成${quantity}个激活码`);
        } catch (err: any) {
          console.error('生成激活码失败:', err);
          return error('生成激活码失败');
        }
      }, {
        body: AdminActivationModels.GenerateBody,
        response: response(AdminActivationModels.GenerateResponse)
      })

      // 分配激活码给商户
      .post('/assign', async ({ body, currentUser }) => {
        const { codeIds, merchantId } = body as {
          codeIds: string[];
          merchantId: string;
        };

        try {
          const result = await ActivationService.assignActivationCodes(codeIds, merchantId);
          return success(result, `成功分配${result.assigned}个激活码给商户${result.merchantName}`);
        } catch (err: any) {
          console.error('分配激活码失败:', err);
          return error('分配激活码失败');
        }
      }, {
        body: AdminActivationModels.AssignBody,
        response: response(AdminActivationModels.AssignResponse)
      })

      // 回收激活码
      .post('/recycle', async ({ body, currentUser }) => {
        const { codeIds, reason } = body as {
          codeIds: string[];
          reason?: string;
        };

        try {
          const result = await ActivationService.recycleActivationCodes(codeIds, reason);
          return success(result, `成功回收${result.recycled}个激活码`);
        } catch (err: any) {
          console.error('回收激活码失败:', err);
          return error('回收激活码失败');
        }
      }, {
        body: AdminActivationModels.RecycleBody,
        response: response(AdminActivationModels.RecycleResponse)
      })

      // 获取激活码列表
      .get('/list', async ({ query }) => {
        const {
          status,
          duration,
          merchantId,
          page = 1,
          pageSize = 20
        } = query as {
          status?: string;
          duration?: string;
          merchantId?: string;
          page?: number;
          pageSize?: number;
        };

        try {
          const result = await ActivationService.getActivationCodeList(
            page,
            pageSize,
            status,
            duration,
            merchantId
          );
          return paginated(result.data, result.pagination.total, result.pagination.page, result.pagination.pageSize);
        } catch (err: any) {
          console.error('获取激活码列表失败:', err);
          return error('获取激活码列表失败');
        }
      }, {
        // query: AdminActivationModels.GetListQuery,
        // response: response(PaginatedResponse(AdminActivationModels.ActivationCodeItem))
      })
  ); 