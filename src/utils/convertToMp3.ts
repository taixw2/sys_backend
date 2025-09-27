import { run } from './run.ts';

export interface ConvertOptions {
  useGpu?: boolean;
  gpuType?: 'nvidia' | 'amd' | 'intel' | 'apple';
  quality?: number; // 1-9, lower is better
  maxRetries?: number; // 最大重试次数
  retryDelay?: number; // 重试间隔（毫秒）
}

export async function convertToMp3(
  inputPath: string, 
  outputPath: string, 
  options: ConvertOptions = {},
  ffmpegLimiter?: (fn: () => Promise<any>) => Promise<any>
): Promise<void> {
  const { 
    useGpu = false, 
    gpuType = 'nvidia', 
    quality = 2, 
    maxRetries = 3, 
    retryDelay = 1000 
  } = options;
  
  let ffmpegArgs = ['-y', '-i', inputPath];
  
  if (useGpu) {
    // GPU加速音频编码参数（注意：这里只处理音频，不处理视频）
    switch (gpuType) {
      case 'nvidia':
        // NVIDIA NVENC 主要用于视频，音频仍用CPU
        ffmpegArgs.push('-codec:a', 'libmp3lame', '-q:a', quality.toString());
        break;
      case 'amd':
        // AMD AMF 主要用于视频，音频仍用CPU
        ffmpegArgs.push('-codec:a', 'libmp3lame', '-q:a', quality.toString());
        break;
      case 'intel':
        // Intel QSV 主要用于视频，音频仍用CPU
        ffmpegArgs.push('-codec:a', 'libmp3lame', '-q:a', quality.toString());
        break;
      case 'apple':
        // Apple VideoToolbox 主要用于视频，音频仍用CPU
        ffmpegArgs.push('-codec:a', 'libmp3lame', '-q:a', quality.toString());
        break;
    }
  } else {
    // CPU编码，使用libmp3lame
    ffmpegArgs.push('-codec:a', 'libmp3lame', '-q:a', quality.toString());
  }
  
  ffmpegArgs.push(outputPath);
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const runFFmpeg = () => run('ffmpeg', ffmpegArgs, { quiet: true });
      if (ffmpegLimiter) {
        await ffmpegLimiter(runFFmpeg);
      } else {
        await runFFmpeg();
      }
      
      // 转换成功，直接返回
      return;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        console.warn(`⚠️  FFmpeg转换失败 (尝试 ${attempt}/${maxRetries}): ${inputPath} -> ${outputPath}`);
        console.warn(`   错误信息: ${lastError.message}`);
        console.warn(`   等待 ${retryDelay}ms 后重试...`);
        
        // 等待指定时间后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        // 最后一次尝试失败，抛出错误
        console.error(`❌ FFmpeg转换最终失败 (${maxRetries}次尝试后): ${inputPath} -> ${outputPath}`);
        console.error('FFmpeg参数:', ffmpegArgs.join(' '));
        throw lastError;
      }
    }
  }
}

// 检测系统支持的GPU类型
export async function detectGpuSupport(): Promise<{
  nvidia: boolean;
  amd: boolean;
  intel: boolean;
  apple: boolean;
}> {
  try {
    // 检查FFmpeg是否支持各种GPU编解码器
    const { execSync } = await import('node:child_process');
    
    const checkCodec = (codec: string): boolean => {
      try {
        execSync(`ffmpeg -hide_banner -encoders | grep -i ${codec}`, { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    };
    
    return {
      nvidia: checkCodec('nvenc'),
      amd: checkCodec('amf'),
      intel: checkCodec('qsv'),
      apple: checkCodec('videotoolbox')
    };
  } catch (error) {
    console.warn('无法检测GPU支持:', error);
    return {
      nvidia: false,
      amd: false,
      intel: false,
      apple: false
    };
  }
}
