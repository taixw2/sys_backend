import { t } from 'elysia';

// 验证码类型枚举
export const VerificationCodeType = {
  LOGIN: 'LOGIN',
  REGISTER: 'REGISTER',
  RESET: 'RESET'
} as const;

export type VerificationCodeTypeType = typeof VerificationCodeType[keyof typeof VerificationCodeType];

// 用户类型枚举
export const UserType = {
  USER: 'user',
  MERCHANT: 'merchant',
  ADMIN: 'admin'
} as const;

export type UserTypeType = typeof UserType[keyof typeof UserType];

// 登录状态枚举
export const LoginStatus = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
} as const;

export type LoginStatusType = typeof LoginStatus[keyof typeof LoginStatus];

// 图片验证码相关模型
export const CaptchaModels = {
  // 图片验证码信息
  CaptchaInfo: t.Object({
    id: t.String(),
    image: t.String()
  }),

  // 验证图片验证码请求
  CaptchaVerifyBody: t.Object({
    id: t.String({
      minLength: 1,
      error: '验证码ID不能为空'
    }),
    code: t.String({
      minLength: 4,
      maxLength: 6,
      error: '验证码格式不正确'
    })
  }),

  // 验证图片验证码响应
  CaptchaVerifyResponse: t.Object({
    valid: t.Boolean()
  })
};

// 发送验证码相关模型
export const SendCodeModels = {
  // 发送验证码请求
  SendCodeBody: t.Object({
    phone: t.String({
      minLength: 11,
      maxLength: 11,
      error: '手机号格式不正确'
    })
  }),

  // 发送验证码响应
  SendCodeResponse: t.Object({
    success: t.Boolean(),
    message: t.String()
  })
};

// 用户登录相关模型
export const UserLoginModels = {
  // 用户登录请求
  UserLoginBody: t.Object({
    phone: t.String({
      minLength: 11,
      maxLength: 11,
      error: '手机号格式不正确'
    }),
    deviceId: t.String({
      minLength: 1,
      error: '设备ID不能为空'
    }),
    code: t.String({
      minLength: 4,
      maxLength: 6,
      error: '验证码格式不正确'
    })
  }),

  // 用户信息
  UserInfo: t.Object({
    id: t.String(),
    phone: t.String(),
    memberExpireAt: t.Optional(t.Date()),
    isActive: t.Boolean()
  }),

  // 用户登录响应
  UserLoginResponse: t.Object({
    token: t.String(),
    user: t.Object({
      id: t.String(),
      phone: t.String(),
      memberExpireAt: t.Optional(t.Date()),
      isActive: t.Boolean()
    })
  })
};

// 商户登录相关模型
export const MerchantLoginModels = {
  // 商户登录请求（验证码）
  MerchantLoginBody: t.Object({
    phone: t.String({
      minLength: 11,
      maxLength: 11,
      error: '手机号格式不正确'
    }),
    code: t.String({
      minLength: 4,
      maxLength: 6,
      error: '验证码格式不正确'
    })
  }),

  // 商户登录请求（密码）
  MerchantPasswordLoginBody: t.Object({
    phone: t.String({
      minLength: 11,
      maxLength: 11,
      error: '手机号格式不正确'
    }),
    password: t.String({
      minLength: 6,
      maxLength: 20,
      error: '密码长度应在6-20位之间'
    })
  }),

  // 商户注册请求
  MerchantRegisterBody: t.Object({
    email: t.String({
      format: 'email'
    }),
    password: t.String({
      minLength: 8,
      maxLength: 20,
      error: '密码长度应在6-20位之间'
    }),
    name: t.String({
      minLength: 2,
      maxLength: 50,
      error: '商户名称长度应在2-50位之间'
    }),
    contact: t.String({
      format: "regex",
      pattern: "^1[3-9]\\d{9}$",
      error: '联系方式'
    }),
  }),

  // 商户信息
  MerchantInfo: t.Object({
    id: t.String(),
    name: t.String(),
    code: t.String(),
    phone: t.String(),
    status: t.String()
  }),

  // 商户登录响应
  MerchantLoginResponse: t.Object({
    token: t.String(),
    merchant: t.Object({
      id: t.String(),
      name: t.String(),
      code: t.String(),
      phone: t.String(),
      status: t.String()
    })
  }),

  // 商户注册响应
  MerchantRegisterResponse: t.Object({
    token: t.String(),
    merchant: t.Object({
      id: t.String(),
      name: t.String(),
      code: t.String(),
      phone: t.String(),
      status: t.String()
    })
  })
};

// 管理员登录相关模型
export const AdminLoginModels = {
  // 管理员登录请求（验证码）
  AdminLoginBody: t.Object({
    phone: t.String({
      minLength: 11,
      maxLength: 11,
      error: '手机号格式不正确'
    }),
    code: t.String({
      minLength: 4,
      maxLength: 6,
      error: '验证码格式不正确'
    })
  }),

  // 管理员登录请求（密码）
  AdminPasswordLoginBody: t.Object({
    email: t.String({
      format: 'email'
    }),
    password: t.String({
      minLength: 8,
      maxLength: 20,
      error: '密码长度应在6-20位之间'
    }),
  }),

  // 管理员信息
  AdminInfo: t.Object({
    id: t.String(),
    name: t.String(),
    phone: t.String(),
    role: t.String(),
    isActive: t.Boolean()
  }),

  // 管理员登录响应
  AdminLoginResponse: t.Object({
    token: t.String(),
    admin: t.Object({
      id: t.String(),
      name: t.String(),
      phone: t.String(),
      role: t.String(),
      isActive: t.Boolean()
    })
  })
};

// 导出所有模型
export const AuthModels = {
  SendCode: SendCodeModels,
  UserLogin: UserLoginModels,
  MerchantLogin: MerchantLoginModels,
  AdminLogin: AdminLoginModels,
  Captcha: CaptchaModels
}; 