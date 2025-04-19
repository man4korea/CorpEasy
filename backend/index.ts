// 📁 backend/index.ts
// Create at 2504191535

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import helmet from 'helmet';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './utils/logger';
import { setupErrorHandling } from './middlewares/error-handler';
import { clientAuthMiddleware, apiKeyMiddleware, setupAuthRoutes } from './middlewares/auth-middleware';
import { cache, cacheFactory } from './utils/cache-factory';
import { Server } from 'http';

// ES 모듈에서 __dirname 에뮬레이션
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 라우터 import
import testRouter from './routes/test-router';
import claudeRouter from './routes/claude-router';
import claudeStreamRouter from './routes/claude-stream-router'; // 새로운 스트리밍 라우터 추가
import geminiRouter from './routes/gemini-router';
import grokRouter from './routes/grok-router';
import youtubeRouter from './routes/youtube-router';
import aiRouter from './routes/ai-router';
import openaiRouter from './routes/openai-router';
import cojiRouter from './routes/coji-router'; // 코지 라우터 추가

// 환경변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const isDev = process.env.NODE_ENV !== 'production';

// 로그 디렉토리 생성 함수
async function createLogDirs() {
  const logDir = path.join(__dirname, '../logs');
  await fs.mkdir(logDir, { recursive: true });
  logger.info(`로그 디렉토리 생성됨: ${logDir}`);
}

// 서버 초기화 함수
async function initializeServer() {
  try {
    // 로그 디렉토리 생성
    await createLogDirs();
    
    // 기본 미들웨어 설정
    app.use(helmet());
    app.use(compression());
    app.use(express.json({ limit: '10mb' }));
    app.use(cors({
      origin: process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
      credentials: true
    }));
    app.use(express.static('public'));
    
    // API 키 인증 미들웨어 (개발 환경에서는 패스)
    if (!isDev) {
      app.use('/api', apiKeyMiddleware);
    }
    
    // 클라이언트 인증 미들웨어 (선택적으로 활성화)
    if (process.env.ENABLE_CLIENT_AUTH === 'true') {
      app.use('/api', clientAuthMiddleware);
    }
    
    // 인증 라우트 설정 (클라이언트 토큰 발급)
    setupAuthRoutes(app);
    
    // API 라우트
    app.use('/api/test', testRouter);
    app.use('/api/claude', claudeRouter);
    app.use('/api/claude/stream', claudeStreamRouter); // 스트리밍 라우터 추가
    app.use('/api/gemini', geminiRouter);
    app.use('/api/grok', grokRouter);
    app.use('/api/youtube', youtubeRouter);
    app.use('/api/ai', aiRouter);
    app.use('/api/openai', openaiRouter);
    app.use('/api/coji', cojiRouter); // 코지 라우터 등록
    
    // 캐시 초기화 (안전하게 시도)
    try {
      const cacheType = cache.getCurrentCacheType();
      logger.info(`캐시 시스템 초기화: ${cacheType}`);
      
      // Redis 사용 중이지만 폴백 상태인 경우 경고 표시
      if (cacheFactory.isUsingFallback && cacheFactory.isUsingFallback()) {
        logger.warn('Redis 연결 실패로 메모리 캐시를 사용합니다.');
      }
    } catch (cacheError) {
      logger.warn('캐시 초기화 중 오류 발생, 메모리 캐시를 사용합니다:', cacheError);
      // 오류 발생 시 메모리 캐시로 강제 전환
      cacheFactory.resetCache('memory');
    }
    
    // Redis 상태 모니터링 엔드포인트 추가
    app.get('/api/system/cache-status', (req, res) => {
      try {
        const cacheType = cache.getCurrentCacheType();
        const isUsingFallback = cacheFactory.isUsingFallback && cacheFactory.isUsingFallback();
        
        cache.getStats().then(stats => {
          res.json({
            status: 'ok',
            cacheType,
            isUsingFallback,
            stats,
            timestamp: new Date().toISOString()
          });
        }).catch(error => {
          res.json({
            status: 'error',
            cacheType,
            isUsingFallback,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        });
      } catch (error) {
        res.json({
          status: 'error',
          error: 'Cache status check failed',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Redis 복구 시도 엔드포인트 추가
    app.post('/api/system/redis-recover', async (req, res) => {
      try {
        const recovery = await cacheFactory.attemptRedisRecovery();
        res.json({
          success: recovery,
          message: recovery ? 'Redis 연결이 복구되었습니다.' : 'Redis 연결 복구 실패',
          cacheType: cache.getCurrentCacheType(),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // 상태 엔드포인트
    app.get('/status', (req, res) => {
      const cacheType = (() => {
        try {
          return cache.getCurrentCacheType();
        } catch (e) {
          return 'unknown (error)';
        }
      })();
      
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        cache: {
          type: cacheType,
          status: 'operational'
        }
      });
    });
    
    // 공통 오류 처리 미들웨어 설정
    setupErrorHandling(app);
    
    // 서버 시작
    const server = app.listen(PORT, () => {
      logger.info(`✅ AI API 서버 실행 중: http://localhost:${PORT}`);
      logger.info(`모드: ${isDev ? '개발' : '프로덕션'}`);
      
      try {
        logger.info(`캐시 타입: ${cache.getCurrentCacheType()}`);
      } catch (e) {
        logger.warn('캐시 타입 확인 실패, 기본 메모리 캐시 사용');
      }
    });

    // 종료 이벤트 핸들러 설정
    setupShutdownHandlers(server);
    
    // Redis 자동 복구 시도 (10분마다)
    if (!isDev) {
      setInterval(async () => {
        if (cacheFactory.isUsingFallback && cacheFactory.isUsingFallback()) {
          logger.info('자동 Redis 복구 시도 중...');
          const success = await cacheFactory.attemptRedisRecovery();
          if (success) {
            logger.info('Redis 연결 자동 복구 성공!');
          }
        }
      }, 600000); // 10분
    }
  } catch (error) {
    logger.error('서버 초기화 오류:', error);
    
    // Redis 연결 실패 등 캐시 관련 오류는 서버 종료하지 않음
    if (error.message && error.message.includes('Redis')) {
      logger.warn('Redis 연결 실패로 메모리 캐시를 사용합니다.');
      
      // 메모리 캐시로 강제 전환 시도
      try {
        cacheFactory.resetCache('memory');
        logger.info('메모리 캐시로 재설정 완료');
        
        // 서버 계속 실행 (재귀 호출 방지를 위해 initializeWithMemoryCache 사용)
        initializeWithMemoryCache();
      } catch (e) {
        logger.error('메모리 캐시 초기화 실패:', e);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

/**
 * 메모리 캐시로 서버 초기화 
 * Redis 연결 실패 시 메모리 캐시만 사용하여 안전하게 서버 시작
 */
async function initializeWithMemoryCache() {
  try {
    // 메모리 캐시 강제 설정
    cacheFactory.resetCache('memory');
    logger.info('메모리 캐시만 사용하여 서버를 시작합니다');
    
    // 서버 시작
    const server = app.listen(PORT, () => {
      logger.info(`✅ AI API 서버 실행 중 (메모리 캐시 모드): http://localhost:${PORT}`);
      logger.info(`모드: ${isDev ? '개발' : '프로덕션'}`);
      logger.info('캐시 타입: memory (forced fallback)');
    });
    
    // 종료 이벤트 핸들러 설정
    setupShutdownHandlers(server);
  } catch (error) {
    logger.error('메모리 캐시 서버 초기화 실패:', error);
    process.exit(1);
  }
}

// 서버 종료 핸들러 설정
function setupShutdownHandlers(server: Server) {
  const shutdown = () => {
    logger.info('서버 종료 중...');
    server.close(() => {
      logger.info('서버가 정상적으로 종료되었습니다.');
      process.exit(0);
    });

    // 10초 후에도 종료되지 않으면 강제 종료
    setTimeout(() => {
      logger.error('서버 종료 시간 초과, 강제 종료합니다.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // 처리되지 않은 예외 처리
  process.on('uncaughtException', (err) => {
    logger.error('처리되지 않은 예외:', err);
    if (!isDev) {
      process.exit(1);
    }
  });

  // 처리되지 않은 Promise 거부 처리
  process.on('unhandledRejection', (reason) => {
    logger.error('처리되지 않은 Promise 거부:', reason);
  });
}

// 서버 초기화 및 시작
initializeServer().catch(error => {
  logger.error('서버 초기화 오류:', error);
  process.exit(1);
});