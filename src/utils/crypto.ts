import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

/**
 * 生成随机字符串
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成激活码
 */
export function generateActivationCode(): string {
  return generateRandomString(8);
}

/**
 * 生成验证码
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 加密手机号（用于显示）
 */
export function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 生成哈希
 */
export function generateHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * 生成商户编号
 */
export function generateMerchantCode(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `M${timestamp}${random}`;
}

/**
 * 密码加密（使用PBKDF2）
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, actualSalt, 10000, 64, 'sha256').toString('hex');
  return { hash, salt: actualSalt };
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: newHash } = hashPassword(password, salt);
  return newHash === hash;
}

/**
 * 生成密码盐
 */
export function generateSalt(): string {
  return randomBytes(16).toString('hex');
} 