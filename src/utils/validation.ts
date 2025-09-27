/**
 * 验证手机号格式
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证验证码格式
 */
export function isValidVerificationCode(code: string): boolean {
  const codeRegex = /^\d{6}$/;
  return codeRegex.test(code);
}

/**
 * 验证激活码格式
 */
export function isValidActivationCode(code: string): boolean {
  const codeRegex = /^[A-Z0-9]{8}$/;
  return codeRegex.test(code);
}

/**
 * 验证分页参数
 */
export function validatePagination(page?: number, pageSize?: number) {
  const validPage = Math.max(1, page || 1);
  const validPageSize = Math.min(100, Math.max(1, pageSize || 10));
  
  return {
    page: validPage,
    pageSize: validPageSize,
    skip: (validPage - 1) * validPageSize,
    take: validPageSize
  };
} 