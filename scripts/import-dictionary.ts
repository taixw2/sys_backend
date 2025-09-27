import { PrismaClient } from '../generated/prisma'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// 用于生成 strip-word 的函数
function stripWord(word: string): string {
  return word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

// 解析 CSV 行的函数
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
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

async function importDictionary() {
  try {
    console.log('开始导入词典数据...')
    
    const csvPath = path.join(__dirname, '../../../ecdict.csv')
    const fileContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = fileContent.split('\n')
    
    // 跳过标题行
    const dataLines = lines.slice(1)
    
    console.log(`总共需要导入 ${dataLines.length} 条记录`)
    
    let processed = 0
    let skipped = 0
    
    for (const line of dataLines) {
      if (!line.trim()) continue
      
      const fields = parseCSVLine(line)
      
      if (fields.length < 13) continue
      
      const [
        word,
        phonetic,
        definition,
        translation,
        pos,
        collins,
        oxford,
        tag,
        bnc,
        frq,
        exchange,
        detail,
        audio
      ] = fields
      
      // 跳过空单词
      if (!word || !word.trim()) continue
      
      const sw = stripWord(word)
      
      try {
        await prisma.dictionary.upsert({
          where: { word: word.trim() },
          update: {
            phonetic: phonetic || null,
            definition: definition || null,
            translation: translation || null,
            pos: pos || null,
            collins: collins ? parseInt(collins) : null,
            oxford: oxford ? parseInt(oxford) : null,
            tag: tag || null,
            bnc: bnc ? parseInt(bnc) : null,
            frq: frq ? parseInt(frq) : null,
            exchange: exchange || null,
            detail: detail || null,
            audio: audio || null,
            sw: sw || null
          },
          create: {
            word: word.trim(),
            phonetic: phonetic || null,
            definition: definition || null,
            translation: translation || null,
            pos: pos || null,
            collins: collins ? parseInt(collins) : null,
            oxford: oxford ? parseInt(oxford) : null,
            tag: tag || null,
            bnc: bnc ? parseInt(bnc) : null,
            frq: frq ? parseInt(frq) : null,
            exchange: exchange || null,
            detail: detail || null,
            audio: audio || null,
            sw: sw || null
          }
        })
        
        processed++
        
        if (processed % 1000 === 0) {
          console.log(`已处理 ${processed} 条记录...`)
        }
        
      } catch (error) {
        skipped++
        if (skipped % 100 === 0) {
          console.log(`已跳过 ${skipped} 条重复记录...`)
        }
      }
    }
    
    console.log(`词典数据导入完成！总共处理 ${processed} 条记录，跳过 ${skipped} 条重复记录`)
    
  } catch (error) {
    console.error('导入过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行导入
importDictionary()
