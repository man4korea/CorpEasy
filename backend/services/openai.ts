// 📁 backend/services/openai.ts
// OpenAI API 호출 서비스

import { logger } from '../utils/logger';
import { getFromCache, setToCache } from '../utils/cache';

// 메시지 타입 정의
type Message = {
  role: string;
  content: string;
}

/**
 * OpenAI GPT-3.5 모델 호출
 * @param messages 메시지 배열
 * @returns 생성된 텍스트
 */
export async function callGPT35(messages: Message[]): Promise<string> {
  logger.info('GPT-3.5 모델 호출 시작');
  
  try {
    // 캐싱을 위한 키 생성
    const cacheKey = generateCacheKey(messages, 'gpt-3.5-turbo');
    const cachedResponse = await getFromCache(cacheKey);
    
    if (cachedResponse) {
      logger.info('GPT-3.5 캐시된 응답 사용');
      return cachedResponse;
    }
    
    // OpenAI API 키 확인
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.error('OpenAI API 키가 설정되지 않았습니다.');
      throw new Error('API 키가 설정되지 않았습니다.');
    }
    
    // API 요청 옵션
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const requestBody = {
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    };
    
    // fetch API로 직접 호출
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`GPT-3.5 API 오류: ${response.status} ${errorText}`);
      throw new Error(`API 오류: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    const responseText = result.choices[0]?.message?.content || '';
    
    // 응답 캐싱 (1시간)
    await setToCache(cacheKey, responseText, 60 * 60);
    
    return responseText;
  } catch (error) {
    logger.error('GPT-3.5 API 호출 오류:', error);
    throw error;
  }
}

/**
 * OpenAI GPT-4 모델 호출
 * @param messages 메시지 배열
 * @returns 생성된 텍스트
 */
export async function callGPT4(messages: Message[]): Promise<string> {
  logger.info('GPT-4 모델 호출 시작');
  
  try {
    // 캐싱을 위한 키 생성
    const cacheKey = generateCacheKey(messages, 'gpt-4');
    const cachedResponse = await getFromCache(cacheKey);
    
    if (cachedResponse) {
      logger.info('GPT-4 캐시된 응답 사용');
      return cachedResponse;
    }
    
    // OpenAI API 키 확인
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.error('OpenAI API 키가 설정되지 않았습니다.');
      throw new Error('API 키가 설정되지 않았습니다.');
    }
    
    // API 요청 옵션
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const requestBody = {
      model: 'gpt-4',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    };
    
    // fetch API로 직접 호출
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`GPT-4 API 오류: ${response.status} ${errorText}`);
      throw new Error(`API 오류: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    const responseText = result.choices[0]?.message?.content || '';
    
    // 응답 캐싱 (1시간)
    await setToCache(cacheKey, responseText, 60 * 60);
    
    return responseText;
  } catch (error) {
    logger.error('GPT-4 API 호출 오류:', error);
    throw error;
  }
}

/**
 * 메시지와 모델에 기반한 캐시 키 생성
 * @param messages 메시지 배열
 * @param model 모델명
 * @returns 캐시 키
 */
function generateCacheKey(messages: Message[], model: string): string {
  const messageKey = messages.map(msg => `${msg.role}:${msg.content.substring(0, 50)}`).join('|');
  // MD5 해시 등을 사용할 수도 있지만, 간단히 처리
  return `openai:${model}:${messageKey.substring(0, 100)}`;
}