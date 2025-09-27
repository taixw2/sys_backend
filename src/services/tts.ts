import OSS from 'ali-oss';
import { createHash } from 'crypto';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { convertToMp3 } from '../utils/convertToMp3';

export interface TTSOptions {
  text: string;
  voice?: string;
  speed?: number;
}

export interface TTSResult {
  success: boolean;
  url?: string;
  error?: string;
  cached?: boolean;
}

class TTSService {
  private ossClient: OSS;
  private piperUrl: string;
  private tempDir: string;

  constructor() {
    // 初始化阿里云 OSS 客户端
    this.ossClient = new OSS({
      region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou',
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
      bucket: process.env.ALIYUN_OSS_BUCKET || 'english-admin-tts',
    });

    console.log("ALIYUN_OSS_REGION", process.env.ALIYUN_OSS_REGION);
    console.log("ALIYUN_ACCESS_KEY_ID", process.env.ALIYUN_ACCESS_KEY_ID);
    console.log("ALIYUN_ACCESS_KEY_SECRET", process.env.ALIYUN_ACCESS_KEY_SECRET);
    console.log("ALIYUN_OSS_BUCKET", process.env.ALIYUN_OSS_BUCKET);

    // Piper HTTP 服务器地址
    this.piperUrl = process.env.PIPER_URL || 'http://localhost:5500';
    
    // 临时文件目录
    this.tempDir = process.env.TTS_TEMP_DIR || './temp/tts';
    
    // 确保临时目录存在
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    if (!existsSync(this.tempDir)) {
      await mkdir(this.tempDir, { recursive: true });
    }
  }

  computeHash16(content: string): string {
    const md5 = createHash('md5').update(content, 'utf8').digest('hex');
    return md5.substring(8, 24);
  }

  /**
   * 生成文本的 MD5 哈希值作为文件名
   */
  private generateFileName(text: string, voice: string = 'en_GB-northern_english_male-medium'): string {
    const type: 'US' | 'UK' = voice.includes('US') ? 'US' : 'UK';
    const content = `${text}_${type}`;
    return `audio/sentence/${this.computeHash16(content)}.mp3`;
  }

  /**
   * 检查 OSS 中是否已存在该音频文件
   */
  private async checkFileExists(fileName: string): Promise<boolean> {
    try {
      await this.ossClient.head(fileName);
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 调用 Piper HTTP API 生成音频
   */
  private async generateAudio(text: string, voice: string = 'en_GB-northern_english_male-medium'): Promise<Buffer> {
    const response = await fetch(this.piperUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice: voice,
      }),
    });

    if (!response.ok) {
      throw new Error(`Piper API error: ${response.status} ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * 使用 ffmpeg 将音频转换为 MP3
   */
  private async convertToMp3(inputBuffer: Buffer, outputPath: string): Promise<void> {
    // 先保存音频数据到临时文件
    const tempWavPath = outputPath.replace('.mp3', '.wav');
    await writeFile(tempWavPath, inputBuffer);
    
    try {
      // 使用工具函数转换
      await convertToMp3(tempWavPath, outputPath, {
        quality: 2, // 高质量
        maxRetries: 3,
        retryDelay: 1000
      });
    } finally {
      // 清理临时文件
      await this.cleanupTempFile(tempWavPath);
    }
  }

  /**
   * 上传文件到阿里云 OSS
   */
  private async uploadToOSS(filePath: string, fileName: string): Promise<string> {
    const result = await this.ossClient.put(fileName, filePath);
    return result.url;
  }

  /**
   * 清理临时文件
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error) {
      console.warn(`Failed to cleanup temp file ${filePath}:`, error);
    }
  }

  /**
   * 文本转语音主方法
   */
  async textToSpeech(options: TTSOptions): Promise<TTSResult> {
    const { text, voice = 'en_GB-northern_english_male-medium' } = options;
    
    try {
      // 生成文件名
      const fileName = this.generateFileName(text, voice);
      
      // 检查文件是否已存在
      const exists = await this.checkFileExists(fileName);
      if (exists) {
        const url = `https://${process.env.ALIYUN_OSS_BUCKET || 'english-admin-tts'}.${process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou'}.aliyuncs.com/${fileName}`;
        return {
          success: true,
          url,
          cached: true,
        };
      }

      // 生成音频
      console.log(`Generating audio for text: ${text.substring(0, 50)}...`);
      const audioBuffer = await this.generateAudio(text, voice);

      // 创建临时文件路径
      const tempMp3Path = join(this.tempDir, `temp_${Date.now()}.mp3`);

      try {
        // 转换为 MP3
        console.log('Converting to MP3...');
        await this.convertToMp3(audioBuffer, tempMp3Path);

        // 上传到 OSS
        console.log('Uploading to OSS...');
        const url = await this.uploadToOSS(tempMp3Path, fileName);

        // 清理临时文件
        await this.cleanupTempFile(tempMp3Path);

        return {
          success: true,
          url,
          cached: false,
        };

      } catch (error) {
        // 确保清理临时文件
        await this.cleanupTempFile(tempMp3Path);
        throw error;
      }

    } catch (error: any) {
      console.error('TTS Error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * 获取可用的语音列表
   */
  getAvailableVoices(): string[] {
    return [
      'en_GB-northern_english_male-medium',
      'en_US-hfc_female-medium'
    ];
  }
}

export const ttsService = new TTSService();
