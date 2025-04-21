// 📁 backend/services/coji-service.ts
// Create at 2404211730 Ver1.0

import OpenAI from 'openai';
import { logger } from '../utils/logger';

export class CojiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OPENAI_API_KEY가 설정되지 않았습니다.');
    }
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '당신은 전문적이고 도움이 되는 AI 어시스턴트입니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      return response.choices[0]?.message?.content || '응답을 생성할 수 없습니다.';
    } catch (error) {
      logger.error('COJI 응답 생성 오류:', error);
      throw new Error(`COJI 응답 생성 중 오류가 발생했습니다: ${(error as Error).message}`);
    }
  }

  async generateStructuredResponse<T>(
    prompt: string,
    expectedFormat: string
  ): Promise<T> {
    try {
      const response = await this.generateResponse(prompt + `\n\nJSON 형식으로 응답해주세요:\n${expectedFormat}`);
      
      // JSON 추출 시도
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('응답에서 JSON을 찾을 수 없습니다.');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('COJI 구조화된 응답 생성 오류:', error);
      throw error;
    }
  }
}