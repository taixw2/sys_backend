import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

// 质量检查规则
const QUALITY_RULES = {
  synonyms: {
    minCount: 1,
    maxCount: 5,
    maxLength: 20
  },
  antonyms: {
    minCount: 1,
    maxCount: 4,
    maxLength: 20
  },
  collocations: {
    minCount: 1,
    maxCount: 5,
    maxLength: 50
  },
  examples: {
    minCount: 1,
    maxCount: 2,
    maxSentenceLength: 100,
    maxTranslationLength: 80
  },
  etymology: {
    minLength: 5,
    maxLength: 200
  },
  studyTips: {
    minLength: 10,
    maxLength: 300
  }
}

// 检查单个字段的质量
function checkFieldQuality(fieldType: string, data: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  try {
    switch (fieldType) {
      case 'synonyms':
      case 'antonyms':
      case 'collocations':
        if (!Array.isArray(data)) {
          issues.push('数据格式错误：应该是数组')
          return { isValid: false, issues }
        }
        
        if (data.length < QUALITY_RULES[fieldType].minCount) {
          issues.push(`数量过少：只有 ${data.length} 个，最少需要 ${QUALITY_RULES[fieldType].minCount} 个`)
        }
        
        if (data.length > QUALITY_RULES[fieldType].maxCount) {
          issues.push(`数量过多：有 ${data.length} 个，最多允许 ${QUALITY_RULES[fieldType].maxCount} 个`)
        }
        
        data.forEach((item, index) => {
          if (typeof item !== 'string') {
            issues.push(`第 ${index + 1} 项格式错误：应该是字符串`)
          } else if (item.length > QUALITY_RULES[fieldType].maxLength) {
            issues.push(`第 ${index + 1} 项过长：${item.length} 字符，最多 ${QUALITY_RULES[fieldType].maxLength} 字符`)
          }
        })
        break
        
      case 'examples':
        if (!Array.isArray(data)) {
          issues.push('数据格式错误：应该是数组')
          return { isValid: false, issues }
        }
        
        if (data.length < QUALITY_RULES.examples.minCount) {
          issues.push(`例句数量过少：只有 ${data.length} 个，最少需要 ${QUALITY_RULES.examples.minCount} 个`)
        }
        
        if (data.length > QUALITY_RULES.examples.maxCount) {
          issues.push(`例句数量过多：有 ${data.length} 个，最多允许 ${QUALITY_RULES.examples.maxCount} 个`)
        }
        
        data.forEach((example, index) => {
          if (!example.sentence || !example.translation) {
            issues.push(`第 ${index + 1} 个例句格式错误：缺少 sentence 或 translation`)
          } else {
            if (example.sentence.length > QUALITY_RULES.examples.maxSentenceLength) {
              issues.push(`第 ${index + 1} 个例句过长：${example.sentence.length} 字符，最多 ${QUALITY_RULES.examples.maxSentenceLength} 字符`)
            }
            if (example.translation.length > QUALITY_RULES.examples.maxTranslationLength) {
              issues.push(`第 ${index + 1} 个翻译过长：${example.translation.length} 字符，最多 ${QUALITY_RULES.examples.maxTranslationLength} 字符`)
            }
          }
        })
        break
        
      case 'etymology':
      case 'studyTips':
        if (typeof data !== 'string') {
          issues.push('数据格式错误：应该是字符串')
          return { isValid: false, issues }
        }
        
        if (data.length < QUALITY_RULES[fieldType].minLength) {
          issues.push(`内容过短：${data.length} 字符，最少需要 ${QUALITY_RULES[fieldType].minLength} 字符`)
        }
        
        if (data.length > QUALITY_RULES[fieldType].maxLength) {
          issues.push(`内容过长：${data.length} 字符，最多 ${QUALITY_RULES[fieldType].maxLength} 字符`)
        }
        break
    }
    
    return { isValid: issues.length === 0, issues }
  } catch (error) {
    return { isValid: false, issues: [`解析错误：${error.message}`] }
  }
}

// 检查单词详细数据的质量
async function checkWordQuality(wordDetail: any, word: any): Promise<{ word: string; quality: any; issues: string[] }> {
  const issues: string[] = []
  const quality: any = {}
  
  // 检查各个字段
  const fields = ['synonyms', 'antonyms', 'collocations', 'examples', 'etymology', 'studyTips']
  
  for (const field of fields) {
    if (wordDetail[field]) {
      let data
      try {
        data = typeof wordDetail[field] === 'string' ? JSON.parse(wordDetail[field]) : wordDetail[field]
      } catch {
        issues.push(`${field} 字段 JSON 解析失败`)
        continue
      }
      
      const fieldQuality = checkFieldQuality(field, data)
      quality[field] = fieldQuality.isValid
      
      if (!fieldQuality.isValid) {
        issues.push(`${field}: ${fieldQuality.issues.join(', ')}`)
      }
    }
  }
  
  return {
    word: word.word,
    quality,
    issues
  }
}

// 批量质量检查
async function batchQualityCheck(limit = 50) {
  try {
    console.log('开始批量质量检查...')
    
    const wordDetails = await prisma.wordDetail.findMany({
      where: { isGenerated: true },
      include: { word: true },
      take: limit
    })
    
    console.log(`检查 ${wordDetails.length} 个单词的详细数据`)
    
    const results = []
    let totalIssues = 0
    let perfectWords = 0
    
    for (const wordDetail of wordDetails) {
      const result = await checkWordQuality(wordDetail, wordDetail.word)
      results.push(result)
      
      if (result.issues.length === 0) {
        perfectWords++
      } else {
        totalIssues += result.issues.length
      }
    }
    
    // 输出检查结果
    console.log('\n=== 质量检查结果 ===')
    console.log(`总检查数量: ${wordDetails.length}`)
    console.log(`完美单词: ${perfectWords}`)
    console.log(`有问题的单词: ${wordDetails.length - perfectWords}`)
    console.log(`总问题数: ${totalIssues}`)
    console.log(`平均问题数: ${(totalIssues / wordDetails.length).toFixed(2)}`)
    
    // 显示有问题的单词
    const problematicWords = results.filter(r => r.issues.length > 0)
    if (problematicWords.length > 0) {
      console.log('\n=== 有问题的单词 ===')
      problematicWords.slice(0, 10).forEach(result => {
        console.log(`\n${result.word}:`)
        result.issues.forEach(issue => console.log(`  - ${issue}`))
      })
      
      if (problematicWords.length > 10) {
        console.log(`... 还有 ${problematicWords.length - 10} 个有问题的单词`)
      }
    }
    
    // 字段质量统计
    const fieldStats: any = {}
    const fields = ['synonyms', 'antonyms', 'collocations', 'examples', 'etymology', 'studyTips']
    
    fields.forEach(field => {
      const validCount = results.filter(r => r.quality[field] === true).length
      const totalCount = results.filter(r => r.quality[field] !== undefined).length
      fieldStats[field] = totalCount > 0 ? Math.round((validCount / totalCount) * 100) : 0
    })
    
    console.log('\n=== 字段质量统计 ===')
    Object.entries(fieldStats).forEach(([field, percentage]) => {
      console.log(`${field}: ${percentage}% 合格`)
    })
    
  } catch (error) {
    console.error('质量检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 检查特定单词的质量
async function checkSpecificWord(word: string) {
  try {
    console.log(`检查单词 "${word}" 的质量...`)
    
    const wordRecord = await prisma.dictionary.findUnique({
      where: { word },
      include: { wordDetail: true }
    })
    
    if (!wordRecord) {
      console.log(`单词 "${word}" 不存在于词典中`)
      return
    }
    
    if (!wordRecord.wordDetail) {
      console.log(`单词 "${word}" 没有详细数据`)
      return
    }
    
    const result = await checkWordQuality(wordRecord.wordDetail, wordRecord)
    
    console.log('\n=== 检查结果 ===')
    console.log(`单词: ${result.word}`)
    
    if (result.issues.length === 0) {
      console.log('✅ 质量检查通过，没有发现问题')
    } else {
      console.log('❌ 发现以下问题:')
      result.issues.forEach(issue => console.log(`  - ${issue}`))
    }
    
    console.log('\n字段质量:')
    Object.entries(result.quality).forEach(([field, isValid]) => {
      console.log(`  ${field}: ${isValid ? '✅' : '❌'}`)
    })
    
  } catch (error) {
    console.error('检查特定单词质量失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length > 0) {
    if (args[0] === '--batch') {
      const limit = args[1] ? parseInt(args[1]) : 50
      await batchQualityCheck(limit)
    } else {
      await checkSpecificWord(args[0])
    }
  } else {
    console.log('使用方法:')
    console.log('  bun run tsx scripts/quality-check.ts <单词>')
    console.log('  bun run tsx scripts/quality-check.ts --batch [数量]')
  }
}

main()
