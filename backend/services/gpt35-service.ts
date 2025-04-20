// 📁 backend/services/gpt35-service.ts
// Create at 2504201620 Ver1.2

import OpenAI from 'openai';
import * as functions from 'firebase-functions'; // ✅ Firebase 환경 변수용
import dotenv from 'dotenv';                     // ✅ 로컬 개발용
import { logger } from '../utils/logger.js';     // ✅ 절대 지우면 안됨

dotenv.config();

// ✅ generateGPT35Reply 함수 안, API 호출 직전
console.log('[DEBUG] GPT 요청 시도:', prompt.slice(0, 50));
// ✅ 4~5번째 줄 바로 아래에
console.log('[DEBUG] 현재 OPENAI 키:', process.env.OPENAI_API_KEY || functions.config().openai?.key || '없음');


// OpenAI SDK 클라이언트 초기화 - Project API 키(sk-proj-) 호환
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || functions.config().openai.key,
});

/**
 * GPT-3.5 API 호출 함수 (SDK 방식)
 * @param prompt 프롬프트 텍스트
 * @param options 추가 옵션
 * @returns API 응답
 */
export async function callAPI(prompt: string, options: any = {}) {
  try {
    logger.info(`GPT-3.5 API 호출: 프롬프트 길이=${prompt.length}`);
    
    const startTime = Date.now();
    
    // OpenAI SDK를 사용한 호출 (Project API 키 호환)
    const response = await openai.chat.completions.create({
      model: options.model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1000,
    });

    const duration = Date.now() - startTime;
    logger.info(`GPT-3.5 API 응답 시간: ${duration}ms`);

    return response.choices[0].message.content;
  } catch (error: any) {
    logger.error(`GPT-3.5 API 호출 오류: ${error.message}`);
    throw error;
  }
}

/**
 * 메시지 배열 기반 호출 함수 (OpenAI API 형식)
 * @param messages 메시지 배열
 * @param options 추가 옵션
 * @returns API 응답
 */
export async function callGPT35(messages: Array<{role: string, content: string}>, options: any = {}) {
  try {
    logger.info(`GPT-3.5 (메시지 배열) 호출: 메시지 수=${messages.length}`);
    
    const startTime = Date.now();
    
    // OpenAI SDK를 사용한 호출 (Project API 키 호환)
    const response = await openai.chat.completions.create({
      model: options.model || 'gpt-3.5-turbo',
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1000,
    });

    const duration = Date.now() - startTime;
    logger.info(`GPT-3.5 API 응답 시간: ${duration}ms, 토큰=${response.usage?.total_tokens || 'N/A'}`);
    
    return response.choices[0].message.content;
  } catch (error: any) {
    logger.error(`GPT-3.5 메시지 처리 오류: ${error.message}`);
    throw error;
  }
}