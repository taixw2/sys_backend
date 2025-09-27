export class HealthService {
  static getStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  static ping() {
    return 'pong';
  }
} 