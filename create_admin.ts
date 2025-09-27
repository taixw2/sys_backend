import { db } from './src/utils/db';
import { hashPassword } from './src/utils/crypto';
import { AdminRole } from './generated/prisma';

async function createSuperAdmin() {
  console.log('开始创建超级管理员账号...');
  
  const phone = '13800138001'; // 超级管理员手机号
  const password = 'admin123456'; // 默认密码
  const name = 'Super Admin';
  
  try {
    // 检查是否已存在该手机号的账号
    const existingAdmin = await db.admin.findUnique({
      where: { phone }
    });
    
    if (existingAdmin) {
      console.log(`账号 ${phone} 已存在，ID: ${existingAdmin.id}`);
      return;
    }
    
    // 加密密码
    const { hash, salt } = hashPassword(password);
    
    // 创建超级管理员账号
    const superAdmin = await db.admin.create({
      data: {
        phone,
        name,
        passwordHash: hash,
        passwordSalt: salt,
        role: AdminRole.SUPER_ADMIN, // 设置为超级管理员
        isActive: true
      }
    });
    
    console.log('超级管理员账号创建成功!');
    console.log(`ID: ${superAdmin.id}`);
    console.log(`手机号: ${superAdmin.phone}`);
    console.log(`姓名: ${superAdmin.name}`);
    console.log(`角色: ${superAdmin.role}`);
    console.log(`密码: ${password} (请登录后立即修改)`);
    
  } catch (error) {
    console.error('创建超级管理员账号失败:', error);
  } finally {
    await db.$disconnect();
  }
}

// 执行创建函数
createSuperAdmin();