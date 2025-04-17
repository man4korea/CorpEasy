// 📁 backend/routes/test-router.ts
// 간단한 테스트 라우터 (ping, hello)

import express from 'express';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middlewares/error-handler';

const router = express.Router();

// 요청 시간 측정 미들웨어
router.use((req, res, next) => {
  req.startTime = Date.now();
  
  // 응답 완료 후 시간 기록
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    logger.debug(`📊 테스트 라우트 처리 시간: ${duration}ms (${req.method} ${req.path})`);
  });
  
  next();
});

// 기본 핑퐁 테스트
router.get('/ping', (req, res) => {
  res.json({
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

// 인사 테스트
router.get('/hello', (req, res) => {
  const name = req.query.name || 'World';
  
  res.json({
    message: `Hello, ${name}!`,
    timestamp: new Date().toISOString()
  });
});

// 시스템 정보 테스트
router.get('/info', asyncHandler(async (req, res) => {
  // 시스템 정보 수집
  const info = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development',
    apis: {
      claude: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GOOGLE_API_KEY,
      grok: !!process.env.GROK_API_KEY
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(info);
}));

// 에코 테스트
router.post('/echo', (req, res) => {
  res.json({
    echo: req.body,
    headers: req.headers,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

export default router;