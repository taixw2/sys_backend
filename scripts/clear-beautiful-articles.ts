import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

async function clearBeautifulArticles() {
  try {
    console.log('清空情境美文数据...')
    
    const result = await prisma.beautifulArticle.deleteMany({})
    
    console.log(`已删除 ${result.count} 条记录`)
    
  } catch (error) {
    console.error('清空数据失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearBeautifulArticles()
