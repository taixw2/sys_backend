import { PrismaClient } from '../generated/prisma'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// 句子类型枚举
enum SentenceType {
  IMAGE = 'image',
  VIDEO = 'video',
  VOICE = 'voice',
  TEXT = 'text'
}

// 句子结构接口
interface Sentence {
  content?: string
  translation?: string
  media_url?: string
  type: SentenceType
}

// 情境美文数据接口
interface BeautifulArticleData {
  local_book_id: string
  book_name: string
  unit_id: string
  title: string
  sentences: Sentence[]
  image?: string
}

// 解析 CSV 行的函数
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 处理双引号转义
        current += '"'
        i++ // 跳过下一个引号
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}

// 从 CSV 文件导入
async function importFromCSV(csvPath: string) {
  try {
    console.log(`开始从 CSV 文件导入情境美文: ${csvPath}`)
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV 文件不存在: ${csvPath}`)
    }
    
    const fileContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = fileContent.split('\n')
    
    // 跳过标题行
    const dataLines = lines.slice(1)
    
    console.log(`总共需要导入 ${dataLines.length} 条记录`)
    
    let processed = 0
    let skipped = 0
    let errors = 0
    
    for (const line of dataLines) {
      if (!line.trim()) continue
      
      const fields = parseCSVLine(line)
      
      // CSV 格式: local_book_id,book_name,unit_id,title,sentences_json,image
      if (fields.length < 5) {
        console.log(`跳过格式不正确的行: ${line}`)
        errors++
        continue
      }
      
      const [
        localBookId,
        bookName,
        unitId,
        title,
        sentencesJson,
        image
      ] = fields
      
      // 跳过空数据
      if (!localBookId || !bookName || !unitId || !title || !sentencesJson) {
        console.log(`跳过数据不完整的行: ${line}`)
        errors++
        continue
      }
      
      try {
        // 解析句子 JSON
        let sentences: Sentence[] = []
        try {
          sentences = JSON.parse(sentencesJson) as Sentence[]
        } catch (parseError) {
          console.log(`解析句子 JSON 失败: ${sentencesJson}`)
          errors++
          continue
        }
        
        // 验证句子格式
        if (!Array.isArray(sentences) || sentences.length === 0) {
          console.log(`句子数据格式不正确: ${sentencesJson}`)
          errors++
          continue
        }
        
        // 检查是否已存在
        const existing = await prisma.beautifulArticle.findFirst({
          where: {
            localBookId: localBookId.trim(),
            unitId: unitId.trim(),
            title: title.trim()
          }
        })
        
        if (existing) {
          console.log(`跳过重复记录: ${title}`)
          skipped++
          continue
        }
        
        // 创建记录
        await prisma.beautifulArticle.create({
          data: {
            localBookId: localBookId.trim(),
            bookName: bookName.trim(),
            unitId: unitId.trim(),
            title: title.trim(),
            sentences: sentences, // Prisma 会自动序列化 JSON
            image: image ? image.trim() : null
          }
        })
        
        processed++
        
        if (processed % 10 === 0) {
          console.log(`已处理 ${processed} 条记录...`)
        }
        
      } catch (error) {
        console.error(`处理记录失败: ${line}`, error)
        errors++
      }
    }
    
    console.log(`CSV 导入完成！`)
    console.log(`- 成功导入: ${processed} 条记录`)
    console.log(`- 跳过重复: ${skipped} 条记录`)
    console.log(`- 错误记录: ${errors} 条记录`)
    
  } catch (error) {
    console.error('CSV 导入过程中出现错误:', error)
    throw error
  }
}

// 从 JSON 文件导入
async function importFromJSON(jsonPath: string) {
  try {
    console.log(`开始从 JSON 文件导入情境美文: ${jsonPath}`)
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON 文件不存在: ${jsonPath}`)
    }
    
    const fileContent = fs.readFileSync(jsonPath, 'utf-8')
    const articles: BeautifulArticleData[] = JSON.parse(fileContent)
    
    if (!Array.isArray(articles)) {
      throw new Error('JSON 文件格式不正确，应该是一个数组')
    }
    
    console.log(`总共需要导入 ${articles.length} 条记录`)
    
    let processed = 0
    let skipped = 0
    let errors = 0
    
    for (const article of articles) {
      try {
        // 验证必需字段
        if (!article.local_book_id || !article.book_name || !article.unit_id || !article.title || !article.sentences) {
          console.log(`跳过数据不完整的记录: ${article.title || '未知标题'}`)
          errors++
          continue
        }
        
        // 验证句子格式
        if (!Array.isArray(article.sentences) || article.sentences.length === 0) {
          console.log(`句子数据格式不正确: ${article.title}`)
          errors++
          continue
        }
        
        // 检查是否已存在
        const existing = await prisma.beautifulArticle.findFirst({
          where: {
            localBookId: article.local_book_id,
            unitId: article.unit_id,
            title: article.title
          }
        })
        
        if (existing) {
          console.log(`跳过重复记录: ${article.title}`)
          skipped++
          continue
        }
        
        // 创建记录
        await prisma.beautifulArticle.create({
          data: {
            localBookId: article.local_book_id,
            bookName: article.book_name,
            unitId: article.unit_id,
            title: article.title,
            sentences: article.sentences, // Prisma 会自动序列化 JSON
            image: article.image || null
          }
        })
        
        processed++
        
        if (processed % 10 === 0) {
          console.log(`已处理 ${processed} 条记录...`)
        }
        
      } catch (error) {
        console.error(`处理记录失败: ${article.title}`, error)
        errors++
      }
    }
    
    console.log(`JSON 导入完成！`)
    console.log(`- 成功导入: ${processed} 条记录`)
    console.log(`- 跳过重复: ${skipped} 条记录`)
    console.log(`- 错误记录: ${errors} 条记录`)
    
  } catch (error) {
    console.error('JSON 导入过程中出现错误:', error)
    throw error
  }
}

// 创建示例数据
async function createSampleData() {
  try {
    console.log('创建示例情境美文数据...')
    
    const sampleArticles: BeautifulArticleData[] = [
      {
        local_book_id: 'book_001',
        book_name: '新概念英语第一册',
        unit_id: 'unit_001',
        title: 'A Private Conversation',
        sentences: [
          {
            content: 'Last week I went to the theatre.',
            translation: '上周我去看戏。',
            type: SentenceType.TEXT
          },
          {
            content: 'I had a very good seat.',
            translation: '我的座位很好。',
            type: SentenceType.TEXT
          },
          {
            content: 'The play was very interesting.',
            translation: '戏很有趣。',
            type: SentenceType.TEXT
          },
          {
            content: 'I did not enjoy it.',
            translation: '但我并不欣赏。',
            type: SentenceType.TEXT
          },
          {
            content: 'A young man and a young woman were sitting behind me.',
            translation: '一个青年男子和一个青年女子坐在我的身后。',
            type: SentenceType.TEXT
          }
        ],
        image: 'https://example.com/images/theatre.jpg'
      },
      {
        local_book_id: 'book_001',
        book_name: '新概念英语第一册',
        unit_id: 'unit_002',
        title: 'Breakfast or Lunch?',
        sentences: [
          {
            content: 'It was Sunday.',
            translation: '那是个星期天。',
            type: SentenceType.TEXT
          },
          {
            content: 'I never get up early on Sundays.',
            translation: '在星期天我是从来不早起的。',
            type: SentenceType.TEXT
          },
          {
            content: 'I sometimes stay in bed until lunch time.',
            translation: '有时我要一直躺到吃午饭的时候。',
            type: SentenceType.TEXT
          },
          {
            content: 'Last Sunday I got up very late.',
            translation: '上个星期天，我起得很晚。',
            type: SentenceType.TEXT
          },
          {
            content: 'I looked out of the window.',
            translation: '我望望窗外。',
            type: SentenceType.TEXT
          }
        ],
        image: 'https://example.com/images/sunday.jpg'
      }
    ]
    
    let processed = 0
    let skipped = 0
    
    for (const article of sampleArticles) {
      try {
        // 检查是否已存在
        const existing = await prisma.beautifulArticle.findFirst({
          where: {
            localBookId: article.local_book_id,
            unitId: article.unit_id,
            title: article.title
          }
        })
        
        if (existing) {
          console.log(`跳过重复记录: ${article.title}`)
          skipped++
          continue
        }
        
        // 创建记录
        await prisma.beautifulArticle.create({
          data: {
            localBookId: article.local_book_id,
            bookName: article.book_name,
            unitId: article.unit_id,
            title: article.title,
            sentences: article.sentences, // Prisma 会自动序列化 JSON
            image: article.image || null
          }
        })
        
        processed++
        console.log(`创建示例数据: ${article.title}`)
        
      } catch (error) {
        console.error(`创建示例数据失败: ${article.title}`, error)
      }
    }
    
    console.log(`示例数据创建完成！`)
    console.log(`- 成功创建: ${processed} 条记录`)
    console.log(`- 跳过重复: ${skipped} 条记录`)
    
  } catch (error) {
    console.error('创建示例数据过程中出现错误:', error)
    throw error
  }
}

// 主函数
async function main() {
  try {
    const args = process.argv.slice(2)
    const command = args[0]
    
    switch (command) {
      case 'csv':
        const csvPath = args[1]
        if (!csvPath) {
          console.error('请提供 CSV 文件路径')
          console.log('用法: bun run import-beautiful-articles.ts csv <csv_file_path>')
          process.exit(1)
        }
        await importFromCSV(csvPath)
        break
        
      case 'json':
        const jsonPath = args[1]
        if (!jsonPath) {
          console.error('请提供 JSON 文件路径')
          console.log('用法: bun run import-beautiful-articles.ts json <json_file_path>')
          process.exit(1)
        }
        await importFromJSON(jsonPath)
        break
        
      case 'sample':
        await createSampleData()
        break
        
      default:
        console.log('情境美文导入脚本')
        console.log('')
        console.log('用法:')
        console.log('  bun run import-beautiful-articles.ts csv <csv_file_path>   - 从 CSV 文件导入')
        console.log('  bun run import-beautiful-articles.ts json <json_file_path> - 从 JSON 文件导入')
        console.log('  bun run import-beautiful-articles.ts sample               - 创建示例数据')
        console.log('')
        console.log('CSV 格式:')
        console.log('  local_book_id,book_name,unit_id,title,sentences_json,image')
        console.log('')
        console.log('JSON 格式:')
        console.log('  [')
        console.log('    {')
        console.log('      "local_book_id": "book_001",')
        console.log('      "book_name": "新概念英语第一册",')
        console.log('      "unit_id": "unit_001",')
        console.log('      "title": "A Private Conversation",')
        console.log('      "sentences": [')
        console.log('        {')
        console.log('          "content": "Last week I went to the theatre.",')
        console.log('          "translation": "上周我去看戏。",')
        console.log('          "type": "text"')
        console.log('        }')
        console.log('      ],')
        console.log('      "image": "https://example.com/images/theatre.jpg"')
        console.log('    }')
        console.log('  ]')
        break
    }
    
  } catch (error) {
    console.error('导入过程中出现错误:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行主函数
main()
