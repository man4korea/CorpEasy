import dotenv from 'dotenv';
import path from 'path';

// 환경 변수 로드
dotenv.config();

// 환경 설정
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const isDev = NODE_ENV === 'development';
const isTest = NODE_ENV === 'test';

// 기본 설정
const config = {
  env: NODE_ENV,
  isProd,
  isDev,
  isTest,
  
  // 서버 설정
  server: {
    port: parseInt(process.env.PORT || '3002', 10),
    host: process.env.HOST || 'localhost',
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  },
  
  // 로깅 설정
  logging: {
    level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
    format: isProd ? 'json' : 'pretty',
    directory: process.env.LOG_DIR || path.join(process.cwd(), 'logs')
  },
  
  // 캐시 설정
  cache: {
    type: process.env.CACHE_TYPE || 'memory',
    ttl: parseInt(process.env.CACHE_TTL || '600', 10),
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || ''
    }
  },
  
  // AI API 설정
  ai: {
    grok: {
      timeout: parseInt(process.env.GROK_TIMEOUT || '30000', 10),
      model: process.env.GROK_MODEL || 'grok-3-beta',
      maxRetries: parseInt(process.env.GROK_MAX_RETRIES || '2', 10)
    },
    claude: {
      timeout: parseInt(process.env.CLAUDE_TIMEOUT || '60000', 10),
      model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307'
    },
    gemini: {
      timeout: parseInt(process.env.GEMINI_TIMEOUT || '30000', 10),
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash-8b'
    }
  }
};

export default config; 