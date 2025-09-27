import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { jwt } from '@elysiajs/jwt';
import { staticPlugin } from '@elysiajs/static';

import { homeRoutes } from './routes/home/index';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { healthRoutes } from './routes/health';
import { activationRoutes } from './routes/activation/index';
import { merchantRoutes } from './routes/merchant/index';
import { refundRoutes } from './routes/refund/index';
import { adminRoutes } from './routes/admin/index';
import { notificationRoutes } from './routes/notification';
import { statisticsRoutes } from './routes/statistics/index';
import { dictionaryRoutes } from './routes/dictionary/index';
import { ttsRoutes } from './routes/tts/index';
import { beautifulArticleRoutes } from './routes/beautiful-article/index';
import { textbookRoutes } from './routes/textbook/index';
import { openapi } from '@elysiajs/openapi'
import { logger } from '@bogeychan/elysia-logger';
import { wlogger } from './utils/plogger';
import { auth, OpenAPI } from './lib/auth';


const app = new Elysia()
  .use(cors({
    origin: [
      'http://localhost:8000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://119.91.193.198:9528',
      'http://localhost:9528',
      'https://srs.sanhe.org.cn',
      'http://srs.sanhe.org.cn',
      'https://srs.threeher.cn'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  }))
  .use(
    wlogger
  )
  // .use(swagger({
  //   documentation: {
  //     info: {
  //       title: 'English Admin API',
  //       version: '1.0.0',
  //       description: 'English Admin Backend API with Elysia',
  //     },
  //     tags: [
  //       { name: 'auth', description: 'Authentication endpoints (验证码/密码登录和商户注册)' },
  //       { name: 'users', description: 'User management endpoints' },
  //       { name: 'activation', description: 'Activation code endpoints' },
  //       { name: 'merchant', description: 'Merchant management endpoints' },
  //       { name: 'refund', description: 'Refund management endpoints' },
  //       { name: 'admin', description: 'Admin management endpoints' },
  //       { name: 'notification', description: 'Notification management endpoints' },
  //       { name: 'statistics', description: 'Statistics and reporting endpoints' },
  //       { name: 'dictionary', description: 'Dictionary and word lookup endpoints' },
  //       { name: 'tts', description: 'Text-to-speech endpoints' },
  //       { name: 'health', description: 'Health check endpoints' },
  //       { name: 'textbook', description: 'TextBook management endpoints' },
  //     ],
  //   },
  // }))
  .use(openapi({
    documentation: {
      components: await OpenAPI.components,
      paths: await OpenAPI.getPaths()
    }
  }))
  .use(staticPlugin({
    assets: 'public/dist',
    prefix: '/',
  }))

  // .use(homeRoutes)
  // .use(healthRoutes)
  .use(authRoutes)
  // .use(userRoutes)
  // .use(activationRoutes)
  // .use(merchantRoutes)
  // .use(refundRoutes)
  // .use(adminRoutes)
  // .use(notificationRoutes)
  // .use(statisticsRoutes)
  // .use(dictionaryRoutes)
  // .use(ttsRoutes)
  // .use(beautifulArticleRoutes)
  // .use(textbookRoutes)
  .mount(auth.handler)
  .onError(({ error, code }) => {
    if (code === 'VALIDATION') return error.detail(error.message)
    if (code === 'INTERNAL_SERVER_ERROR') return { "type": "INTERNAL_SERVER_ERROR", "message": error.message }
    if (code === 'UNKNOWN') return { "type": "UNKNOWN", "message": error.message }
  })
  .listen(process.env.PORT || 3001);

console.log(
  `🦊 English Admin Backend is running at ${app.server?.hostname}:${app.server?.port}`
);
console.log(`📚 Swagger documentation: http://localhost:${app.server?.port}/swagger`);

export type App = typeof app; 