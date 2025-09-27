import crypto from 'crypto'
import { db } from './db'

// 设备限制配置
export const DEVICE_LIMIT = 5

/**
 * 生成设备指纹
 * @param userAgent 用户代理字符串
 * @param ip IP地址
 * @returns 设备唯一标识
 */
export function generateDeviceId(userAgent?: string, ip?: string): string {
  const data = `${userAgent || 'unknown'}-${ip || 'unknown'}`
  return crypto.createHash('md5').update(data).digest('hex').substring(0, 16)
}

/**
 * 解析设备信息
 * @param userAgent 用户代理字符串
 * @returns 设备信息对象
 */
export function parseDeviceInfo(userAgent?: string) {
  if (!userAgent) {
    return {
      deviceName: '未知设备',
      deviceType: 'unknown'
    }
  }

  let deviceName = '未知设备'
  let deviceType = 'unknown'

  // 检测移动设备
  if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    deviceType = 'mobile'
    
    if (/iPhone/i.test(userAgent)) {
      deviceName = 'iPhone'
    } else if (/iPad/i.test(userAgent)) {
      deviceName = 'iPad'
    } else if (/Android/i.test(userAgent)) {
      deviceName = 'Android设备'
    }
  } else {
    deviceType = 'desktop'
    
    if (/Chrome/i.test(userAgent)) {
      deviceName = 'Chrome浏览器'
    } else if (/Firefox/i.test(userAgent)) {
      deviceName = 'Firefox浏览器'
    } else if (/Safari/i.test(userAgent)) {
      deviceName = 'Safari浏览器'
    } else if (/Edge/i.test(userAgent)) {
      deviceName = 'Edge浏览器'
    }
  }

  return { deviceName, deviceType }
}

/**
 * 检查用户设备数量是否超限
 * @param userId 用户ID
 * @returns 是否超限
 */
export async function checkDeviceLimit(userId: string): Promise<boolean> {
  const activeDeviceCount = await db.userDevice.count({
    where: {
      userId,
      isActive: true
    }
  })
  
  return activeDeviceCount >= DEVICE_LIMIT
}

/**
 * 注册或更新用户设备
 * @param userId 用户ID
 * @param deviceId 设备ID
 * @param deviceName 设备名称
 * @param deviceType 设备类型
 * @param userAgent 用户代理
 * @param ip IP地址
 * @returns 设备记录
 */
export async function registerOrUpdateDevice(
  userId: string,
  deviceId: string,
  deviceName: string,
  deviceType: string,
  userAgent?: string,
  ip?: string
) {
  // 检查设备是否已存在
  const existingDevice = await db.userDevice.findUnique({
    where: {
      userId_deviceId: {
        userId,
        deviceId
      }
    }
  })

  if (existingDevice) {
    // 更新现有设备的最后登录时间
    return await db.userDevice.update({
      where: {
        id: existingDevice.id
      },
      data: {
        lastLoginAt: new Date(),
        ip,
        isActive: true
      }
    })
  }

  // 检查是否超过设备限制
  const isOverLimit = await checkDeviceLimit(userId)
  
  if (isOverLimit) {
    // 如果超限，找到最久未使用的设备并将其标记为非激活状态
    const oldestDevice = await db.userDevice.findFirst({
      where: {
        userId,
        isActive: true
      },
      orderBy: {
        lastLoginAt: 'asc'
      }
    })

    if (oldestDevice) {
      await db.userDevice.update({
        where: {
          id: oldestDevice.id
        },
        data: {
          isActive: false
        }
      })
    }
  }

  // 创建新设备记录
  return await db.userDevice.create({
    data: {
      userId,
      deviceId,
      deviceName,
      deviceType,
      userAgent,
      ip,
      isActive: true,
      lastLoginAt: new Date()
    }
  })
}

/**
 * 踢出指定设备
 * @param userId 用户ID
 * @param deviceId 设备ID
 */
export async function kickoutDevice(userId: string, deviceId: string) {
  await db.userDevice.updateMany({
    where: {
      userId,
      deviceId,
      isActive: true
    },
    data: {
      isActive: false
    }
  })
}

/**
 * 获取用户活跃设备列表
 * @param userId 用户ID
 * @returns 设备列表
 */
export async function getUserActiveDevices(userId: string) {
  return await db.userDevice.findMany({
    where: {
      userId,
      isActive: true
    },
    orderBy: {
      lastLoginAt: 'desc'
    }
  })
} 