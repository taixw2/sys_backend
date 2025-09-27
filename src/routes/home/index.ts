import { Elysia } from 'elysia';

export const homeRoutes = new Elysia()
  .get('/', () => {
    return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>English Admin API</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .container {
            text-align: center;
            max-width: 800px;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .logo {
            font-size: 3rem;
            margin-bottom: 1rem;
            font-weight: bold;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .title {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            font-weight: 300;
        }
        
        .subtitle {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
            line-height: 1.6;
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        
        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 1.5rem;
            border-radius: 15px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: transform 0.3s ease;
        }
        
        .feature:hover {
            transform: translateY(-5px);
        }
        
        .feature-icon {
            font-size: 2rem;
            margin-bottom: 1rem;
        }
        
        .feature-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .feature-desc {
            font-size: 0.9rem;
            opacity: 0.8;
            line-height: 1.4;
        }
        
        .links {
            margin-top: 2rem;
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .link {
            display: inline-block;
            padding: 12px 24px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            text-decoration: none;
            border-radius: 25px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            transition: all 0.3s ease;
            font-weight: 500;
        }
        
        .link:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .status {
            margin-top: 2rem;
            padding: 1rem;
            background: rgba(76, 175, 80, 0.2);
            border-radius: 10px;
            border: 1px solid rgba(76, 175, 80, 0.3);
        }
        
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            background: #4caf50;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .footer {
            margin-top: 2rem;
            font-size: 0.9rem;
            opacity: 0.7;
        }
        
        @media (max-width: 768px) {
            .container {
                margin: 1rem;
                padding: 1.5rem;
            }
            
            .title {
                font-size: 2rem;
            }
            
            .logo {
                font-size: 2.5rem;
            }
            
            .links {
                flex-direction: column;
                align-items: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🦊</div>
        <h1 class="title">English Admin API</h1>
        <p class="subtitle">
            基于 Bun.js 和 Elysia 构建的高性能英语学习管理平台后端服务
        </p>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">🚀</div>
                <div class="feature-title">高性能</div>
                <div class="feature-desc">基于 Bun.js 运行时，提供极致的性能体验</div>
            </div>
            
            <div class="feature">
                <div class="feature-icon">🔐</div>
                <div class="feature-title">安全可靠</div>
                <div class="feature-desc">JWT 认证，数据加密，保障用户信息安全</div>
            </div>
            
            <div class="feature">
                <div class="feature-icon">📚</div>
                <div class="feature-title">功能丰富</div>
                <div class="feature-desc">用户管理、激活码、商户系统、词典查询等</div>
            </div>
            
            <div class="feature">
                <div class="feature-icon">🎯</div>
                <div class="feature-title">易于使用</div>
                <div class="feature-desc">RESTful API 设计，完整的 Swagger 文档</div>
            </div>
        </div>
        
        <div class="links">
            <a href="/swagger" class="link">📖 API 文档</a>
            <a href="/health" class="link">💚 健康检查</a>
            <a href="/health/ping" class="link">🏓 Ping 测试</a>
        </div>
        
        <div class="status">
            <span class="status-indicator"></span>
            <strong>服务状态：</strong> 运行正常
        </div>
        
        <div class="footer">
            <p>Powered by Bun.js + Elysia + Prisma + MariaDB</p>
            <p>© 2025 English Admin Platform</p>
        </div>
    </div>
</body>
</html>
    `, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  });
