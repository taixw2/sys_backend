import { PrismaClient } from '../generated/prisma'
import { OLLAMA_CONFIG, getModelConfig } from './ollama-config'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// 获取当前模型配置
const modelConfig = getModelConfig(OLLAMA_CONFIG.model)

// 分层生成策略
const GENERATION_STRATEGY = {
  level1: ['synonyms', 'antonyms'],
  level2: ['collocations', 
    // 'examples', 
    'cognates', 'relatedWords'],
  level3: [
    // 'etymology', 'studyTips', 
    'wordForms', 'commonMistakes', 'examQuestions']
}

// 记录处理结果的接口
interface ProcessingResult {
  word: string
  exists: boolean
  success: boolean
  error?: string
  timestamp: string
}

// 获取单词列表的接口
async function fetchWordsFromAPI(page: number = 1, limit: number = 100): Promise<{ data: any[], pagination: any }> {
  try {
    const response = await fetch(`http://localhost:3000/api/Word?page=${page}&limit=${limit}&sortBy=nameLength&sortOrder=asc`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('获取单词列表失败:', error)
    throw error
  }
}

// 保存处理结果到本地文件
function saveProcessingResults(results: ProcessingResult[], filename: string = 'word-processing-results.json') {
  try {
    const filePath = path.join(process.cwd(), filename)
    
    // 如果文件已存在，读取现有数据
    let existingResults: ProcessingResult[] = []
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      existingResults = JSON.parse(fileContent)
    }
    
    // 合并新结果
    const allResults = [...existingResults, ...results]
    
    // 去重（基于单词名和时间戳）
    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r.word === result.word && r.timestamp === result.timestamp)
    )
    
    // 保存到文件
    fs.writeFileSync(filePath, JSON.stringify(uniqueResults, null, 2), 'utf-8')
    console.log(`✅ 处理结果已保存到: ${filePath}`)
    console.log(`📊 总记录数: ${uniqueResults.length}`)
    
    // 生成统计报告
    const stats = {
      total: uniqueResults.length,
      exists: uniqueResults.filter(r => r.exists).length,
      notExists: uniqueResults.filter(r => !r.exists).length,
      success: uniqueResults.filter(r => r.success).length,
      failed: uniqueResults.filter(r => !r.success).length,
      timestamp: new Date().toISOString()
    }
    
    const statsPath = path.join(process.cwd(), 'word-processing-stats.json')
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf-8')
    console.log(`📈 统计报告已保存到: ${statsPath}`)
    console.log(`📊 统计信息:`, stats)
    
  } catch (error) {
    console.error('保存处理结果失败:', error)
  }
}

// 单词预处理
function preprocessWord(word: string): { 
  originalWord: string; 
  processedWord: string; 
  isAffix: boolean; 
  affixType: 'prefix' | 'suffix' | 'root' | 'none';
  wordType: 'normal' | 'affix' | 'abbreviation' | 'compound' | 'phrasal';
  specialInfo: string;
} {
  const originalWord = word.trim()
  let processedWord = originalWord
  let isAffix = false
  let affixType: 'prefix' | 'suffix' | 'root' | 'none' = 'none'
  let wordType: 'normal' | 'affix' | 'abbreviation' | 'compound' | 'phrasal' = 'normal'
  let specialInfo = ''
  
  // 1. 检查是否是词缀
  if (originalWord.startsWith('-') || originalWord.endsWith('-')) {
    isAffix = true
    wordType = 'affix'
    if (originalWord.startsWith('-') && originalWord.endsWith('-')) {
      affixType = 'root' // 如 -able-
      processedWord = originalWord.slice(1, -1)
    } else if (originalWord.startsWith('-')) {
      affixType = 'suffix' // 如 -able
      processedWord = originalWord.slice(1)
    } else {
      affixType = 'prefix' // 如 un-
      processedWord = originalWord.slice(0, -1)
    }
  }
  
  // 2. 检查是否是缩写词（全大写）
  else if (originalWord === originalWord.toUpperCase() && originalWord.length <= 5) {
    wordType = 'abbreviation'
    specialInfo = '这可能是一个缩写词'
  }
  
  // 3. 检查是否是复合词（包含连字符）
  else if (originalWord.includes('-') && !originalWord.startsWith('-') && !originalWord.endsWith('-')) {
    wordType = 'compound'
    specialInfo = '这是一个复合词'
  }
  
  // 4. 检查是否是短语动词（包含空格）
  else if (originalWord.includes(' ')) {
    wordType = 'phrasal'
    specialInfo = '这是一个短语动词'
  }
  
  // 5. 检查是否是缩写词（包含撇号）
  else if (originalWord.includes("'")) {
    wordType = 'abbreviation'
    specialInfo = '这可能是一个缩写词，包含省略的字母，结合翻译推理'
  }
  
  // 6. 检查是否包含其他特殊字符
  else if (/[^a-zA-Z0-9'-]/.test(originalWord)) {
    specialInfo = '包含特殊字符'
  }
  
  return { originalWord, processedWord, isAffix, affixType, wordType, specialInfo }
}

// 生成提示词模板
const PROMPT_TEMPLATES = {
  synonyms: `
为英语单词生成近义词。

单词: {word}
词性: {pos}
中文翻译: {translation}
{affixInfo}

要求：
1. 只返回3-5个最常用的近义词，禁止杜撰近义词，如果无就返回空数组
2. 确保词性相同或相近
3. 避免过于生僻的词汇
4. 只返回JSON数组格式

返回格式：
["近义词1", "近义词2", "近义词3"]
`,

  antonyms: `
为英语单词生成反义词。

单词: {word}
词性: {pos}
中文翻译: {translation}
{affixInfo}

要求：
1. 只返回2-4个最准确的反义词，禁止杜撰反义词，如果无就返回空数组
2. 确保词性相同
3. 避免过于生僻的词汇
4. 只返回JSON数组格式

返回格式：
["反义词1", "反义词2", "反义词3"]
`,

  collocations: `
为英语单词生成固定搭配。

单词: {word}
词性: {pos}
中文翻译: {translation}
{affixInfo}

要求：
1. 只返回3-5个最常用的固定搭配，禁止杜撰固定搭配，如果无就返回空数组
2. 确保搭配自然、常用
3. 包含完整的短语或短句
4. 只返回JSON数组格式

返回格式：
["固定搭配1", "固定搭配2", "固定搭配3"]
`,

  examples: `
为英语单词生成例句。

单词: {word}
词性: {pos}
中文翻译: {translation}
{affixInfo}

要求：
1. 生成2个简单、清晰的例句
2. 例句要自然、常用
3. 包含中文翻译
4. 只返回JSON格式

返回格式：
[
  {"sentence": "例句1", "translation": "中文翻译1"},
  {"sentence": "例句2", "translation": "中文翻译2"}
]
`,

  etymology: `
为英语单词生成词源信息。

单词: {word}
词性: {pos}
{affixInfo}

要求：
1. 提供简洁的词源说明（50字以内），请勿杜撰词源
2. 如果词源复杂，只提供主要来源
3. 如果不确定，返回"词源信息不详"
4. 只返回纯文本

返回格式：
词源说明文本
`,

  studyTips: `
为英语单词提供学习建议。

单词: {word}
词性: {pos}
中文翻译: {translation}
{affixInfo}

要求：
1. 提供1-2条实用的学习建议，提供实际有用的学习建议，而非编撰的毫无意义的建议，如果无就返回空数组
2. 建议要具体、可操作
3. 避免过于笼统的建议
4. 只返回纯文本

返回格式：
学习建议文本
`,

  cognates: `
为英语单词生成同根词。

单词: {word}
词性: {pos}
中文翻译: {translation}
{affixInfo}

要求：
1. 确保词根相同或相近，禁止杜撰词根
2. 包含不同词性的变化
3. 只返回JSON数组格式

返回格式：
["同根词1", "同根词2", "同根词3"]
`,

  relatedWords: `
为英语单词生成相关词汇。

单词: {word}
词性: {pos}
中文翻译: {translation}
{affixInfo}

要求：
1. 包括语义相关、主题相关的词汇
2. 避免过于生僻的词汇
3. 只返回JSON数组格式

返回格式：
["相关词1", "相关词2", "相关词3"]
`,

  wordForms: `
为英语单词生成词形变化。

单词: {word}
词性: {pos}
中文翻译: {translation}
{affixInfo}

要求：
1. 生成该单词的各种词形变化
2. 包括时态、比较级、派生词等
3. 只返回JSON格式

返回格式：
{
  "past": "过去式",
  "past_participle": "过去分词",
  "present_participle": "现在分词",
  "third_person": "第三人称单数",
  "plural": "复数形式",
  "comparative": "比较级",
  "superlative": "最高级",
  "derivatives": ["派生词1", "派生词2"]
}
`,

  commonMistakes: `
为英语单词生成常见错误。

单词: {word}
词性: {pos}
中文翻译: {translation}
{affixInfo}

要求：
1. 列出2-3个常见使用错误，需要符合实际而非杜撰的使用错误，如没有则返回空数组
2. 包括拼写、用法、搭配错误
3. 提供正确的用法示例
4. 只返回JSON格式

返回格式：
[
  {
    "mistake": "错误用法",
    "correction": "正确用法",
    "explanation": "错误说明"
  }
]
`,

  examQuestions: `
为英语单词的特定释义查找历年真题，请勿杜撰真题。

单词: {word}
词性: {pos}
释义: {meaning}
{affixInfo}

要求：
1. 尽量查找这个单词的特定释义的所有历年真题，如果找不到则返回空数组
2. 真题包括：例句、年份、试卷名称、题型
3. 例句要自然、符合该释义的用法，如果找不到则返回空数组
4. 只返回JSON格式

返回格式：
[{
  "meaning": "释义",
  "example": "例句",
  "translation": "中文翻译",
  "year": "年份",
  "exam": "试卷名称",
  "type": "题型"
}]
`
}

// 调用 Ollama API
async function callOllama(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_CONFIG.model,
        prompt: prompt,
        stream: false,
        options: {
          num_predict: modelConfig.maxTokens,
          temperature: modelConfig.temperature
        }
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.response
  } catch (error) {
    console.error('调用 Ollama API 失败:', error)
    throw error
  }
}

// 验证生成的数据
function validateGeneratedData(type: string, data: any, wordType: string = 'normal'): boolean {
  try {
    switch (type) {
      case 'synonyms':
      case 'antonyms':
        // 词缀和缩写词可能没有近义词/反义词
        if (wordType === 'affix' || wordType === 'abbreviation') {
          return Array.isArray(data) && data.length >= 0
        }
        return Array.isArray(data) && data.length > 0
      
      case 'collocations':
      case 'cognates':
      case 'relatedWords':
        // 词缀通常不用于搭配
        if (wordType === 'affix') {
          return Array.isArray(data) && data.length >= 0
        }
        return Array.isArray(data) && data.length > 0
      
      case 'examples':
        // 词缀和缩写词可能没有例句
        if (wordType === 'affix' || wordType === 'abbreviation') {
          return Array.isArray(data) && data.length >= 0
        }
        return Array.isArray(data) && 
               data.length > 0 && 
               data.length <= 2 &&
               data.every(ex => ex.sentence && ex.translation)
      
      case 'wordForms':
        return typeof data === 'object' && data !== null && 
               (data.past || data.present_participle || data.derivatives)
      
      case 'commonMistakes':
        return Array.isArray(data) && 
               data.length > 0 && 
               data.length <= 3 &&
               data.every(mistake => mistake.mistake && mistake.correction)
      
      case 'examQuestions':
        return Array.isArray(data) && 
               data.length > 0 && 
               data.length <= 5 &&
               data.every(question => question.meaning && question.example && question.year)
      
      case 'etymology':
      case 'studyTips':
        return typeof data === 'string' && data.length > 0 && data.length <= 200
      
      default:
        return false
    }
  } catch {
    return false
  }
}

// 解析 AI 响应
function parseAIResponse(response: string, type: string): any {
  try {
    const cleanResponse = response.trim()
    
    if (['synonyms', 'antonyms', 'collocations', 'examples', 'cognates', 'relatedWords', 'commonMistakes', 'examQuestions'].includes(type)) {
      // const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/)
      // if (jsonMatch) {
      //   return JSON.parse(jsonMatch[0])
      // }
      return JSON.parse(cleanResponse)
    }
    
    if (type === 'wordForms') {
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return JSON.parse(cleanResponse)
    }
    
    return cleanResponse
  } catch (error) {
    console.error(`解析 ${type} 响应失败:`, error)
    return null
  }
}

// 为单个单词生成特定类型的数据
async function generateWordDetailField(
  wordRecord: any, 
  fieldType: string, 
  retryCount = 0
): Promise<any> {
  try {
    // 预处理单词
    const { originalWord, processedWord, isAffix, affixType, wordType, specialInfo: wordSpecialInfo } = preprocessWord(wordRecord.word)
    
    // 构建特殊信息
    let specialInfo = ''
    if (isAffix) {
      const affixTypeText = {
        'prefix': '前缀',
        'suffix': '后缀', 
        'root': '词根'
      }[affixType]
      specialInfo = `注意：这是一个${affixTypeText}，原始形式为"${processedWord}"`
    } else if (wordType === 'abbreviation') {
      if (originalWord.includes("'")) {
        specialInfo = '注意：这是一个缩写词，包含省略的字母，请提供完整形式和常见用法'
      } else {
        specialInfo = '注意：这是一个缩写词，请提供完整形式'
      }
    } else if (wordType === 'compound') {
      specialInfo = '注意：这是一个复合词，由多个单词组成'
    } else if (wordType === 'phrasal') {
      specialInfo = '注意：这是一个短语动词，包含多个单词'
    } else if (specialInfo) {
      specialInfo = `注意：${specialInfo}`
    }
    
    const prompt = PROMPT_TEMPLATES[fieldType]
      .replace('{word}', originalWord)
      .replace('{pos}', wordRecord.pos || '')
      .replace('{translation}', wordRecord.translation || '')
      .replace('{affixInfo}', specialInfo)
    
    const aiResponse = await callOllama(prompt)
    const parsedData = parseAIResponse(aiResponse, fieldType)
    
    if (parsedData && validateGeneratedData(fieldType, parsedData, wordType)) {
      return parsedData
    }
    
    if (retryCount < 2) {
      console.log(`重试生成 ${originalWord} 的 ${fieldType}...\n${aiResponse}`)
      await new Promise(resolve => setTimeout(resolve, 1000))
      return generateWordDetailField(wordRecord, fieldType, retryCount + 1)
    }
    
    return null
  } catch (error) {
    console.error(`生成 ${wordRecord.word} 的 ${fieldType} 失败:`, error)
    return null
  }
}

// 为单词的所有释义生成真题
async function generateExamQuestionsForMeanings(wordRecord: any): Promise<any[]> {
  try {
    const { originalWord, processedWord, isAffix, affixType, wordType, specialInfo: wordSpecialInfo } = preprocessWord(wordRecord.word)
    
    // 解析中文翻译，提取各个释义
    const translation = wordRecord.translation || ''
    const meanings = parseMeanings(translation)
    
    if (meanings.length === 0) {
      console.log(`  单词 "${originalWord}" 没有可用的释义`)
      return []
    }
    
    console.log(`  为 ${meanings.length} 个释义生成真题...`)
    
    const examQuestions: any[] = []
    
    for (let i = 0; i < meanings.length; i++) {
      const meaning = meanings[i]
      console.log(`    生成释义 "${meaning}" 的真题...`)
      
      try {
        // 构建特殊信息
        let specialInfo = ''
        if (isAffix) {
          const affixTypeText = {
            'prefix': '前缀',
            'suffix': '后缀', 
            'root': '词根'
          }[affixType]
          specialInfo = `注意：这是一个${affixTypeText}，原始形式为"${processedWord}"`
        } else if (wordType === 'abbreviation') {
          if (originalWord.includes("'")) {
            specialInfo = '注意：这是一个缩写词，包含省略的字母，请提供完整形式和常见用法'
          } else {
            specialInfo = '注意：这是一个缩写词，请提供完整形式'
          }
        } else if (wordType === 'compound') {
          specialInfo = '注意：这是一个复合词，由多个单词组成'
        } else if (wordType === 'phrasal') {
          specialInfo = '注意：这是一个短语动词，包含多个单词'
        } else if (wordSpecialInfo) {
          specialInfo = `注意：${wordSpecialInfo}`
        }
        
        const prompt = PROMPT_TEMPLATES.examQuestions
          .replace('{word}', originalWord)
          .replace('{pos}', wordRecord.pos || '')
          .replace('{meaning}', meaning)
          .replace('{affixInfo}', specialInfo)
        
        const aiResponse = await callOllama(prompt)
        const parsedData = parseAIResponse(aiResponse, 'examQuestions')
        
        if (parsedData && validateGeneratedData('examQuestions', parsedData, wordType)) {
          examQuestions.push(parsedData)
          console.log(`    ✅ 释义 "${meaning}" 真题生成成功`)
        } else {
          console.log(`    ❌ 释义 "${meaning}" 真题生成失败`)
        }
        
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        console.error(`    生成释义 "${meaning}" 真题失败:`, error)
      }
    }
    
    return examQuestions
    
  } catch (error) {
    console.error(`为单词 "${wordRecord.word}" 生成真题失败:`, error)
    return []
  }
}

// 解析中文翻译，提取各个释义
function parseMeanings(translation: string): string[] {
  if (!translation) return []
  
  // 按换行符分割
  const lines = translation.split('\n').filter(line => line.trim())
  
  // // 提取释义（通常是冒号后的内容）
  // const meanings: string[] = []
  
  // for (const line of lines) {
  //   // 匹配 "词性. 释义" 格式
  //   const match = line.match(/^[a-z]+\.\s*(.+)$/i)
  //   if (match) {
  //     meanings.push(match[1].trim())
  //   } else {
  //     // 如果没有词性标记，直接使用整行
  //     meanings.push(line.trim())
  //   }
  // }
  
  return lines
}

// 分层生成单词详细数据
async function generateWordDetailsSafely(wordRecord: any): Promise<boolean> {
  try {
    const { wordType, specialInfo } = preprocessWord(wordRecord.word)
    console.log(`正在为单词 "${wordRecord.word}" (${wordType}) 生成详细数据...`)
    if (specialInfo) {
      console.log(`  特殊信息: ${specialInfo}`)
    }
    
    const generatedData: any = {}
    let successCount = 0
    let totalFields = 0
    
    // 第一层：生成基础信息
    console.log(`  - 生成基础信息...`)
    for (const fieldType of GENERATION_STRATEGY.level1) {
      totalFields++
      const data = await generateWordDetailField(wordRecord, fieldType)
      if (data) {
        generatedData[fieldType] = JSON.stringify(data)
        console.log("生成成功 【fieldType】：", fieldType, " 【data】：", JSON.stringify(data))
        successCount++
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // 第二层：生成扩展信息
    console.log(`  - 生成扩展信息...`)
    for (const fieldType of GENERATION_STRATEGY.level2) {
      totalFields++
      const data = await generateWordDetailField(wordRecord, fieldType)
      if (data) {
        generatedData[fieldType] = JSON.stringify(data)
        console.log("生成成功 【fieldType】：", fieldType, " 【data】：", JSON.stringify(data))
        successCount++
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // 第三层：生成高级信息
    console.log(`  - 生成高级信息...`)
    for (const fieldType of GENERATION_STRATEGY.level3) {
      if (fieldType === 'examQuestions') {
        // 特殊处理真题生成
        totalFields++
        const examData = await generateExamQuestionsForMeanings(wordRecord)
        if (examData && examData.length > 0) {
          generatedData[fieldType] = JSON.stringify(examData)
          console.log("生成成功 【fieldType】：", fieldType, " 【data】：", JSON.stringify(examData))
          successCount++
        }
      } else {
        totalFields++
        const data = await generateWordDetailField(wordRecord, fieldType)
        if (data) {
          generatedData[fieldType] = typeof data === 'string' ? data : JSON.stringify(data)
          console.log("生成成功 【fieldType】：", fieldType, " 【data】：", JSON.stringify(data))
          successCount++
        }
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    // 计算词频和难度等级
    generatedData.frequencyLevel = wordRecord.collins || 3
    generatedData.difficultyLevel = wordRecord.collins ? Math.min(wordRecord.collins, 5) : 3
    
    // 保存到数据库
    await prisma.wordDetail.upsert({
      where: { wordId: wordRecord.id },
      update: {
        ...generatedData,
        isGenerated: true,
        generatedAt: new Date()
      },
      create: {
        wordId: wordRecord.id,
        ...generatedData,
        isGenerated: true,
        generatedAt: new Date()
      }
    })
    
    const successRate = Math.round((successCount / totalFields) * 100)
    console.log(`✅ 单词 "${wordRecord.word}" 详细数据生成完成 (成功率: ${successRate}%)`)
    return successCount > 0
    
  } catch (error) {
    console.error(`❌ 为单词 "${wordRecord.word}" 生成详细数据失败:`, error)
    return false
  }
}

// 批量生成详细数据（安全模式）
async function batchGenerateWordDetailsSafely() {
  try {
    console.log('开始通过 API 批量生成词汇详细数据...')
    
    let currentPage = 1
    const pageSize = 50 // 每页处理 50 个单词
    let hasMorePages = true
    let totalProcessed = 0
    let totalSuccess = 0
    let totalSkipped = 0
    let totalFailed = 0
    
    const processingResults: ProcessingResult[] = []
    
    while (hasMorePages) {
      console.log(`\n📄 处理第 ${currentPage} 页...`)
      
      try {
        // 通过 API 获取单词列表
        const apiResult = await fetchWordsFromAPI(currentPage, pageSize)
        const words = apiResult.data
        const pagination = apiResult.pagination
        
        console.log(`获取到 ${words.length} 个单词 (第 ${currentPage}/${pagination.totalPages} 页)`)
        
        if (words.length === 0) {
          console.log('没有更多单词了')
          break
        }
        
        // 处理当前页的单词
        for (let i = 0; i < words.length; i++) {
          const wordRecord = words[i]
          const wordName = wordRecord.name
          
          console.log(`[${totalProcessed + i + 1}] 处理单词: ${wordName}`)
          
          try {
            // 检查本地数据库是否存在该单词
            const localWord = await prisma.dictionary.findFirst({
              where: { word: wordName }
            })
            
            const result: ProcessingResult = {
              word: wordName,
              exists: !!localWord,
              success: false,
              timestamp: new Date().toISOString()
            }
            
            if (localWord) {
              console.log(`  ✅ 单词 "${wordName}" 存在于本地数据库`)
              
              // 检查是否已经有详细数据
              const existingDetail = await prisma.wordDetail.findUnique({
                where: { wordId: localWord.id }
              })
              
              if (existingDetail && existingDetail.isGenerated) {
                console.log(`  ⏭️  单词 "${wordName}" 已有详细数据，跳过`)
                result.success = true
                totalSkipped++
              } else {
                console.log(`  🔄 开始为单词 "${wordName}" 生成详细数据...`)
                
                // 生成详细数据
                const success = await generateWordDetailsSafely(localWord)
                if (success) {
                  console.log(`  ✅ 单词 "${wordName}" 详细数据生成成功`)
                  result.success = true
                  totalSuccess++
                } else {
                  console.log(`  ❌ 单词 "${wordName}" 详细数据生成失败`)
                  result.error = '生成详细数据失败'
                  totalFailed++
                }
              }
            } else {
              console.log(`  ⏭️  单词 "${wordName}" 不存在于本地数据库，跳过`)
              result.error = '单词不存在于本地数据库'
              totalSkipped++
            }
            
            processingResults.push(result)
            
            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 100))
            
          } catch (error) {
            console.error(`  ❌ 处理单词 "${wordName}" 时出错:`, error)
            
            const result: ProcessingResult = {
              word: wordName,
              exists: false,
              success: false,
              error: error instanceof Error ? error.message : '未知错误',
              timestamp: new Date().toISOString()
            }
            processingResults.push(result)
            totalFailed++
          }
        }
        
        totalProcessed += words.length
        
        // 检查是否还有更多页
        hasMorePages = currentPage < pagination.totalPages
        
        if (hasMorePages) {
          currentPage++
          // console.log(`\n⏳ 等待 2 秒后处理下一页...`)
          // await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // 每处理 5 页保存一次结果
        if (currentPage % 5 === 0 || !hasMorePages) {
          console.log(`\n💾 保存处理结果...`)
          saveProcessingResults(processingResults)
        }
        
      } catch (error) {
        console.error(`处理第 ${currentPage} 页时出错:`, error)
        
        // 记录错误到结果中
        const errorResult: ProcessingResult = {
          word: `PAGE_${currentPage}`,
          exists: false,
          success: false,
          error: error instanceof Error ? error.message : '页面处理失败',
          timestamp: new Date().toISOString()
        }
        processingResults.push(errorResult)
        
        // 继续处理下一页
        currentPage++
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
    
    // 最终保存结果
    console.log(`\n💾 保存最终处理结果...`)
    saveProcessingResults(processingResults)
    
    console.log(`\n🎉 批量生成完成！`)
    console.log(`📊 处理统计:`)
    console.log(`  - 总处理数: ${totalProcessed}`)
    console.log(`  - 成功生成: ${totalSuccess}`)
    console.log(`  - 跳过数量: ${totalSkipped}`)
    console.log(`  - 失败数量: ${totalFailed}`)
    
  } catch (error) {
    console.error('批量生成过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 为特定单词生成详细数据
async function generateSpecificWordSafely(word: string) {
  try {
    console.log(`为特定单词 "${word}" 生成详细数据...`)
    
    const wordRecord = await prisma.dictionary.findUnique({
      where: { word }
    })
    
    if (!wordRecord) {
      console.log(`单词 "${word}" 不存在于词典中`)
      return
    }
    
    const success = await generateWordDetailsSafely(wordRecord)
    if (success) {
      console.log(`✅ 单词 "${word}" 详细数据生成成功`)
    } else {
      console.log(`❌ 单词 "${word}" 详细数据生成失败`)
    }
    
  } catch (error) {
    console.error('生成特定单词详细数据时出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length > 0) {
    await generateSpecificWordSafely(args[0])
  } else {
    await batchGenerateWordDetailsSafely()
  }
}

main()
