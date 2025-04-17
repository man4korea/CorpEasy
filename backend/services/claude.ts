// 📁 backend/services/claude.ts
// Anthropic Claude API와 통신하기 위한 서비스 계층 (속도 최적화)

import axios from 'axios';
import { logger } from '../utils/logger';

// Anthropic API 기본 설정
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_TIMEOUT = 30000; // 30초로 단축
const FAST_TIMEOUT = 15000;    // 빠른 응답용 타임아웃

// Claude 모델 프로필 정의 (최신 모델 ID로 업데이트)
export const MODEL_PROFILES = {
  'claude-3-opus-20240229': {
    name: 'Claude 3 Opus',
    contextWindow: 200000,
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.075,
    strengths: ['높은 정확도', '복잡한 추론', '고품질 창작 작업'],
    defaultMaxTokens: 4096,
    responseSpeed: 'slow'
  },
  'claude-3-5-sonnet-20240620': {  // 모델 ID 업데이트
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    strengths: ['균형 잡힌 성능', '비용 효율성', '대부분의 작업에 적합'],
    defaultMaxTokens: 4096,
    responseSpeed: 'medium'
  },
  'claude-3-haiku-20240307': {
    name: 'Claude 3 Haiku',
    contextWindow: 200000,
    costPer1kInputTokens: 0.00025,
    costPer1kOutputTokens: 0.00125,
    strengths: ['빠른 응답 시간', '대화형 응용 프로그램', '비용 최소화'],
    defaultMaxTokens: 2048,
    responseSpeed: 'fast'
  }
};

// 기본 모델 ID 정의 (최신 모델로 업데이트)
export const DEFAULT_MODEL_ID = 'claude-3-5-sonnet-20240620';
export const FAST_MODEL_ID = 'claude-3-haiku-20240307';

// 메시지 타입 정의
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 요청 옵션 인터페이스
export interface ClaudeRequestOptions {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  system?: string;
  stream?: boolean;
  timeout?: number;
  speedMode?: boolean; // 속도 우선 모드 추가
}

// 토큰 사용량 추적 인터페이스
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/**
 * 사용 사례에 따라 최적의 Claude 모델을 선택
 * @param useCase 사용 사례 설명
 * @param options 추가 옵션 (비용 선호, 속도 선호 등)
 * @returns 최적 모델 ID
 */
export function selectOptimalModel(
  useCase: 'general' | 'creative' | 'analysis' | 'quick' | 'code', 
  options: { costSensitive?: boolean, speedSensitive?: boolean } = {}
): string {
  const { costSensitive = false, speedSensitive = false } = options;
  
  // 비용 또는 속도에 민감한 경우 Haiku 선택
  if (costSensitive || speedSensitive) {
    return FAST_MODEL_ID;
  }
  
  // 사용 사례별 최적 모델 선택
  switch (useCase) {
    case 'creative':
    case 'analysis':
      return 'claude-3-opus-20240229'; // 복잡한 작업에는 Opus
    case 'code':
      return DEFAULT_MODEL_ID; // 코딩에는 Sonnet
    case 'quick':
      return FAST_MODEL_ID; // 빠른 응답이 필요한 경우 Haiku
    case 'general':
    default:
      return DEFAULT_MODEL_ID; // 기본은 Sonnet
  }
}

/**
 * 가장 빠른 모델 가져오기
 * @returns 가장 빠른 응답 시간을 가진 모델 ID
 */
export function getFastestModel(): string {
  return FAST_MODEL_ID;
}

/**
 * 메시지 간소화 - 토큰 수를 줄이기 위한 유틸리티
 * @param messages 원본 메시지 배열
 * @param maxLength 각 메시지의 최대 길이
 * @returns 간소화된 메시지 배열
 */
export function simplifyMessages(messages: ClaudeMessage[], maxLength: number = 1000): ClaudeMessage[] {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content.length > maxLength 
      ? msg.content.substring(0, maxLength) + '...' 
      : msg.content
  }));
}

/**
 * 스마트 캐시 키 생성 - 비슷한 메시지도 캐시 히트 가능하도록
 * @param message 사용자 메시지
 * @returns 정규화된 캐시 키
 */
export function generateSmartCacheKey(message: string): string {
  // 대소문자 무시, 기본 구두점 제거, 공백 정규화
  const normalizedMessage = message.toLowerCase()
    .replace(/[.,?!;]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  
  // 키워드 기반 해싱 (핵심 단어만 사용)
  const keywords = normalizedMessage.split(' ')
    .filter(word => word.length > 2)  // 짧은 단어 제외
    .slice(0, 5)                     // 첫 5개 키워드만 사용
    .join(':');
  
  return `claude:${keywords}`;
}

/**
 * Claude API에 요청 전송 (최적화 버전)
 * @param apiKey Anthropic API 키
 * @param messages 메시지 배열
 * @param options 요청 옵션
 * @returns API 응답
 */
export async function sendClaudeRequest(
  apiKey: string,
  messages: ClaudeMessage[],
  options: ClaudeRequestOptions = {}
) {
  // 속도 우선 모드인 경우 빠른 모델 사용
  const {
    model = options.speedMode ? FAST_MODEL_ID : DEFAULT_MODEL_ID,
    max_tokens = options.speedMode ? 512 : (MODEL_PROFILES[model as keyof typeof MODEL_PROFILES]?.defaultMaxTokens || 4096),
    temperature = options.speedMode ? 0.3 : 0.7,
    system,
    stream = false,
    timeout = options.speedMode ? FAST_TIMEOUT : DEFAULT_TIMEOUT
  } = options;

  // 요청 데이터 구성
  const requestData: any = {
    model,
    messages,
    max_tokens,
    temperature
  };

  // 옵션 필드 추가
  if (system) requestData.system = system;
  if (stream) requestData.stream = stream;

  logger.debug(`Claude API 요청 데이터: ${JSON.stringify({
    model,
    messagesCount: messages.length,
    max_tokens,
    temperature,
    stream,
    speedMode: options.speedMode
  })}`);

  try {
    // 타이머 시작
    const startTime = Date.now();
    
    // API 요청 전송
    const response = await axios.post(ANTHROPIC_API_URL, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      timeout
    });

    // 응답 시간 측정 및 기록
    const responseTime = Date.now() - startTime;
    logger.info(`Claude API 응답 시간: ${responseTime}ms (모델: ${model}, 속도 모드: ${options.speedMode ? '켜짐' : '꺼짐'})`);
    
    return response.data;
  } catch (error: any) {
    // 오류 처리 및 로깅
    logger.error(`Claude API 오류: ${error.message}`);
    
    if (error.response) {
      logger.error(`API 응답 상태: ${error.response.status}`);
      logger.error(`API 응답 데이터: ${JSON.stringify(error.response.data)}`);

      // 모델 ID 오류 특별 처리
      if (error.response.status === 404 && 
          error.response.data?.error?.message?.includes('model:')) {
        throw new Error(`[모델 ID 오류] 요청한 모델(${model})이 존재하지 않습니다. 최신 모델 ID로 업데이트하세요.`);
      }

      // 필드 검증 오류 핸들링 (max_tokens 등)
      if (error.response.status === 400 && error.response.data?.error) {
        const errorData = error.response.data.error;
        if (errorData.message?.includes('max_tokens')) {
          throw new Error(`[필드 검증 오류] max_tokens: ${errorData.message}`);
        }
      }
      
      // 타임아웃 오류 처리 - 속도 모드로 재시도
      if (error.code === 'ECONNABORTED' && !options.speedMode) {
        logger.warn(`API 요청 타임아웃 - 속도 모드로 재시도`);
        
        // 속도 모드로 재귀적 호출
        return sendClaudeRequest(apiKey, simplifyMessages(messages, 500), {
          ...options,
          model: FAST_MODEL_ID,
          max_tokens: 512,
          speedMode: true,
          timeout: FAST_TIMEOUT
        });
      }
    }

    throw error;
  }
}

/**
 * 토큰 비용 계산
 * @param modelId 모델 ID
 * @param tokenUsage 토큰 사용량
 * @returns 비용 (USD)
 */
export function calculateTokenCost(modelId: string, tokenUsage: TokenUsage): number {
  const model = MODEL_PROFILES[modelId as keyof typeof MODEL_PROFILES];
  
  if (!model) {
    logger.warn(`알 수 없는 모델 ID: ${modelId}, 비용 계산 불가`);
    return 0;
  }
  
  const inputCost = (tokenUsage.input_tokens / 1000) * model.costPer1kInputTokens;
  const outputCost = (tokenUsage.output_tokens / 1000) * model.costPer1kOutputTokens;
  
  return inputCost + outputCost;
}

/**
 * ai-router.ts와의 호환성을 위한 함수 (속도 최적화 옵션 추가)
 * @param messages 메시지 배열
 * @param options 추가 옵션
 * @returns Claude API 응답
 */
export async function callClaude(messages: ClaudeMessage[], options: any = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다');
  }
  
  // 옵션 데이터 추출 (속도 우선 모드 추가)
  const speedMode = options.speedMode || false;
  const model = speedMode ? FAST_MODEL_ID : (options.model || DEFAULT_MODEL_ID);
  const max_tokens = options.max_tokens || (speedMode ? 512 : MODEL_PROFILES[model as keyof typeof MODEL_PROFILES]?.defaultMaxTokens || 4096);
  const temperature = options.temperature || (speedMode ? 0.3 : 0.7);
  
  logger.info(`callClaude 호출: 모델=${model}, 메시지 수=${messages.length}, 속도 모드=${speedMode}`);
  
  // 속도 모드인 경우 메시지 간소화
  const processedMessages = speedMode ? simplifyMessages(messages, 500) : messages;
  
  // sendClaudeRequest 함수 사용하여 API 호출
  const response = await sendClaudeRequest(
    apiKey,
    processedMessages,
    {
      model,
      max_tokens,
      temperature,
      system: options.system,
      speedMode
    }
  );
  
  return response;
}