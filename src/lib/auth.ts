import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "../utils/db";
import { admin, captcha, multiSession, phoneNumber } from "better-auth/plugins";
import tencentcloud from "tencentcloud-sdk-nodejs";
import { InternalServerError, NotFoundError, ParseError } from "elysia";

import { openAPI } from 'better-auth/plugins'

const smsClient = tencentcloud.sms.v20210111.Client

const client = new smsClient({

  credential: {
    secretId: process.env.TENCENTCLOUD_SECRET_ID,
    secretKey: process.env.TENCENTCLOUD_SECRET_KEY,
  },
  region: "ap-guangzhou",
  profile: {
    signMethod: "HmacSHA256",
    httpProfile: {
      reqMethod: "POST", // 请求方法
      reqTimeout: 10, // 请求超时时间，默认60s
      endpoint: "sms.tencentcloudapi.com"
    },
  },
})

export const auth = betterAuth({
  trustedOrigins: [
    'http://localhost:8000',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://119.91.193.198:9528',
    'https://srs.sanhe.org.cn',
    'http://srs.sanhe.org.cn',
    'https://srs.threeher.cn'
  ],
  emailAndPassword: {
    enabled: true,
  },
  database: prismaAdapter(db, {
    provider: "mysql",
  }),
  plugins: [
    openAPI(),
    multiSession({
      maximumSessions: 5
    }),
    admin({
      adminRoles: ["admin", "superadmin"],
    }),
    phoneNumber({
      async sendOTP(data) {
        const res = await client.SendSms({
          SmsSdkAppId: "1401042965",
          SignName: "三合软件",
          TemplateId: "736290",
          TemplateParamSet: [data.code, '5'],
          PhoneNumberSet: [data.phoneNumber],
          SessionContext: "",
          ExtendCode: "",
          SenderId: "",
        })

        const sendStatus = res.SendStatusSet?.[0]

        if (sendStatus?.Code !== 'Ok') {
          if (sendStatus?.Code == 'LimitExceeded.PhoneNumberDailyLimit') {
            throw new InternalServerError("今日发送次数过多，请稍后再试")
          }
          if (sendStatus?.Code == 'FailedOperation.InsufficientBalanceInSmsPackage') {
            throw new InternalServerError("发送失败，余额不足")
          }
          if (sendStatus?.Code == 'FailedOperation.InvalidPhoneNumber') {
            throw new InternalServerError("发送失败，手机号格式不正确")
          }
          if (sendStatus?.Code == 'FailedOperation.InvalidTemplateParam') {
            throw new InternalServerError("发送失败，模板参数不正确")
          }
          if (sendStatus?.Code == 'FailedOperation.InvalidTemplateId') {
            throw new InternalServerError("发送失败，模板ID不正确")
          }
          if (sendStatus?.Code == 'FailedOperation.InvalidSignName') {
            throw new InternalServerError("发送失败，签名不正确")
          }
          throw new InternalServerError(`【${sendStatus?.Code}】` + sendStatus?.Message)
        }
      },
      allowedAttempts: 10,
      otpLength: 6,
      signUpOnVerification: {
        getTempEmail(phoneNumber) {
          return `${phoneNumber}@threeher.cn`;
        },
        getTempName(phoneNumber) {
          return phoneNumber;
        }
      },
      async callbackOnVerification(data, request) {
        const memberExpireAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await db.user.update({
          where: { id: data.user.id },
          data: {
            memberExpireAt,
            memberRecords: {
              create: {
                type: 'FIRST_LOGIN',
                duration: 3,
                startDate: new Date(),
                endDate: memberExpireAt,
                reason: '首次登录赠送'
              }
            }
          }
        });
      },
    })
  ]
});

// auth.api.open

let _schema: ReturnType<typeof auth.api.generateOpenAPISchema>
const getSchema = async () => (_schema ??= auth.api.generateOpenAPISchema())

export const OpenAPI = {
  getPaths: (prefix = '/api/auth') =>
    getSchema().then(({ paths }) => {
      const reference: typeof paths = Object.create(null)

      for (const path of Object.keys(paths)) {
        const key = prefix + path
        reference[key] = paths[path]

        for (const method of Object.keys(paths[path])) {
          const operation = (reference[key] as any)[method]

          operation.tags = ['Better Auth']
        }
      }

      return reference
    }) as Promise<any>,
  components: getSchema().then(({ components }) => components) as Promise<any>
} as const