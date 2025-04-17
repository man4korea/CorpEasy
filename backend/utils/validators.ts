// 📁 backend/utils/validators.ts
// 입력 검증 유틸리티 함수들

import { logger } from './logger';

/**
 * Grok API 메시지 타입
 */
export interface GrokMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 입력 메시지 타입
 */
export interface MessageInput {
  role: string;
  content: any;
}

/**
 * 유효한 메시지 타입
 */
export interface ValidatedMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 메시지 유효성 검사 함수
 * @param message 검사할 메시지
 * @returns 유효한 메시지 객체
 * @throws 유효하지 않은 경우 오류
 */
export function validateMessage(message: MessageInput): ValidatedMessage {
  // 메시지 객체 확인
  if (!message || typeof message !== 'object') {
    throw new Error('메시지가 객체여야 합니다');
  }

  // role 필드 확인
  if (!message.role || typeof message.role !== 'string') {
    throw new Error('메시지 role이 문자열이어야 합니다');
  }

  if (!['user', 'assistant'].includes(message.role)) {
    throw new Error('메시지 role은 "user" 또는 "assistant"여야 합니다');
  }

  // content 필드 확인
  if (message.content === undefined || message.content === null) {
    throw new Error('메시지 content가 필요합니다');
  }

  // content가 문자열이 아닌 경우 변환 시도
  let content: string;
  
  if (typeof message.content !== 'string') {
    try {
      content = String(message.content);
      logger.warn(`비문자열 content를 문자열로 변환: ${typeof message.content} -> string`);
    } catch (error) {
      throw new Error('메시지 content를 문자열로 변환할 수 없습니다');
    }
  } else {
    content = message.content;
  }

  // 빈 문자열 확인
  if (content.trim() === '') {
    throw new Error('메시지 content가 비어있으면 안 됩니다');
  }

  // 유효한 메시지 반환
  return {
    role: message.role as 'user' | 'assistant',
    content: content.trim()
  };
}

/**
 * API 키 유효성 검사 (기본적인 형식 확인)
 * @param apiKey 검사할 API 키
 * @returns 유효 여부
 */
export function isValidApiKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // 최소 길이 확인
  if (apiKey.length < 8) {
    return false;
  }
  
  // 기본적인 형식 확인 (알파벳, 숫자, 특수 문자 포함)
  const hasLetter = /[a-zA-Z]/.test(apiKey);
  const hasNumber = /[0-9]/.test(apiKey);
  
  return hasLetter && hasNumber;
}

/**
 * 온도(temperature) 파라미터 유효성 검사
 * @param temperature 검사할 온도 값
 * @returns 유효한 온도 값 (기본값 또는 보정된 값)
 */
export function validateTemperature(temperature: any): number {
  // 값이 없으면 기본값 사용
  if (temperature === undefined || temperature === null) {
    return 0.7; // 기본값
  }
  
  // 숫자로 변환 시도
  let temp: number;
  
  try {
    temp = typeof temperature === 'string' 
      ? parseFloat(temperature) 
      : Number(temperature);
  } catch (error) {
    return 0.7; // 변환 실패 시 기본값 사용
  }
  
  // NaN 확인
  if (isNaN(temp)) {
    return 0.7;
  }
  
  // 범위 제한 (0-1)
  return Math.max(0, Math.min(1, temp));
}

/**
 * 최대 토큰 수 파라미터 유효성 검사
 * @param maxTokens 검사할 최대 토큰 수
 * @param defaultValue 기본값 (기본: 2000)
 * @param maxValue 최대 허용 값 (기본: 4000)
 * @returns 유효한 최대 토큰 수
 */
export function validateMaxTokens(
  maxTokens: any, 
  defaultValue: number = 2000,
  maxValue: number = 4000
): number {
  // 값이 없으면 기본값 사용
  if (maxTokens === undefined || maxTokens === null) {
    return defaultValue;
  }
  
  // 숫자로 변환 시도
  let tokens: number;
  
  try {
    tokens = typeof maxTokens === 'string' 
      ? parseInt(maxTokens, 10) 
      : Number(maxTokens);
  } catch (error) {
    return defaultValue; // 변환 실패 시 기본값 사용
  }
  
  // NaN 또는 음수 확인
  if (isNaN(tokens) || tokens <= 0) {
    return defaultValue;
  }
  
  // 최대값 제한
  return Math.min(tokens, maxValue);
}

/**
 * 타임아웃 값 유효성 검사
 * @param timeout 검사할 타임아웃 값 (ms)
 * @param defaultValue 기본값 (기본: 30000ms)
 * @param maxValue 최대 허용 값 (기본: 60000ms)
 * @returns 유효한 타임아웃 값
 */
export function validateTimeout(
  timeout: any,
  defaultValue: number = 30000,
  maxValue: number = 60000
): number {
  // 값이 없으면 기본값 사용
  if (timeout === undefined || timeout === null) {
    return defaultValue;
  }
  
  // 숫자로 변환 시도
  let timeoutMs: number;
  
  try {
    timeoutMs = typeof timeout === 'string' 
      ? parseInt(timeout, 10) 
      : Number(timeout);
  } catch (error) {
    return defaultValue; // 변환 실패 시 기본값 사용
  }
  
  // NaN 또는 음수 확인
  if (isNaN(timeoutMs) || timeoutMs <= 0) {
    return defaultValue;
  }
  
  // 범위 제한
  return Math.min(Math.max(1000, timeoutMs), maxValue);
}