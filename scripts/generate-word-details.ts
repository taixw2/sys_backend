import { PrismaClient } from '../generated/prisma'
import { OLLAMA_CONFIG, getModelConfig } from './ollama-config'

const prisma = new PrismaClient()

// 获取当前模型配置
const modelConfig = getModelConfig(OLLAMA_CONFIG.model)

// 提示词模板
const PROMPT_TEMPLATE = `
为英语单词生成详细补充信息。

单词: {word}
翻译: {translation}

请返回JSON格式：
{
  "synonyms": ["近义词1", "近义词2", "近义词3"],
  "antonyms": ["反义词1", "反义词2", "反义词3"],
  "collocations": ["固定搭配1", "固定搭配2", "固定搭配3"],
  "etymology": "词源说明",
  "examples": [
    {"sentence": "例句1", "translation": "翻译1"},
    {"sentence": "例句2", "translation": "翻译2"}
  ],
  "frequencyLevel": 3,
  "difficultyLevel": 2,
  "studyTips": "学习建议"
}
`

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

// 解析 AI 响应
function parseAIResponse(response: string): any {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return JSON.parse(response)
  } catch (error) {
    console.error('解析 AI 响应失败:', error)
    return null
  }
}

// 生成单词详细数据
async function generateWordDetails(wordRecord: any): Promise<boolean> {
  try {
    console.log(`正在为单词 "${wordRecord.word}" 生成详细数据...`)
    
    const prompt = PROMPT_TEMPLATE
      .replace('{word}', wordRecord.word)
      .replace('{translation}', wordRecord.translation || '')
    
    const aiResponse = await callOllama(prompt)
    const parsedData = parseAIResponse(aiResponse)
    
    if (!parsedData) {
      console.log(`跳过单词 "${wordRecord.word}" - AI 响应解析失败`)
      return false
    }
    
    await prisma.wordDetail.upsert({
      where: { wordId: wordRecord.id },
      update: {
        synonyms: JSON.stringify(parsedData.synonyms || []),
        antonyms: JSON.stringify(parsedData.antonyms || []),
        collocations: JSON.stringify(parsedData.collocations || []),
        etymology: parsedData.etymology || '',
        examples: JSON.stringify(parsedData.examples || []),
        frequencyLevel: parsedData.frequencyLevel || 3,
        difficultyLevel: parsedData.difficultyLevel || 2,
        studyTips: parsedData.studyTips || '',
        isGenerated: true,
        generatedAt: new Date()
      },
      create: {
        wordId: wordRecord.id,
        synonyms: JSON.stringify(parsedData.synonyms || []),
        antonyms: JSON.stringify(parsedData.antonyms || []),
        collocations: JSON.stringify(parsedData.collocations || []),
        etymology: parsedData.etymology || '',
        examples: JSON.stringify(parsedData.examples || []),
        frequencyLevel: parsedData.frequencyLevel || 3,
        difficultyLevel: parsedData.difficultyLevel || 2,
        studyTips: parsedData.studyTips || '',
        isGenerated: true,
        generatedAt: new Date()
      }
    })
    
    console.log(`✅ 单词 "${wordRecord.word}" 详细数据生成完成`)
    return true
    
  } catch (error) {
    console.error(`❌ 为单词 "${wordRecord.word}" 生成详细数据失败:`, error)
    return false
  }
}

// 批量生成
async function batchGenerate() {
  try {
    console.log('开始批量生成词汇详细数据...')
    
    const words = await prisma.dictionary.findMany({
      where: {
        wordDetail: null,
        collins: { not: null, lte: 3 }
      },
      orderBy: { collins: 'asc' },
      take: 5 // 测试5个单词
    })
    
    console.log(`找到 ${words.length} 个需要生成详细数据的单词`)
    
    let successCount = 0
    let failCount = 0
    
    for (const word of words) {
      const success = await generateWordDetails(word)
      if (success) {
        successCount++
      } else {
        failCount++
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    console.log(`批量生成完成！成功: ${successCount}, 失败: ${failCount}`)
    
  } catch (error) {
    console.error('批量生成过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 生成特定单词
async function generateSpecificWord(word: string) {
  try {
    console.log(`为特定单词 "${word}" 生成详细数据...`)
    
    const wordRecord = await prisma.dictionary.findUnique({
      where: { word }
    })
    
    if (!wordRecord) {
      console.log(`单词 "${word}" 不存在于词典中`)
      return
    }
    
    const success = await generateWordDetails(wordRecord)
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
    await generateSpecificWord(args[0])
  } else {
    await batchGenerate()
  }
}

main()
