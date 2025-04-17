// 📁 backend/routes/claude-stream-router.ts
// Claude API 스트리밍 응답을 위한 전용 라우터

import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { cache } from '../utils/cache-factory';
import { logger } from '../utils/logger';
import { 
  MODEL_PROFILES, 
  DEFAULT_MODEL_ID,
  FAST_MODEL_ID,
  selectOptimalModel, 
  simplifyMessages,
  generateSmartCacheKey
} from '../services/claude';
import { asyncHandler, ApiError } from '../middlewares/error-handler';

dotenv.config();
const router = express.Router();
const apiKey = process.env.ANTHROPIC_API_KEY;
const endpoint = 'https://api.anthropic.com/v1/messages';

// API 요청 타임아웃 설정 (밀리초)
const STREAM_TIMEOUT = parseInt(process.env.STREAM_TIMEOUT || '45000', 10);

// 스트림 파이프라인을 프로미스화
const pipelineAsync = promisify(pipeline);

// 요청 타입 정의
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamRequestOptions {
  model?: string;
  speedMode?: boolean;
  max_tokens?: number;
  temperature?: number;
  system?: string;
}

// 응답 시간 측정 미들웨어
router.use((req, res, next) => {
  req.startTime = Date.now();
  
  // 응답 완료 후 시간 기록
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    logger.info(`📊 Claude 스트리밍 API 처리 시간: ${duration}ms`);
  });
  
  next();
});

/**
 * 스트리밍 엔드포인트 - Claude API에 스트리밍 요청을 보내고 결과를 클라이언트에 실시간으로 전달
 */
router.post('/', asyncHandler(async (req, res) => {
  if (!apiKey) {
    throw ApiError.internalError('API 키가 설정되지 않았습니다.');
  }
  
  logger.info('🔄 Claude 스트리밍 요청 시작');
  
  // 요청 데이터 검증
  const { messages, options = {} } = req.body;
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw ApiError.badRequest('유효하지 않은 요청 형식', { 
      message: 'messages 필드는 필수이며 배열이어야 합니다.'
    });
  }
  
  // 속도 모드 확인
  const speedMode = options.speedMode || false;
  
  // 모델 선택 (속도 모드인 경우 빠른 모델 사용)
  const model = speedMode 
    ? FAST_MODEL_ID 
    : (options.model || DEFAULT_MODEL_ID);
  
  // 토큰 제한 설정 (속도 모드인 경우 더 적은 토큰)
  const max_tokens = options.max_tokens || 
    (speedMode ? 512 : MODEL_PROFILES[model as keyof typeof MODEL_PROFILES]?.defaultMaxTokens || 4096);
  
  // 온도 설정 (속도 모드인 경우 더 결정적인 응답)
  const temperature = options.temperature || (speedMode ? 0.3 : 0.7);
  
  // 메시지 처리 (속도 모드인 경우 간소화)
  const processedMessages = speedMode ? simplifyMessages(messages, 500) : messages;
  
  // 요청 데이터 구성
  const requestData = {
    model,
    messages: processedMessages,
    max_tokens,
    temperature,
    stream: true  // 항상 스트리밍 활성화
  };
  
  // 시스템 메시지 추가 (있는 경우)
  if (options.system) {
    requestData.system = options.system;
  }
  
  // 스마트 캐시 키 생성
  const userMessage = messages.find(msg => msg.role === 'user')?.content || '';
  const cacheKey = `stream:${generateSmartCacheKey(userMessage)}`;
  
  try {
    // SSE 헤더 설정
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    
    // 클라이언트에 메타데이터 전송
    res.write(`data: ${JSON.stringify({
      type: 'metadata',
      message: '스트리밍 시작',
      model: model,
      speedMode: speedMode
    })}\n\n`);
    
    logger.info(`Claude 스트리밍 요청: 모델=${model}, 속도 모드=${speedMode}`);
    
    // 스트리밍 요청 전송
    const response = await axios.post(endpoint, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      responseType: 'stream',
      timeout: STREAM_TIMEOUT
    });
    
    // 스트림 파이프라인 설정
    await pipelineAsync(
      response.data,
      res
    );
    
    logger.info('Claude 스트리밍 응답 완료');
  } catch (error: any) {
    logger.error('🔥 스트리밍 오류:', error.message);
    
    // 타임아웃 오류 특별 처리
    if (error.code === 'ECONNABORTED') {
      logger.error('⏱️ 스트리밍 요청 타임아웃');
      
      // 타임아웃 발생 시 속도 모드로 재시도할지 제안
      // 연결이 아직 열려있다면 오류 이벤트 전송
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error',
          error: 'API 요청 타임아웃', 
          message: '요청이 너무 오래 걸립니다. 속도 모드로 다시 시도하세요.',
          suggestion: 'speed_mode_retry'
        })}\n\n`);
        res.end();
      }
      return;
    }
    
    // 모델 오류 처리
    if (error.response && error.response.status === 404 && 
        error.response.data?.error?.message?.includes('model:')) {
      
      // 모델 ID 오류 시 클라이언트에 최신 모델 ID 제안
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error',
          error: '모델 ID 오류', 
          message: `요청한 모델(${model})이 존재하지 않습니다. 최신 모델을 사용하세요.`,
          suggestion: 'use_default_model',
          defaultModel: DEFAULT_MODEL_ID
        })}\n\n`);
        res.end();
      }
      return;
    }
    
    // 연결이 아직 열려있다면 일반 오류 이벤트 전송
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ 
        type: 'error',
        error: error.message,
        message: '스트리밍 오류가 발생했습니다.'
      })}\n\n`);
      res.end();
    } else {
      // 이미 응답이 끝난 경우 로그만 남김
      logger.error('스트리밍 오류 발생했으나 응답이 이미 종료됨');
    }
  }
}));

/**
 * 자동 완성 엔드포인트 - 짧은 프롬프트에 대해 빠른 응답 생성
 * 속도에 최적화된 설정을 사용하여 자동 완성 유형의 응답을 빠르게 생성
 */
router.post('/autocomplete', asyncHandler(async (req, res) => {
  if (!apiKey) {
    throw ApiError.internalError('API 키가 설정되지 않았습니다.');
  }
  
  logger.info('⚡ Claude 자동완성 요청');
  
  // 요청 데이터 검증
  const { prompt, maxLength = 50 } = req.body;
  
  if (!prompt || typeof prompt !== 'string') {
    throw ApiError.badRequest('유효하지 않은 요청 형식', { 
      message: 'prompt 필드는 필수이며 문자열이어야 합니다.'
    });
  }
  
  // 자동 완성은 항상 속도를 우선시
  const model = FAST_MODEL_ID;
  const max_tokens = Math.min(maxLength, 100); // 토큰 수 제한
  
  // 요청 데이터 구성
  const requestData = {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens,
    temperature: 0.1,  // 낮은 온도로 결정적인 응답
    stream: true
  };
  
  try {
    // SSE 헤더 설정
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    
    // 자동 완성용 짧은 타임아웃 설정 (8초)
    const autocompleteTimeout = 8000;
    
    // 스트리밍 요청 전송
    const response = await axios.post(endpoint, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      responseType: 'stream',
      timeout: autocompleteTimeout
    });
    
    // 스트림 파이프라인 설정
    await pipelineAsync(
      response.data,
      res
    );
    
    logger.info('자동완성 스트리밍 응답 완료');
  } catch (error: any) {
    // 타임아웃 또는 기타 오류
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ 
        type: 'error',
        error: error.message,
        message: '자동완성 생성 중 오류가 발생했습니다.'
      })}\n\n`);
      res.end();
    }
  }
}));

export default router;