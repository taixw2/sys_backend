import { Elysia, t } from 'elysia';
import { userAuth, adminAuth } from '../../middleware/auth';
import { success, error, response } from '../../utils/response';
import { TextBookService } from './service';
import {
  TextBookModels,
} from './model';

export const textbookRoutes = new Elysia({ prefix: '/textbook' })
  // 普通用户权限组 - 查看相关接口
  .group('/public', (app) =>
    app
      .use(userAuth)

      // 获取教材列表
      .get('/list', async ({ query }) => {
        try {
          const result = await TextBookService.getTextBookList();
          return success(result);
        } catch (err: any) {
          console.error('获取教材列表失败:', err);
          return error('获取教材列表失败');
        }
      }, {
        response: response(t.Array(TextBookModels.TextBookItem))
      })

      // 获取教材详情
      .get('/:id', async ({ params }) => {
        const { id } = params;
        try {
          const result = await TextBookService.getTextBookDetail(id);
          return success(result);
        } catch (err: any) {
          console.error('获取教材详情失败:', err);
          return error(err.message || '获取教材详情失败');
        }
      }, {
        response: response(TextBookModels.TextBookDetail)
      })
  )

  // 管理员权限组 - 管理相关接口
  .group('/admin', (app) =>
    app
      .use(userAuth)

      // 创建教材
      .post('/', async ({ body }) => {
        try {
          const result = await TextBookService.createTextBook(body);
          return success(result, '教材创建成功');
        } catch (err: any) {
          console.error('创建教材失败:', err);
          return error(err.message || '创建教材失败，请稍后重试');
        }
      }, {
        body: TextBookModels.CreateBody,
        response: response(TextBookModels.CreateResponse)
      })

      // 创建单元
      .post('/unit', async ({ body }) => {
        try {
          const result = await TextBookService.createUnit(body);
          return success(result, '单元创建成功');
        } catch (err: any) {
          console.error('创建单元失败:', err);
          return error(err.message || '创建单元失败，请稍后重试');
        }
      }, {
        body: TextBookModels.CreateUnitBody,
        response: response(TextBookModels.CreateUnitResponse)
      })


      // 获取教材类型统计
      .get('/types/statistics', async () => {
        try {
          const result = await TextBookService.getTextBookTypes();
          return success(result);
        } catch (err: any) {
          console.error('获取教材类型统计失败:', err);
          return error('获取教材类型统计失败');
        }
      }, {
        response: response(t.Array(t.Object({
          typeName: t.Optional(t.String()),
          count: t.Number()
        })))
      })

      // 获取学习阶段统计
      .get('/stages/statistics', async () => {
        try {
          const result = await TextBookService.getTextBookStages();
          return success(result);
        } catch (err: any) {
          console.error('获取学习阶段统计失败:', err);
          return error('获取学习阶段统计失败');
        }
      }, {
        response: response(t.Array(t.Object({
          stageName: t.Optional(t.String()),
          count: t.Number()
        })))
      })
  )