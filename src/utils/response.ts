import { t, TSchema } from "elysia";

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  code: string;
}

export function response<T extends TSchema>(data: T) {
  return t.Object({
    success: t.Boolean({ default: true }),
    data: data,
    message: t.String(),
    code: t.String()
  });
}

/**
 * 成功响应
 */
export function success<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message: message || '操作成功',
    code: '0000'
  };
}

/**
 * 错误响应
 */
export function error(message: string, code?: string): ApiResponse {
  return {
    success: false,
    message,
    data: null,
    code: code || '0001'
  };
}

/**
 * 分页响应
 */
export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): ApiResponse<{
  list: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> {
  return success({
    list: data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  });
} 