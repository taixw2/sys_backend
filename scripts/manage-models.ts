import { OLLAMA_CONFIG, MODEL_CONFIGS, getRecommendedModel } from './ollama-config'

// 获取可用模型列表
async function getAvailableModels() {
  try {
    const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/tags`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data.models || []
  } catch (error) {
    console.error('获取模型列表失败:', error)
    return []
  }
}

// 下载模型
async function downloadModel(modelName: string) {
  try {
    console.log(`开始下载模型: ${modelName}`)
    
    const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    console.log(`✅ 模型 ${modelName} 下载完成`)
    return true
  } catch (error) {
    console.error(`❌ 下载模型 ${modelName} 失败:`, error)
    return false
  }
}

// 删除模型
async function deleteModel(modelName: string) {
  try {
    console.log(`开始删除模型: ${modelName}`)
    
    const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    console.log(`✅ 模型 ${modelName} 删除完成`)
    return true
  } catch (error) {
    console.error(`❌ 删除模型 ${modelName} 失败:`, error)
    return false
  }
}

// 显示模型信息
async function showModelInfo() {
  try {
    console.log('=== Ollama 模型信息 ===')
    
    const availableModels = await getAvailableModels()
    console.log(`\n已安装模型 (${availableModels.length}):`)
    
    if (availableModels.length === 0) {
      console.log('  暂无已安装的模型')
    } else {
      availableModels.forEach((model: any) => {
        console.log(`  - ${model.name} (${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)`)
      })
    }
    
    console.log('\n支持的模型:')
    Object.entries(MODEL_CONFIGS).forEach(([name, config]) => {
      const isInstalled = availableModels.some((m: any) => m.name === name)
      const status = isInstalled ? '✅ 已安装' : '❌ 未安装'
      console.log(`  - ${name}: ${status}`)
      console.log(`    描述: ${config.description}`)
      console.log(`    配置: maxTokens=${config.maxTokens}, temperature=${config.temperature}`)
    })
    
    const recommended = getRecommendedModel()
    console.log(`\n推荐模型: ${recommended}`)
    
  } catch (error) {
    console.error('获取模型信息失败:', error)
  }
}

// 安装推荐模型
async function installRecommendedModel() {
  const recommended = getRecommendedModel()
  console.log(`安装推荐模型: ${recommended}`)
  
  const success = await downloadModel(recommended)
  if (success) {
    console.log('✅ 推荐模型安装完成')
  } else {
    console.log('❌ 推荐模型安装失败')
  }
}

// 批量安装模型
async function installModels(modelNames: string[]) {
  console.log(`开始批量安装模型: ${modelNames.join(', ')}`)
  
  for (const modelName of modelNames) {
    if (MODEL_CONFIGS[modelName]) {
      await downloadModel(modelName)
      // 添加延迟避免并发请求过多
      await new Promise(resolve => setTimeout(resolve, 2000))
    } else {
      console.log(`⚠️  模型 ${modelName} 不在支持列表中，跳过`)
    }
  }
}

// 清理未使用的模型
async function cleanupModels() {
  try {
    console.log('开始清理未使用的模型...')
    
    const availableModels = await getAvailableModels()
    const supportedModels = Object.keys(MODEL_CONFIGS)
    
    const unusedModels = availableModels.filter((model: any) => 
      !supportedModels.includes(model.name)
    )
    
    if (unusedModels.length === 0) {
      console.log('没有需要清理的模型')
      return
    }
    
    console.log(`找到 ${unusedModels.length} 个未使用的模型:`)
    unusedModels.forEach((model: any) => {
      console.log(`  - ${model.name}`)
    })
    
    console.log('\n开始删除...')
    for (const model of unusedModels) {
      await deleteModel(model.name)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log('✅ 清理完成')
    
  } catch (error) {
    console.error('清理模型失败:', error)
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    await showModelInfo()
    return
  }
  
  const command = args[0]
  
  switch (command) {
    case 'list':
    case 'info':
      await showModelInfo()
      break
      
    case 'install':
      if (args[1]) {
        await downloadModel(args[1])
      } else {
        await installRecommendedModel()
      }
      break
      
    case 'install-all':
      await installModels(Object.keys(MODEL_CONFIGS))
      break
      
    case 'delete':
      if (args[1]) {
        await deleteModel(args[1])
      } else {
        console.log('请指定要删除的模型名称')
      }
      break
      
    case 'cleanup':
      await cleanupModels()
      break
      
    case 'recommended':
      await installRecommendedModel()
      break
      
    default:
      console.log('使用方法:')
      console.log('  bun run tsx scripts/manage-models.ts [命令] [参数]')
      console.log('')
      console.log('命令:')
      console.log('  list/info           - 显示模型信息')
      console.log('  install [模型名]    - 安装指定模型')
      console.log('  install-all         - 安装所有支持的模型')
      console.log('  delete [模型名]     - 删除指定模型')
      console.log('  cleanup             - 清理未使用的模型')
      console.log('  recommended         - 安装推荐模型')
      console.log('')
      console.log('示例:')
      console.log('  bun run tsx scripts/manage-models.ts install llama3.2:7b')
      console.log('  bun run tsx scripts/manage-models.ts cleanup')
  }
}

main()
