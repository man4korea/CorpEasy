// 📁 backend/routes/claude-router.ts
// 공통 오류 처리가 적용된 Claude API 라우터

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
  selectOptimalModel, 
  sendClaudeRequest, 
  simplifyMessages
} from '../services/claude';
import { asyncHandler, ApiError } from '../middlewares/error-handler';

dotenv.config();
const router = express.Router();
const apiKey = process.env.ANTHROPIC_API_KEY;
const endpoint = 'https://api.anthropic.com/v1/messages';

// API 요청 타임아웃 설정 (밀리초)
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '30000', 10); // 기본값 30초

// 스트림 파이프라인을 프로미스화
const pipelineAsync = promisify(pipeline);

// 요청 타입 정의 - Claude.tsx와 일치하도록 구성
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeRequest {
  model?: string;
  messages: ClaudeMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  system?: string;
}

// 메인 엔드포인트
router.post('/', asyncHandler(async (req, res) => {
  if (!apiKey) {
    throw ApiError.internalError('API 키가 설정되지 않았습니다.');
  }

  const { messages, options = {} } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw ApiError.badRequest('유효하지 않은 요청 형식', { 
      message: 'messages 필드는 필수이며 배열이어야 합니다.'
    });
  }

  logger.info('🔍 Claude API 요청 수행');

  try {
    const response = await sendClaudeRequest(
      apiKey,
      messages,
      {
        model: options.model || DEFAULT_MODEL_ID,
        max_tokens: options.max_tokens,
        temperature: options.temperature,
        system: options.system,
        timeout: API_TIMEOUT
      }
    );

    return res.json(response);
  } catch (error: any) {
    logger.error('🔥 Claude API 호출 오류:', error);
    
    if (error.response) {
      throw ApiError.apiClientError('Claude API 호출 실패', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    throw ApiError.internalError(error.message || 'Claude API 호출 중 오류 발생');
  }
}));

// 모델 정보 엔드포인트
router.get('/models', asyncHandler(async (req, res) => {
  return res.json({
    models: MODEL_PROFILES,
    defaultModel: DEFAULT_MODEL_ID,
    recommendedModels: {
      general: selectOptimalModel('general'),
      creative: selectOptimalModel('creative'),
      analysis: selectOptimalModel('analysis'),
      quick: selectOptimalModel('quick'),
      code: selectOptimalModel('code'),
      costEfficient: selectOptimalModel('general', { costSensitive: true })
    }
  });
}));

export default router;