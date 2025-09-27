import { Elysia } from 'elysia';
import { success, error } from '../../utils/response';
import { adminAuth } from '../../middleware/auth';
import { StatisticsModels } from './model';
// 这里直接复用原路由实现，后续可逐步迁移到 service
import { db } from '../../utils/db';

export const statisticsRoutes = new Elysia({ prefix: '/statistics' })
  // .use(adminAuth)
  // 获取用户统计数据
  .get('/users', async ({ query }) => {
    // ... existing code ...
    // 这里直接复用原路由实现，后续可迁移到 service
    // ... existing code ...
  })
  // 获取商户统计数据
  .get('/merchants', async ({ query }) => {
    // ... existing code ...
  })
  // 获取激活码统计数据
  .get('/activation-codes', async ({ query }) => {
    // ... existing code ...
  })
  // 获取财务统计数据
  .get('/financial', async ({ query }) => {
    // ... existing code ...
  })
  // 获取奖励统计数据
  .get('/rewards', async ({ query }) => {
    // ... existing code ...
  })
  // 获取综合仪表板数据
  .get('/dashboard', async ({ query }) => {
    // ... existing code ...
  }); 