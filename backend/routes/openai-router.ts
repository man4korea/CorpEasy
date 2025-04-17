// 📁 backend/routes/openai-router.ts
import express from 'express';
import { cache } from '../utils/cache-factory';
import { logger } from '../utils/logger';
import { asyncHandler, ApiError } from '../middlewares/error-handler';
import { callGPT35, callGPT4 } from '../services/openai';

const router = express.Router();

// 응답 시간 측정 미들웨어
router.use((req, res, next) => {
  req.startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    logger.info(`📊 OpenAI API 처리 시간: ${duration}ms`);
  });
  
  next();
});

// 캐시 키 생성 함수
function generateCacheKey(messages: any[], model: string): string {
  const messageKey = messages
    .map(msg => `${msg.role}:${msg.content}`)
    .join('|');
  
  // 타임스탬프 추가하여 매 요청마다 새로운 키 생성
  return `openai:${model}:${messageKey}:${Date.now()}`;
}

// GPT-3.5 엔드포인트
router.post('/gpt35', asyncHandler(async (req, res) => {
  const { messages } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    throw ApiError.badRequest('유효하지 않은 요청 형식', { 
      message: 'messages 필드는 필수이며 배열이어야 합니다.'
    });
  }
  
  // API 키 확인
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw ApiError.internalError('API 키가 설정되지 않았습니다.');
  }
  
  logger.info('🔍 GPT-3.5 API 요청 수행');
  
  try {
    const content = await callGPT35(messages);
    
    const result = {
      content,
      model: 'gpt-3.5-turbo',
      timestamp: new Date().toISOString()
    };
    
    return res.json(result);
  } catch (error: any) {
    logger.error('🔥 GPT-3.5 API 호출 오류:', error);
    throw ApiError.internalError(error.message || 'GPT-3.5 API 호출 중 오류 발생');
  }
}));

// GPT-4 엔드포인트
router.post('/gpt4', asyncHandler(async (req, res) => {
  const { messages } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    throw ApiError.badRequest('유효하지 않은 요청 형식', { 
      message: 'messages 필드는 필수이며 배열이어야 합니다.'
    });
  }
  
  // API 키 확인
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw ApiError.internalError('API 키가 설정되지 않았습니다.');
  }
  
  logger.info('🔍 GPT-4 API 요청 수행');
  
  try {
    const content = await callGPT4(messages);
    
    const result = {
      content,
      model: 'gpt-4',
      timestamp: new Date().toISOString()
    };
    
    return res.json(result);
  } catch (error: any) {
    logger.error('🔥 GPT-4 API 호출 오류:', error);
    throw ApiError.internalError(error.message || 'GPT-4 API 호출 중 오류 발생');
  }
}));

export default router; 