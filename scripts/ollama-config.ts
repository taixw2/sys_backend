// Ollama 配置文件
export const OLLAMA_CONFIG = {
  // 基础配置
  baseUrl: 'http://192.168.31.136:11434',
  
  // 模型配置 - 可以根据需要修改
  model: 'modelscope.cn/unsloth/Qwen3-30B-A3B-Instruct-2507-GGUF', // 使用已安装的模型
  
  // 生成参数
  maxTokens: 1500,
  temperature: 0.3,
  
  // 请求配置
  timeout: 30000, // 30秒超时
  retryCount: 3,  // 重试次数
  
  // 支持的模型列表
  supportedModels: [
    'gpt-oss:20b',      // 已安装的高质量模型
    'modelscope.cn/unsloth/Qwen3-30B-A3B-Instruct-2507-GGUF',
    'llama3.2:3b',      // 轻量级，适合快速生成
    'llama3.2:7b',      // 平衡性能和速度
    'llama3.2:8b',      // 更好的质量
    'llama3.2:70b',     // 最高质量，但较慢
    'mistral:7b',       // Mistral 模型
    'qwen2.5:3b',       // 阿里云模型
    'qwen2.5:7b',       // 阿里云模型
    'gemma2:2b',        // Google 模型
    'gemma2:7b',        // Google 模型
  ]
}

// 模型性能配置
export const MODEL_CONFIGS = {
  'gpt-oss:20b': {
    maxTokens: 2000,
    temperature: 0.2,
    description: '高质量开源模型，性能优秀'
  },
  'modelscope.cn/unsloth/Qwen3-30B-A3B-Instruct-2507-GGUF': {
    maxTokens: 2000,
    temperature: 0.2,
    description: '高质量开源模型，性能优秀'
  },
  'llama3.2:3b': {
    maxTokens: 1000,
    temperature: 0.3,
    description: '轻量级模型，速度快，适合基础任务'
  },
  'llama3.2:7b': {
    maxTokens: 1500,
    temperature: 0.3,
    description: '平衡模型，性能和质量都不错'
  },
  'llama3.2:8b': {
    maxTokens: 2000,
    temperature: 0.2,
    description: '高质量模型，适合复杂任务'
  },
  'llama3.2:70b': {
    maxTokens: 3000,
    temperature: 0.1,
    description: '最高质量模型，但速度较慢'
  },
  'mistral:7b': {
    maxTokens: 1500,
    temperature: 0.3,
    description: 'Mistral 模型，性能优秀'
  },
  'qwen2.5:3b': {
    maxTokens: 1000,
    temperature: 0.3,
    description: '阿里云轻量级模型'
  },
  'qwen2.5:7b': {
    maxTokens: 1500,
    temperature: 0.3,
    description: '阿里云平衡模型'
  },
  'gemma2:2b': {
    maxTokens: 800,
    temperature: 0.3,
    description: 'Google 轻量级模型'
  },
  'gemma2:7b': {
    maxTokens: 1500,
    temperature: 0.3,
    description: 'Google 平衡模型'
  }
}

// 获取模型配置
export function getModelConfig(modelName: string) {
  return MODEL_CONFIGS[modelName] || MODEL_CONFIGS['llama3.2:3b']
}

// 验证模型是否支持
export function isModelSupported(modelName: string): boolean {
  return OLLAMA_CONFIG.supportedModels.includes(modelName)
}

// 获取推荐模型
export function getRecommendedModel(): string {
  return 'modelscope.cn/unsloth/Qwen3-30B-A3B-Instruct-2507-GGUF' // 推荐使用 7B 模型，平衡性能和速度
}
