import { Elysia } from 'elysia';
import { HealthService } from './service';

export const healthRoutes = new Elysia({ prefix: '/health' })
  .get('/', () => HealthService.getStatus())
  .get('/ping', () => HealthService.ping()); 