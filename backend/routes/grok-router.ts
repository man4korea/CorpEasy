// 📁 backend/routes/grok-router.ts
// Grok API 라우터 (최적화 버전 - 간소화됨)

import express, { Request, Response, NextFunction } from 'express';
import { cache } from '../utils/cache-factory';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middlewares/error-handler';
import { callGrok, callGrokStream, GrokMessage, GrokOptions } from '../services/grok';
import crypto from 'crypto';

const router = express.Router();

// 응답 시간 측정 미들웨어 (성능 모니터링)
router.use((req: Request, res: Response, next: NextFunction) => {
  req.startTime = Date.now();
  
  // 응답 완료 후 시간 기록
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    const status = res.statusCode;
    const logMethod = status >= 400 ? 'warn' : (duration > 20000 ? 'warn' : 'info');
    
    logger[logMethod](`📊 Grok API ${req.method} ${req.path} - 상태: ${status}, 처리 시간: ${Math.round(duration)}ms`);
  });
  
  next();
});

// 캐시 키 생성 함수 (최적화됨)
function generateCacheKey(messages: GrokMessage[], temperature: number = 0.7): string {
  // 메시지 내용과 temperature를 기반으로 해시 생성
  const messageContent = messages
    .map(msg => `${msg.role}:${msg.content.slice(0, 500)}`) // 각 메시지 앞부분만 사용
    .join('|');
  
  // 메시지 내용 해시화
  const hash = crypto
    .createHash('sha256')
    .update(`grok:${messageContent}:${temperature}`)
    .digest('hex')
    .slice(0, 16); // 16자만 사용하여 해시 길이 축소
  
  return `grok:${hash}:${temperature.toFixed(1)}`;
}

// 캐시 유효성 검사
function isValidCache(cachedData: any, maxAge: number = 10 * 60 * 1000): boolean {
  if (!cachedData || typeof cachedData !== 'object') return false;
  
  // 캐시 생성 시간 확인
  if (!cachedData.timestamp) return false;
  
  // 캐시된 시간이 지정된 최대 시간을 초과하면 무효화
  const cacheTime = new Date(cachedData.timestamp).getTime();
  const now = Date.now();
  
  return (now - cacheTime) <= maxAge;
}

// API 키 확인 함수
function validateApiKey(): string {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    throw new Error('GROK_API_KEY가 설정되지 않았습니다');
  }
  return apiKey;
}

// 메시지 검증
function validateMessages(messages: any[]): GrokMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('메시지 배열이 필요합니다');
  }

  const validatedMessages: GrokMessage[] = [];
  
  for (const msg of messages) {
    // 기본 구조 검증
    if (!msg || typeof msg !== 'object') {
      throw new Error('유효하지 않은 메시지 형식');
    }
    
    // role 필드 검증
    if (!msg.role || (msg.role !== 'user' && msg.role !== 'assistant')) {
      throw new Error('메시지 role은 "user" 또는 "assistant"여야 합니다');
    }
    
    // content 필드 검증
    if (msg.content === undefined || msg.content === null) {
      throw new Error('메시지 content가 필요합니다');
    }
    
    // 문자열 변환
    let content = typeof msg.content === 'string' ? msg.content : String(msg.content);
    
    // 메시지 크기 제한
    const MAX_LENGTH = 8000;
    if (content.length > MAX_LENGTH) {
      content = content.slice(0, MAX_LENGTH) + '\n\n[내용이 너무 길어 잘렸습니다]';
    }
    
    validatedMessages.push({
      role: msg.role as 'user' | 'assistant',
      content: content.trim()
    });
  }

  return validatedMessages;
}

// 메인 Grok 엔드포인트
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { 
    messages,
    temperature = 0.7,
    stream = false,
    cacheOptions = {},
    maxTokens,
    timeout,
    priority = 'normal',
    reducePromptSize = false
  } = req.body;

  // API 키 확인
  validateApiKey();
  
  // 메시지 유효성 검사
  const validatedMessages = validateMessages(messages);

  // 스트리밍 요청 처리
  if (stream) {
    return handleStreamRequest(validatedMessages, {
      temperature,
      maxTokens,
      timeout,
      priority
    }, res);
  }

  // 일반 요청 처리
  // 캐시 사용 여부
  const skipCache = cacheOptions.skipCache === true;
  let cacheKey = '';
  
  if (!skipCache) {
    // 캐시 키 생성
    cacheKey = generateCacheKey(validatedMessages, temperature);
    
    try {
      // 캐시 확인 
      const cachedResponse = await cache.get(cacheKey);
      
      // 유효한 캐시가 있는 경우 즉시 반환
      if (cachedResponse && isValidCache(cachedResponse, 3600000)) { // 1시간 캐시
        logger.info(`🎯 Grok 캐시 히트: ${cacheKey}`);
        return res.json(cachedResponse);
      }
    } catch (cacheError) {
      // 캐시 조회 실패는 무시하고 API 호출 진행
      logger.warn('캐시 조회 실패, API 호출로 진행:', cacheError);
    }
    
    logger.info('🔍 Grok 캐시 미스: API 요청 수행');
  }

  // API 옵션 설정
  const options: GrokOptions = {
    temperature,
    maxTokens: maxTokens || 1200, // 토큰 수 기본값 감소
    timeout,
    maxRetries: 1,
    priority: priority as any,
    cacheLevel: cacheOptions.aggressive ? 'aggressive' : 'light',
    reducePromptSize
  };

  try {
    // API 호출
    const response = await callGrok(validatedMessages, options);
    
    // 결과 객체 구성
    const result = {
      content: response.choices[0].message.content,
      model: 'grok-3',
      timestamp: new Date().toISOString(),
      processingTime: Math.round(Date.now() - (req.startTime || 0)),
      usage: response.usage,
      temperature
    };

    // 캐시 저장 (skipCache가 아닌 경우)
    if (!skipCache) {
      try {
        const ttl = cacheOptions.ttl || 3600; // 기본 1시간
        
        await cache.set(cacheKey, result, {
          ttl,
          tags: ['grok', `temp-${temperature.toFixed(1)}`]
        });
      } catch (cacheError) {
        logger.warn('캐시 저장 실패:', cacheError);
      }
    }

    return res.json(result);
  } catch (error: any) {
    handleGrokApiError(error, res);
  }
}));

// 스트리밍 요청 처리 함수
async function handleStreamRequest(
  messages: GrokMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
    priority?: string;
  },
  res: Response
): Promise<void> {
  try {
    // SSE 헤더 설정
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // 초기 이벤트 전송
    res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

    // 스트리밍 응답 요청
    const streamOptions: GrokOptions = {
      temperature: options.temperature,
      maxTokens: options.maxTokens || 1500,
      timeout: options.timeout || 60000,
      stream: true,
      priority: options.priority as any
    };

    const stream = await callGrokStream(messages, streamOptions);
    
    // 스트림 데이터 처리
    stream.on('data', (chunk: Buffer) => {
      const data = chunk.toString();
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: data })}\n\n`);
    });
    
    stream.on('end', () => {
      res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
      res.end();
    });
    
    stream.on('error', (error) => {
      logger.error('스트림 오류:', error);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: error.message || '스트리밍 오류 발생'
      })}\n\n`);
      res.end();
    });
  } catch (error: any) {
    logger.error('스트리밍 요청 처리 오류:', error);
    
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: error.message || '스트리밍 요청 처리 오류'
    })}\n\n`);
    
    res.end();
  }
}

// Grok API 오류 처리 함수
function handleGrokApiError(error: any, res: Response) {
  logger.error('🔥 Grok API 호출 오류:', error);
  
  // 오류 유형별 처리
  if (error.message?.includes('타임아웃') || error.code === 'ECONNABORTED') {
    res.status(504).json({
      error: 'timeout',
      message: '응답 생성 시간이 초과되었습니다. 잠시 후 다시 시도하거나 더 짧은 질문을 입력해주세요.',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  if (error.message === 'Circuit breaker is open') {
    res.status(503).json({
      error: 'service_unavailable',
      message: 'Grok API 서비스가 일시적으로 이용 불가능합니다. 잠시 후 다시 시도해주세요.',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  if (error.response) {
    const status = error.response.status || 500;
    
    if (status === 429) {
      res.status(429).json({
        error: 'rate_limit',
        message: 'API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.',
        retryAfter: error.response.headers?.['retry-after'] || 60,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    if (status >= 500) {
      res.status(502).json({
        error: 'api_error',
        message: 'Grok API 서버 오류입니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    res.status(status).json({
      error: 'request_error',
      message: error.response.data?.message || '요청 처리 중 오류가 발생했습니다.',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // 기타 오류
  res.status(500).json({
    error: 'unknown_error',
    message: error.message || 'Grok API 호출 중 오류가 발생했습니다.',
    timestamp: new Date().toISOString()
  });
}

// 상태 확인 엔드포인트
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  try {
    // API 키 확인
    const apiKey = process.env.GROK_API_KEY;
    
    if (!apiKey) {
      return res.status(200).json({
        status: 'error',
        apiValid: false,
        message: 'API 키가 설정되지 않았습니다.'
      });
    }
    
    // 캐시 상태 정보 조회
    let cacheStats;
    try {
      cacheStats = await cache.getStats();
    } catch (cacheError) {
      cacheStats = {
        type: 'unknown',
        error: cacheError.message
      };
    }
    
    return res.json({
      status: 'ok',
      apiValid: true,
      model: 'grok-3-beta',
      cache: cacheStats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('상태 확인 오류:', error);
    
    return res.status(500).json({
      status: 'error',
      message: error.message || '상태 확인 중 오류가 발생했습니다.',
      timestamp: new Date().toISOString()
    });
  }
}));

// 빠른 응답 엔드포인트
router.post('/quick', asyncHandler(async (req: Request, res: Response) => {
  const { prompt, temperature = 0.7 } = req.body;
  
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('prompt 필드는 문자열이어야 합니다');
  }

  // 단일 메시지 형식으로 변환
  const messages: GrokMessage[] = [{
    role: 'user' as const,
    content: prompt
  }];
  
  // 캐시 키 생성
  const quickCacheKey = `grok-quick:${crypto.createHash('md5').update(prompt).digest('hex').slice(0, 10)}`;

  try {
    // 캐시 확인
    const cachedResponse = await cache.get(quickCacheKey);
    
    if (cachedResponse) {
      logger.info('🎯 Grok Quick 캐시 히트');
      return res.json(cachedResponse);
    }

    // API 호출 (짧은 타임아웃과 토큰 제한)
    const response = await callGrok(messages, {
      temperature,
      maxTokens: 1000,
      timeout: 30000,
      reducePromptSize: true
    });

    const result = {
      content: response.choices[0].message.content,
      timestamp: new Date().toISOString()
    };

    // 캐싱 (30분)
    await cache.set(quickCacheKey, result, { ttl: 1800 });
    
    return res.json(result);
  } catch (error: any) {
    handleGrokApiError(error, res);
  }
}));

export default router;