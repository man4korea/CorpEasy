// 📁 backend/services/openai.ts
// Create at 2504201655 Ver1.2

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

// 환경 변수 로드
dotenv.config();

console.log('🔍 OpenAI 서비스 초기화 중...');
console.log(`📌 API 키 설정 확인: ${process.env.OPENAI_API_KEY ? '존재함' : '없음'}`);
if (process.env.OPENAI_API_KEY) {
  console.log(`📌 API 키 형식: ${process.env.OPENAI_API_KEY.substring(0, 10)}... (${process.env.OPENAI_API_KEY.length}자)`);
  console.log(`📌 Project 키 여부: ${process.env.OPENAI_API_KEY.startsWith('sk-proj-')}`);
}

let openai: OpenAI;

try {
  // OpenAI 클라이언트 초기화
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ OpenAI 클라이언트 초기화 성공');
} catch (error) {
  console.error('❌ OpenAI 클라이언트 초기화 실패:', error);
  logger.error(`OpenAI 클라이언트 초기화 실패: ${error.message}`);
  throw new Error(`OpenAI 클라이언트 초기화 실패: ${error.message}`);
}

/**
 * GPT-3.5 호출 함수 - 메시지 배열 기반
 * @param messages 메시지 배열
 * @param options 추가 옵션
 * @returns 생성된 텍스트
 */
export async function callGPT35(messages: Array<{role: string, content: string}>, options: any = {}) {
  try {
    logger.info(`GPT-3.5 API 호출: 메시지 수=${messages.length}`);
    console.log('📝 GPT-3.5 호출 메시지:', JSON.stringify(messages).substring(0, 500));
    console.log('📝 GPT-3.5 호출 옵션:', JSON.stringify(options));
    
    const startTime = Date.now();
    
    // OpenAI 요청 구성
    const requestOptions = {
      model: options.model || 'gpt-3.5-turbo',
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1000,
    };
    
    console.log('📤 OpenAI 요청 옵션:', JSON.stringify(requestOptions));
    
    // OpenAI SDK를 통한 API 호출
    try {
      const response = await openai.chat.completions.create(requestOptions);
      
      const duration = Date.now() - startTime;
      logger.info(`GPT-3.5 API 응답 완료: ${duration}ms, 토큰=${response.usage?.total_tokens || 'N/A'}`);
      
      console.log('📥 OpenAI 응답:', {
        id: response.id,
        model: response.model,
        usage: response.usage,
        choices_length: response.choices.length,
        content_preview: response.choices[0]?.message?.content?.substring(0, 100)
      });
      
      // 응답 검증
      if (!response.choices || response.choices.length === 0) {
        throw new Error('OpenAI API 응답에 choices 필드가 없거나 비어있습니다');
      }
      
      if (!response.choices[0].message || !response.choices[0].message.content) {
        throw new Error('OpenAI API 응답의 content 필드가 비어있습니다');
      }
      
      return response.choices[0].message.content;
    } catch (apiError) {
      console.error('❌ OpenAI API 직접 호출 오류:', apiError);
      
      // 오류 상세 정보 추출 및 로깅
      if (apiError.response) {
        console.error('📌 API 오류 응답:', apiError.response.data);
      }
      
      // API 키 오류 특별 처리
      if (apiError.message.includes('API key')) {
        logger.error(`API 키 인증 오류: ${apiError.message}`);
        throw new Error(`OpenAI API 키 인증 오류: ${apiError.message}. API 키를 확인하세요.`);
      }
      
      // 일반 API 오류
      throw apiError;
    }
  } catch (error) {
    logger.error(`GPT-3.5 API 오류: ${error.message}`);
    console.error('❌ GPT-3.5 호출 처리 중 오류:', error);
    throw new Error(`GPT-3.5 호출 오류: ${error.message}`);
  }
}

/**
 * GPT-4 호출 함수 - 메시지 배열 기반
 * @param messages 메시지 배열
 * @param options 추가 옵션
 * @returns 생성된 텍스트
 */
export async function callGPT4(messages: Array<{role: string, content: string}>, options: any = {}) {
  try {
    logger.info(`GPT-4 API 호출: 메시지 수=${messages.length}`);
    
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: options.model || 'gpt-4',
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1500,
    });
    
    const duration = Date.now() - startTime;
    logger.info(`GPT-4 API 응답 완료: ${duration}ms, 토큰=${response.usage?.total_tokens || 'N/A'}`);
    
    return response.choices[0].message.content;
  } catch (error) {
    logger.error(`GPT-4 API 오류: ${error.message}`);
    throw new Error(`GPT-4 호출 오류: ${error.message}`);
  }
}