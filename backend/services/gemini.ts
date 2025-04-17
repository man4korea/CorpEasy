// 📁 backend/services/gemini.ts
// Google Gemini API와 통신하기 위한 서비스

import axios from 'axios';
import { logger } from '../utils/logger';

/**
 * Gemini API를 호출하여 텍스트 생성
 * @param prompt 프롬프트 텍스트
 * @param model 사용할 Gemini 모델 (기본값: gemini-1.5-flash-8b)
 * @param temperature 온도 설정 (0-1 사이, 기본값: 0.7)
 * @returns Gemini API 응답
 */
export async function callGemini(prompt: string, model: string = 'gemini-1.5-flash-8b', temperature: number = 0.7) {
  const apiKey = process.env.SERVER_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('SERVER_GEMINI_API_KEY가 설정되지 않았습니다');
  }
  
  logger.info(`Gemini API 호출: 모델=${model}, 온도=${temperature}, 프롬프트 길이=${prompt.length}`);
  
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
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data.candidates || response.data.candidates.length === 0) {
      throw new Error('응답에 candidates가 없습니다');
    }

    return response.data.candidates[0].content.parts[0].text;
  } catch (error: any) {
    logger.error('Gemini API 호출 오류:', error.response?.data || error.message);
    throw error;
  }
}