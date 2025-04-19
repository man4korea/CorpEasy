// 📁 backend/services/gemini.ts
// Create at 2504201505 Ver1.1

import axios from 'axios';
import { logger } from '../utils/logger.js';

/**
 * Gemini 모델 그룹 정의 - 모델 특성에 따른 그룹화
 */
export const GEMINI_MODEL_GROUPS = {
  FLASH: ['gemini-1.5-flash-8b', 'gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'],
  PRO: ['gemini-1.5-pro', 'gemini-2.5-pro'],
  DEFAULT: 'gemini-1.5-flash-8b'
};

/**
 * Gemini 모델 정보 객체
 */
export const GEMINI_MODELS = {
  'gemini-1.5-flash-8b': {
    name: 'Gemini 1.5 Flash-8B',
    maxOutputTokens: 2048,
    defaultTemp: 0.7,
    pricePerInputToken: 0.0000375,
    pricePerOutputToken: 0.00015
  },
  'gemini-1.5-flash': {
    name: 'Gemini 1.5 Flash',
    maxOutputTokens: 2048,
    defaultTemp: 0.7,
    pricePerInputToken: 0.000075,
    pricePerOutputToken: 0.0003
  },
  'gemini-2.0-flash-lite': {
    name: 'Gemini 2.0 Flash-Lite',
    maxOutputTokens: 2048,
    defaultTemp: 0.7,
    pricePerInputToken: 0.000075,
    pricePerOutputToken: 0.0003
  },
  'gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    maxOutputTokens: 2048,
    defaultTemp: 0.7,
    pricePerInputToken: 0.0001,
    pricePerOutputToken: 0.0004
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    maxOutputTokens: 8192,
    defaultTemp: 0.7,
    pricePerInputToken: 0.00125,
    pricePerOutputToken: 0.005
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    maxOutputTokens: 8192,
    defaultTemp: 0.7,
    pricePerInputToken: 0.00125,
    pricePerOutputToken: 0.01
  }
};

/**
 * Gemini API를 호출하여 텍스트 생성
 * @param prompt 프롬프트 텍스트
 * @param model 사용할 Gemini 모델 (기본값: gemini-1.5-flash-8b)
 * @param temperature 온도 설정 (0-1 사이, 기본값: 0.7)
 * @param options 추가 옵션
 * @returns Gemini API 응답
 */
export async function callGemini(
  prompt: string, 
  model: string = GEMINI_MODEL_GROUPS.DEFAULT, 
  temperature: number = 0.7,
  options: {
    maxOutputTokens?: number;
    topK?: number;
    topP?: number;
    safetySettings?: any[];
  } = {}
) {
  const apiKey = process.env.SERVER_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API 키(SERVER_GEMINI_API_KEY 또는 GOOGLE_API_KEY)가 설정되지 않았습니다');
  }
  
  // 모델 정보 확인
  const modelInfo = GEMINI_MODELS[model] || GEMINI_MODELS[GEMINI_MODEL_GROUPS.DEFAULT];
  
  // 기본 옵션 설정
  const maxOutputTokens = options.maxOutputTokens || modelInfo.maxOutputTokens || 2048;
  const topK = options.topK || 40;
  const topP = options.topP || 0.95;
  
  // 안전 설정 (제공되지 않은 경우 기본값 사용)
  const safetySettings = options.safetySettings || [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
  ];
  
  logger.info(`Gemini API 호출: 모델=${model}, 온도=${temperature}, 프롬프트 길이=${prompt.length}, 최대출력토큰=${maxOutputTokens}`);
  
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: temperature,
          topK: topK,
          topP: topP,
          maxOutputTokens: maxOutputTokens,
        },
        safetySettings: safetySettings
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // 응답 검증
    if (!response.data.candidates || response.data.candidates.length === 0) {
      throw new Error('응답에 candidates가 없습니다');
    }

    // 차단된 응답 확인
    if (response.data.promptFeedback && response.data.promptFeedback.blockReason) {
      logger.warn(`Gemini 응답이 차단됨: ${response.data.promptFeedback.blockReason}`);
      return `응답이 안전 필터에 의해 차단되었습니다. 이유: ${response.data.promptFeedback.blockReason}`;
    }

    // 응답 텍스트 추출
    return response.data.candidates[0].content.parts[0].text;
  } catch (error: any) {
    logger.error('Gemini API 호출 오류:', error.response?.data || error.message);
    
    // 오류 응답 보강
    if (error.response?.data?.error) {
      const errorData = error.response.data.error;
      throw new Error(`Gemini API 오류 [${errorData.code}]: ${errorData.message}`);
    }
    
    throw error;
  }
}