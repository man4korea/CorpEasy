// 📁 backend/routes/ai-router.ts
// 다양한 AI API를 통합하는 라우터

import express from 'express';
import { cache } from '../utils/cache-factory';
import { logger } from '../utils/logger';
import { asyncHandler, ApiError } from '../middlewares/error-handler';
import { callClaude } from '../services/claude';
import { callGemini } from '../services/gemini';
import { callGrok } from '../services/grok';

const router = express.Router();

// 응답 시간 측정 미들웨어
router.use((req, res, next) => {
  req.startTime = Date.now();
  
  // 응답 완료 후 시간 기록
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    logger.info(`📊 AI API 처리 시간: ${duration}ms (${req.method} ${req.path})`);
  });
  
  next();
});

/**
 * AI 생성 요청에 대한 캐시 키 생성
 */
function generateCacheKey(model: string, prompt: string, options: any = {}): string {
  const optionsKey = JSON.stringify(options);
  return `ai:${model}:${prompt.substring(0, 100)}:${optionsKey}`;
}

/**
 * 통합 AI 생성 엔드포인트
 * 여러 AI 모델을 하나의 일관된 인터페이스로 제공
 */
router.post('/generate', asyncHandler(async (req, res) => {
  const { model = 'claude', prompt, messages, options = {} } = req.body;

  // 요청 검증
  if (!prompt && !messages) {
    throw ApiError.badRequest('유효하지 않은 요청 형식', { 
      message: 'prompt 또는 messages 필드가 필요합니다.' 
    });
  }

  // 캐시 키 생성 및 캐시 확인
  const cacheKey = generateCacheKey(model, prompt || JSON.stringify(messages), options);
  const cachedResponse = await cache.get(cacheKey);
  
  if (cachedResponse) {
    logger.info(`🎯 AI 캐시 히트: ${model}`);
    return res.json(cachedResponse);
  }
  
  logger.info(`🔍 AI 캐시 미스: ${model} 요청 수행`);

  try {
    let response;
    let modelInfo;

    // 모델별 처리 분기
    switch (model.toLowerCase()) {
      case 'claude':
      case 'claude-3':
      case 'claude-3-opus':
      case 'claude-3-sonnet':
      case 'claude-3-haiku':
        const claudeMessages = messages || [{ role: 'user', content: prompt }];
        response = await callClaude(claudeMessages, options);
        modelInfo = options.model || 'claude-3-sonnet-20240229';
        break;

      case 'gemini':
      case 'gemini-pro':
        if (!prompt) {
          throw ApiError.badRequest('Gemini API에는 prompt 필드가 필요합니다');
        }
        response = await callGemini(prompt);
        modelInfo = 'gemini-1.5-pro';
        break;

      case 'grok':
        const grokMessages = messages || [{ role: 'user', content: prompt }];
        response = await callGrok(grokMessages);
        modelInfo = 'grok-3-beta';
        break;

      default:
        throw ApiError.badRequest('지원하지 않는 모델: ' + model);
    }

    // 응답 구성 및 캐시 저장
    const result = {
      response,
      model: modelInfo,
      timestamp: new Date().toISOString()
    };

    // 30분 TTL로 캐시 저장
    await cache.set(cacheKey, result, 1800);

    return res.json(result);
  } catch (error: any) {
    logger.error(`🔥 ${model} API 호출 오류:`, error);
    
    if (error.response) {
      throw ApiError.apiClientError(`${model} API 호출 실패`, {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    throw ApiError.internalError(error.message || `${model} API 호출 중 오류 발생`);
  }
}));

/**
 * AI 서비스 상태 확인 엔드포인트
 */
router.get('/status', asyncHandler(async (req, res) => {
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GOOGLE_API_KEY;
  const grokKey = process.env.GROK_API_KEY;
  
  const cacheStats = await cache.getStats();

  const status = {
    claude: {
      available: !!claudeKey,
      message: claudeKey ? 'API 키가 설정되어 있습니다' : 'API 키가 설정되지 않았습니다'
    },
    gemini: {
      available: !!geminiKey,
      message: geminiKey ? 'API 키가 설정되어 있습니다' : 'API 키가 설정되지 않았습니다'
    },
    grok: {
      available: !!grokKey,
      message: grokKey ? 'API 키가 설정되어 있습니다' : 'API 키가 설정되지 않았습니다'
    },
    cache: {
      type: cacheStats.type,
      size: cacheStats.size,
      hitRate: cacheStats.hitRate
    },
    timestamp: new Date().toISOString()
  };

  return res.json(status);
}));

/**
 * 기본 정보 엔드포인트
 */
router.get('/', (req, res) => {
  res.json({
    name: 'AI API Service',
    endpoints: [
      {
        path: '/api/generate',
        method: 'POST',
        description: '여러 AI 모델을 사용하여 텍스트 생성',
        parameters: {
          model: '사용할 모델 (claude, gemini, grok)',
          prompt: '단일 프롬프트 (선택적)',
          messages: '메시지 배열 (선택적)',
          options: '추가 옵션 (선택적)'
        }
      },
      {
        path: '/api/claude',
        method: 'POST',
        description: 'Claude API 직접 호출'
      },
      {
        path: '/api/gemini',
        method: 'POST',
        description: 'Gemini API 직접 호출'
      },
      {
        path: '/api/grok',
        method: 'POST',
        description: 'Grok API 직접 호출'
      },
      {
        path: '/api/status',
        method: 'GET',
        description: '모든 모델의 상태 확인'
      }
    ],
    version: '1.0.0'
  });
});

export default router;