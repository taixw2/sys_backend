import { Elysia, t } from 'elysia';
import { ttsService } from '../../services/tts';

export const ttsRoutes = new Elysia({ prefix: '/tts' })
  .post(
    '/speak',
    async ({ body, set }) => {
      try {
        const { text, voice, speed } = body as {
          text: string;
          voice?: string;
          speed?: number;
        };

        // 验证输入
        if (!text || typeof text !== 'string') {
          set.status = 400;
          return {
            success: false,
            error: 'Text is required and must be a string',
          };
        }

        if (text.length > 1000) {
          set.status = 400;
          return {
            success: false,
            error: 'Text length cannot exceed 1000 characters',
          };
        }

        // 调用 TTS 服务
        const result = await ttsService.textToSpeech({
          text,
          voice,
          speed,
        });

        if (!result.success) {
          set.status = 500;
        }

        return result;
      } catch (error: any) {
        console.error('TTS Route Error:', error);
        set.status = 500;
        return {
          success: false,
          error: 'Internal server error',
        };
      }
    },
    {
      body: t.Object({
        text: t.String({
          minLength: 1,
          maxLength: 1000,
          description: 'Text to convert to speech',
        }),
        voice: t.Optional(t.String({
          description: 'Voice to use for speech synthesis',
        })),
        speed: t.Optional(t.Number({
          minimum: 0.5,
          maximum: 2.0,
          description: 'Speech speed (0.5 to 2.0)',
        })),
      }),
      detail: {
        tags: ['tts'],
        summary: 'Convert text to speech',
        description: 'Convert English text to speech using Piper TTS and upload to Aliyun OSS',
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    url: { type: 'string', description: 'URL of the generated audio file' },
                    cached: { type: 'boolean', description: 'Whether the file was already cached' },
                    error: { type: 'string', description: 'Error message if failed' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    error: { type: 'string' },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    error: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    }
  )
  .get(
    '/voices',
    async ({ set }) => {
      try {
        const voices = ttsService.getAvailableVoices();
        return {
          success: true,
          voices,
        };
      } catch (error: any) {
        console.error('Get Voices Error:', error);
        set.status = 500;
        return {
          success: false,
          error: 'Failed to get available voices',
        };
      }
    },
    {
      detail: {
        tags: ['tts'],
        summary: 'Get available voices',
        description: 'Get list of available voices for text-to-speech',
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    voices: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'List of available voice names',
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    error: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    }
  )
  .get(
    '/health',
    async ({ set }) => {
      try {
        // 检查 Piper 服务是否可用
        const response = await fetch(process.env.PIPER_URL || 'http://127.0.0.1:5500', {
          method: 'GET',
        });

        const piperStatus = response.ok ? 'healthy' : 'unhealthy';

        return {
          success: true,
          status: 'healthy',
          services: {
            piper: piperStatus,
            oss: 'configured', // 假设 OSS 配置正确
          },
        };
      } catch (error: any) {
        console.error('TTS Health Check Error:', error);
        set.status = 503;
        return {
          success: false,
          status: 'unhealthy',
          error: 'TTS service is not available',
        };
      }
    },
    {
      detail: {
        tags: ['tts'],
        summary: 'TTS service health check',
        description: 'Check the health status of TTS services',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    status: { type: 'string', example: 'healthy' },
                    services: {
                      type: 'object',
                      properties: {
                        piper: { type: 'string', example: 'healthy' },
                        oss: { type: 'string', example: 'configured' },
                      },
                    },
                  },
                },
              },
            },
          },
          503: {
            description: 'Service is unhealthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    status: { type: 'string', example: 'unhealthy' },
                    error: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    }
  );
