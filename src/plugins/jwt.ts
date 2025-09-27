import jwt from "jsonwebtoken";

export interface JwtPayload {
  id: string;
  type: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  phone: string;
  iat?: number;
  exp?: number;
}

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7天过期

// JWT工具函数
export const JwtUtils = {
  /**
   * 生成JWT令牌
   */
  generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });
  },

  /**
   * 验证JWT令牌
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      return decoded;
    } catch (error) {
      console.error('JWT验证失败:', error);
      return null;
    }
  },

  /**
   * 解码JWT令牌（不验证签名）
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      return decoded;
    } catch (error) {
      console.error('JWT解码失败:', error);
      return null;
    }
  },

  /**
   * 检查令牌是否即将过期（提前1天）
   */
  isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (!decoded || !decoded.exp) return true;
      
      const now = Math.floor(Date.now() / 1000);
      const oneDayInSeconds = 24 * 60 * 60;
      
      return decoded.exp - now < oneDayInSeconds;
    } catch {
      return true;
    }
  }
};