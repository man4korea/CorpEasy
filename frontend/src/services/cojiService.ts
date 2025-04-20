// 📁 frontend/src/services/cojiService.ts
// Create at 2504191520 Ver1.1

import axios from 'axios';
import { documentService } from './documentService';
import { CojiKnowledgeBase } from '../data/cojiKnowledgeBase';

/**
 * HTML 태그와 엔티티를 제거하는 함수
 * @param htmlText HTML이 포함된 문자열
 * @returns 정제된 문자열
 */
const sanitizeHtml = (htmlText: string): string => {
  if (!htmlText || typeof htmlText !== 'string') return '';
  const withoutTags = htmlText.replace(/<[^>]*>/g, '');
  return withoutTags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
};

/**
 * 코지 서비스
 * - 문서 기반 응답 생성
 * - GPT-3.5 API 연동 (Claude → 변경됨)
 * - 응답 전처리 및 감정 분석
 */
class CojiService {
  private apiBaseUrl: string;
  private openAiApiKey: string;

  constructor() {
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
    this.openAiApiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  }

  /**
   * 사용자 메시지에 대한 응답 생성
   * @param message 사용자 메시지
   * @returns 응답 텍스트와 감정 이모지
   */
  async generateResponse(message: string): Promise<{
    text: string;
    emotion: '😊' | '🤔' | '😄' | '💡' | '❤️' | '⚠️' | '✨';
  }> {
    try {
      const sanitizedMessage = sanitizeHtml(message);
      const docsContent = await documentService.searchRelevantContent(sanitizedMessage);
      let apiResponse = '';

      try {
        // GPT-3.5 백엔드 API 호출
        const response = await axios.post(`${this.apiBaseUrl}/api/coji`, {
          message: sanitizedMessage
        }, {
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.message) {
          apiResponse = response.data.message;
        }
      } catch (apiError) {
        console.warn('코지 API 오류:', apiError);
        // 백업 Firebase 함수 호출 시도 (Claude 제거됨)
        try {
          const fbResponse = await axios.post(`${this.apiBaseUrl}/api/ask-coji`, {
            message: sanitizedMessage
          });

          if (fbResponse.data && fbResponse.data.status === 'success') {
            apiResponse = fbResponse.data.reply;
          }
        } catch (fbError) {
          console.warn('Firebase 함수 오류:', fbError);
        }
      }

      let finalResponse = '';

      if (apiResponse) {
        finalResponse = sanitizeHtml(apiResponse);
      } else if (docsContent) {
        finalResponse = await this.formatResponseWithGPT(sanitizedMessage, docsContent);
      } else {
        finalResponse = await this.askGPT(sanitizedMessage);
      }

      finalResponse = sanitizeHtml(finalResponse);
      const emotion = this.analyzeEmotion(finalResponse);

      return {
        text: finalResponse,
        emotion: emotion
      };
    } catch (error) {
      console.error('응답 생성 오류:', error);
      return {
        text: CojiKnowledgeBase.responses.error,
        emotion: '⚠️'
      };
    }
  }

  /**
   * 문서 콘텐츠를 기반으로 GPT-3.5에 포맷 요청
   */
  private async formatResponseWithGPT(message: string, docsContent: string): Promise<string> {
    try {
      if (!this.openAiApiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다.');

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `당신은 코지(Coji)라는 귀엽고 친근한 AI 어시스턴트입니다. 사용자의 질문에 답변할 때 다음 CorpEasy 문서의 내용을 참고하여 응답해주세요. 문서 내용을 그대로 복사하지 말고, 사용자의 질문에 적합하게 간결하고 친절하게 정보를 제공하세요. 문서에 없는 내용을 지어내지 마세요. 모른다면 솔직히 그렇다고 말하세요. 응답은 최대 4-5문장으로 간결하게 유지하세요. 중요: 절대로 HTML 태그나 XML 태그를 사용하지 마세요. 순수 텍스트로만 응답하세요.`
          },
          {
            role: 'user',
            content: `질문: ${message}\n\n참고 문서 내용:\n${docsContent}`
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openAiApiKey}`
        }
      });

      if (response.data.choices && response.data.choices.length > 0) {
        return sanitizeHtml(response.data.choices[0].message.content);
      } else {
        throw new Error('GPT API 응답이 유효하지 않습니다.');
      }
    } catch (error) {
      console.error('GPT 포맷팅 오류:', error);
      return sanitizeHtml(`${CojiKnowledgeBase.responses.docsReference}\n\n${docsContent.substring(0, 300)}...`);
    }
  }

  /**
   * GPT-3.5에 직접 질문
   */
  private async askGPT(message: string): Promise<string> {
    try {
      if (!this.openAiApiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다.');

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `당신은 코지(Coji)입니다. 귀엽고 친근한 AI 어시스턴트로서, 이모지를 활용하여 감정을 표현하며 대화합니다. 다음 지침을 반드시 따르세요: 사실에 기반한 정확한 정보만 제공하세요. 모르면 '잘 모르겠어요'라고 말하세요. 간결하고 정확한 문장 사용. 절대 HTML/마크다운 사용 금지.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openAiApiKey}`
        }
      });

      if (response.data.choices && response.data.choices.length > 0) {
        return sanitizeHtml(response.data.choices[0].message.content);
      } else {
        throw new Error('GPT API 응답이 유효하지 않습니다.');
      }
    } catch (error) {
      console.error('GPT API 오류:', error);
      return CojiKnowledgeBase.responses.fallback;
    }
  }

  /**
   * 응답 텍스트 기반 감정 분석 (이모지 반환)
   */
  private analyzeEmotion(text: string): '😊' | '🤔' | '😄' | '💡' | '❤️' | '⚠️' | '✨' {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('죄송') || lowerText.includes('오류') || lowerText.includes('실패') || lowerText.includes('모르')) return '⚠️';
    else if (lowerText.includes('추천') || lowerText.includes('제안') || lowerText.includes('방법') || lowerText.includes('팁')) return '💡';
    else if (lowerText.includes('감사') || lowerText.includes('고마워') || lowerText.includes('좋아')) return '😊';
    else if (lowerText.includes('축하') || lowerText.includes('멋져') || lowerText.includes('환영')) return '✨';
    else if (lowerText.includes('도움') || lowerText.includes('가능')) return '❤️';
    else if (lowerText.includes('안녕') || lowerText.includes('반가') || lowerText.includes('질문')) return '😄';
    else return '🤔';
  }
}

export const cojiService = new CojiService();