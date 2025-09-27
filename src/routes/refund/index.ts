import { Elysia } from 'elysia';
import { success, error, paginated } from '../../utils/response';
import { merchantAuth, adminAuth } from '../../middleware/auth';
import { RefundService } from './service';
import { RefundModels } from './model';

export const refundRoutes = new Elysia({ prefix: '/refund' })
  // 商户退款管理
  .group('/merchant', (app) => 
    app
      .use(merchantAuth)
      // 回收激活码（退款处理）
      .post('/recycle-codes', async ({ body, currentUser }) => {
        const { codes, reason } = body as { codes: string[]; reason?: string };
        if (!codes || codes.length === 0) {
          return error('请选择要回收的激活码');
        }
        try {
          const result = await RefundService.recycleCodes(currentUser.id, codes, reason);
          return success({
            recycledCount: result.recycledCodes.length,
            recycledCodes: result.recycledCodes,
            memberAdjustments: result.memberAdjustments,
            reason
          }, `成功回收${result.recycledCodes.length}个激活码`);
        } catch (err: any) {
          console.error('回收激活码失败:', err);
          return error(err.message || '回收激活码失败');
        }
      }, {
        body: RefundModels.RecycleCodesBody
      })

      // 获取可回收的激活码列表
      .get('/recyclable-codes', async ({ query, currentUser }) => {
        const { page = 1, pageSize = 20, duration, keyword } = query as {
          page?: number;
          pageSize?: number;
          duration?: string;
          keyword?: string;
        };
        try {
          const result = await RefundService.getRecyclableCodes(currentUser.id, page, pageSize, duration, keyword);
          return paginated(result.data, result.total, page, pageSize);
        } catch (err: any) {
          console.error('获取可回收激活码列表失败:', err);
          return error('获取可回收激活码列表失败');
        }
      }, {
        query: RefundModels.RecyclableCodesQuery
      })

      // 获取回收记录
      .get('/recycle-records', async ({ query, currentUser }) => {
        const { page = 1, pageSize = 20 } = query as { page?: number; pageSize?: number };
        try {
          const result = await RefundService.getRecycleRecords(page, pageSize);
          return paginated(result.data, result.total, page, pageSize);
        } catch (err: any) {
          console.error('获取回收记录失败:', err);
          return error('获取回收记录失败');
        }
      }, {
        query: RefundModels.RecycleRecordsQuery
      })
  )

  // 管理员退款管理
  .group('/admin', (app) => 
    app
      .use(adminAuth)
      // 获取所有回收记录
      .get('/recycle-records', async ({ query }) => {
        const { page = 1, pageSize = 20 } = query as { page?: number; pageSize?: number };
        try {
          const result = await RefundService.getAllRecycleRecords(page, pageSize);
          return paginated(result.data, result.total, page, pageSize);
        } catch (err: any) {
          console.error('获取回收记录失败:', err);
          return error('获取回收记录失败');
        }
      }, {
        query: RefundModels.RecycleRecordsQuery
      })

      // 重新分配回收的激活码
      .post('/reassign-codes', async ({ body, currentUser }) => {
        const { codeIds, merchantId } = body as { codeIds: string[]; merchantId: string };
        try {
          const result = await RefundService.reassignCodes(codeIds, merchantId);
          return success(result, `成功重新分配${result.reassigned}个激活码给商户${result.merchantName}`);
        } catch (err: any) {
          console.error('重新分配激活码失败:', err);
          return error('重新分配激活码失败');
        }
      }, {
        body: RefundModels.ReassignCodesBody
      })

      // 获取退款统计
      .get('/statistics', async ({ query }) => {
        const { startDate, endDate } = query as { startDate?: string; endDate?: string };
        try {
          const result = await RefundService.getRefundStatistics(startDate, endDate);
          return success(result);
        } catch (err: any) {
          console.error('获取退款统计失败:', err);
          return error('获取退款统计失败');
        }
      }, {
        query: RefundModels.RefundStatisticsQuery
      })
  ); 