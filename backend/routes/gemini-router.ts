// 📁 backend/routes/gemini-router.ts
// Gemini API 라우터

import express from 'express';
import axios from 'axios';
import { cache } from '../utils/cache-factory';
import { logger } from '../utils/logger';
import { asyncHandler, ApiError } from '../middlewares/error-handler';
import { callGemini } from '../services/gemini';

const router = express.Router();

// 응답 시간 측정 미들웨어
router.use((req, res, next) => {
  req.startTime = Date.now();
  
  // 응답 완료 후 시간 기록
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    logger.info(`📊 Gemini API 처리 시간: ${duration}ms`);
  });
  
  next();
});

// 메인 Gemini 엔드포인트
router.post('/', asyncHandler(async (req, res) => {
  const { prompt, options } = req.body;
  const temperature = options?.temperature || 0.7;
  const model = options?.model || 'gemini-1.5-flash-8b';
  
  if (!prompt) {
    throw ApiError.badRequest('유효하지 않은 요청 형식', { 
      message: 'prompt 필드는 필수입니다.'
    });
  }
  
  logger.info('🔍 Gemini API 요청 수행');
  
  try {
    const response = await callGemini(prompt, model, temperature);
    
    // 응답 객체 구성
    const result = {
      response: response,
      model: model,
      timestamp: new Date().toISOString()
    };
    
    return res.json(result);
  } catch (error: any) {
    logger.error('🔥 Gemini API 호출 오류:', error);
    
    if (error.response) {
      throw ApiError.apiClientError('Gemini API 호출 실패', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    throw ApiError.internalError(error.message || 'Gemini API 호출 중 오류 발생');
  }
}));

// 상태 확인 엔드포인트
router.get('/status', asyncHandler(async (req, res) => {
  try {
    // 간단한 테스트 프롬프트로 API 키 유효성 확인
    const response = await callGemini('Hello', 'gemini-1.5-flash-8b');
    
    // 캐시 상태 정보 조회
    const cacheStats = await cache.getStats();
    
    res.json({
      status: 'ok',
      apiValid: true,
      model: 'gemini-1.5-flash-8b',
      cache: {
        type: cacheStats.type,
        size: cacheStats.size,
        hitRate: cacheStats.hitRate
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    let message = error.message || 'Gemini API 호출 실패';
    
    res.json({
      status: 'error',
      apiValid: false,
      message,
      timestamp: new Date().toISOString()
    });
  }
}));

export default router;