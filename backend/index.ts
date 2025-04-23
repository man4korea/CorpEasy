// 📁 backend/index.ts
// Create at 2504232220 Ver1.4

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
import claudeStreamRouter from './routes/claude-stream-router'; // 스트리밍 라우터
import claudeHaikuRouter from './routes/claude-haiku-router'; // Haiku 라우터 추가
import geminiRouter from './routes/gemini-router';
import grokRouter from './routes/grok-router';
import youtubeRouter from './routes/youtube-router';
import aiRouter from './routes/ai-router';
import openaiRouter from './routes/openai-router';
import cojiRouter from './routes/coji-router'; // 코지 라우터
import analyzeRouter from './routes/analyze-router'; // 콘텐츠 분석 라우터 추가

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
    
    // CORS 설정 업데이트 - 더 많은 도메인 허용
    app.use(cors({
      origin: function(origin, callback) {
        // 허용할 도메인 목록
        const allowedOrigins = [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'https://corpeasy-dev.web.app',
          'https://corpeasy-dev.firebaseapp.com',
          process.env.CORS_ALLOWED_ORIGINS
        ].filter(Boolean);
        
        // origin이 없거나 (Postman, curl 등) 허용된 도메인이면 허용
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn(`CORS 오류: 허용되지 않은 출처 ${origin}`);
          callback(null, false);
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Access-Control-Allow-Origin'],
      credentials: true,
      maxAge: 86400 // 24시간 동안 preflight 요청 결과를 캐시
    }));
    
    // 정적 파일 서비스
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
    
    // API 라우트 등록
    app.use('/api/test', testRouter);
    app.use('/api/claude', claudeRouter);
    app.use('/api/claude/stream', claudeStreamRouter);
    app.use('/api/claude-haiku', claudeHaikuRouter);
    app.use('/api/gemini', geminiRouter);
    app.use('/api/grok', grokRouter);
    app.use('/api/youtube', youtubeRouter);
    app.use('/api/ai', aiRouter);
    app.use('/api/openai', openaiRouter);
    app.use('/api/coji', cojiRouter);
    
    // =====================================================
    // 콘텐츠 분석 라우터 등록
    // =====================================================
    app.use('/api/analyze', analyzeRouter);
    
    // =====================================================
    // 호환성을 위한 추가 라우터 등록 (중요: 추가된 부분)
    // =====================================================
    // youtube-transcript 경로 리디렉션
    app.use('/api/youtube-transcript', (req, res, next) => {
      logger.info('호환성 경로 리디렉션: /api/youtube-transcript -> /api/youtube/transcript');
      // GET 요청인 경우 youtube/transcript로 리디렉션
      if (req.method === 'GET') {
        req.url = '/transcript'; // 경로 재설정
        youtubeRouter(req, res, next);  // 직접 YouTube 라우터로 전달
      } else {
        // 다른 HTTP 메서드는 기본 YouTube 라우터로 전달
        req.url = '/';
        youtubeRouter(req, res, next);
      }
    });
    
    // =====================================================
    // openaiRouter를 /api/gpt35 경로에도 등록
    // =====================================================
    app.use('/api/gpt35', openaiRouter);
    
    // CORS 요청 디버깅을 위한 미들웨어
    app.use((req, res, next) => {
      logger.debug(`요청 URL: ${req.url}, 메서드: ${req.method}, 출처: ${req.headers.origin || 'unknown'}`);
      next();
    });
    
    // 캐시 초기화 (안전하게 시도)
    try {
      const cacheType = cache.getCurrentCacheType();
      logger.info(`캐시 시스템 초기화: ${cacheType}`);
      
      // Redis 연결 상태 확인
      if (cacheType === 'memory') {
        logger.warn('메모리 캐시를 사용 중입니다.');
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
        const isUsingMemoryCache = cacheType === 'memory';
        
        cache.getStats().then(stats => {
          res.json({
            status: 'ok',
            cacheType,
            isUsingMemoryCache,
            stats,
            timestamp: new Date().toISOString()
          });
        }).catch(error => {
          res.json({
            status: 'error',
            cacheType,
            isUsingMemoryCache,
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
        const currentType = cache.getCurrentCacheType();
        const isMemoryCache = currentType === 'memory';
        
        if (!isMemoryCache) {
          res.json({
            success: true,
            message: 'Redis가 이미 정상적으로 연결되어 있습니다.',
            cacheType: currentType,
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Redis로 재연결 시도
        try {
          cacheFactory.resetCache('redis');
          const newType = cache.getCurrentCacheType();
          const success = newType === 'redis';
          
          res.json({
            success,
            message: success ? 'Redis 연결이 복구되었습니다.' : 'Redis 연결 복구 실패',
            cacheType: newType,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          cacheFactory.resetCache('memory'); // 실패시 메모리 캐시로 폴백
          res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        res.status(500).json({
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
        },
        apis: {
          claude: true,
          claudeHaiku: true,
          gemini: true,
          grok: true,
          openai: true,
          gpt35: true,
          analyze: true, // 분석 API 추가
          youtubeTranscript: true // YouTube 트랜스크립트 API 추가
        }
      });
    });
    
    // 에러 처리 미들웨어 설정
    setupErrorHandling(app);

    // 서버 시작
    const server = app.listen(PORT, () => {
      logger.info(`서버가 포트 ${PORT}에서 시작되었습니다.`);
      if (isDev) {
        logger.info('개발 모드로 실행 중입니다.');
      }
    });

    // 정상적인 서버 종료 처리
    setupGracefulShutdown(server);

  } catch (error) {
    logger.error('서버 초기화 중 오류 발생:', error);
    process.exit(1);
  }
}

// 정상적인 서버 종료를 위한 함수
function setupGracefulShutdown(server: Server) {
  process.on('SIGTERM', () => {
    logger.info('SIGTERM 신호를 받았습니다. 서버를 정상적으로 종료합니다.');
    gracefulShutdown(server);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT 신호를 받았습니다. 서버를 정상적으로 종료합니다.');
    gracefulShutdown(server);
  });
}

function gracefulShutdown(server: Server) {
  server.close(() => {
    logger.info('서버가 모든 연결을 종료했습니다.');
    process.exit(0);
  });

  // 10초 후에도 종료되지 않으면 강제 종료
  setTimeout(() => {
    logger.error('정상적인 종료가 실패했습니다. 강제 종료합니다.');
    process.exit(1);
  }, 10000);
}

// 서버 초기화 실행
initializeServer();