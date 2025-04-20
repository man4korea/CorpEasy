// 📁 frontend/src/services/cojiService.ts
// Create at 2504191520

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
  
  // HTML 태그 제거
  const withoutTags = htmlText.replace(/<[^>]*>/g, '');
  
  // HTML 엔티티 디코딩
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
 * - GPT API 연동
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
      // 사용자 메시지 정제 - HTML 태그 제거
      const sanitizedMessage = sanitizeHtml(message);
      
      // 1. 문서에서 관련 콘텐츠 검색
      const docsContent = await documentService.searchRelevantContent(sanitizedMessage);
      
      // 2. API 호출 시도
      let apiResponse = '';
      try {
        const response = await axios.post(`${this.apiBaseUrl}/api/coji`, {
          message: sanitizedMessage
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data && response.data.message) {
          apiResponse = response.data.message;
        }
      } catch (apiError) {
        console.warn('코지 API 오류:', apiError);
        
        // 3. 백업으로 Firebase 함수 호출 시도
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
      
      // 4. 각 응답 소스에 따른 처리
      let finalResponse = '';
      
      // API 응답이 있는 경우
      if (apiResponse) {
        finalResponse = sanitizeHtml(apiResponse);
      }
      // 문서 기반 응답이 있는 경우
      else if (docsContent) {
        // 문서 콘텐츠가 있으면 GPT로 포맷팅
        finalResponse = await this.formatResponseWithGPT(sanitizedMessage, docsContent);
      } 
      // 둘 다 없으면 GPT에 직접 질문
      else {
        finalResponse = await this.askGPT(sanitizedMessage);
      }
      
      // 최종 응답에서 HTML 태그 제거 확인
      finalResponse = sanitizeHtml(finalResponse);
      
      // 5. 응답 감정 분석
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
   * 문서 콘텐츠를 이용해 GPT API로 응답 포맷팅
   */
  private async formatResponseWithGPT(message: string, docsContent: string): Promise<string> {
    try {
      if (!this.openAiApiKey) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다.');
      }
      
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `당신은 코지(Coji)라는 귀엽고 친근한 AI 어시스턴트입니다. 
            사용자의 질문에 답변할 때 다음 CorpEasy 문서의 내용을 참고하여 응답해주세요.
            문서 내용을 그대로 복사하지 말고, 사용자의 질문에 적합하게 간결하고 친절하게 정보를 제공하세요.
            문서에 없는 내용을 지어내지 마세요. 모른다면 솔직히 그렇다고 말하세요.
            응답은 최대 4-5문장으로 간결하게 유지하세요.
            
            중요: 절대로 HTML 태그나 XML 태그를 사용하지 마세요. 순수 텍스트로만 응답하세요.
            HTML 코드나 마크다운 형식은 사용하지 마세요. 단순한 일반 텍스트로만 답변해야 합니다.`
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
        // 응답에서 HTML 태그 제거
        return sanitizeHtml(response.data.choices[0].message.content);
      } else {
        throw new Error('GPT API 응답이 유효하지 않습니다.');
      }
    } catch (error) {
      console.error('GPT 포맷팅 오류:', error);
      // 오류 발생 시 문서 내용을 기본 응답과 함께 반환
      return sanitizeHtml(`${CojiKnowledgeBase.responses.docsReference}\n\n${docsContent.substring(0, 300)}...`);
    }
  }
  
  /**
   * GPT API에 직접 질문
   */
  private async askGPT(message: string): Promise<string> {
    try {
      if (!this.openAiApiKey) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다.');
      }
      
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `당신은 코지(Coji)입니다. 귀엽고 친근한 AI 어시스턴트로서, 이모지를 활용하여 감정을 표현하며 대화합니다. 다음 지침을 반드시 따르세요:

1. 사실에 기반한 정확한 정보만 제공하세요.
2. 확실하지 않은 내용은 추측하지 말고, '잘 모르겠어요'라고 솔직히 말하세요.
3. 답변할 때는 신뢰할 수 있는 정보와 논리적 근거를 제시하세요.
4. 전문적인 내용도 이해하기 쉽게 설명하되, 정확성을 유지하세요.
5. 친절하고 상냥한 톤을 유지하면서도, 과장된 표현은 피하세요.
6. 응답은 최대 4-5문장으로 간결하게 유지하세요.
7. HTML 태그나 XML 태그, 마크다운 형식을 절대 사용하지 마세요.
8. <html>, <head>, <body>, <!DOCTYPE>, <div>, <span> 등의 태그를 절대 포함하지 마세요.
9. 순수 텍스트로만 응답하세요.

CorpEasy는 비즈니스용 AI 플랫폼으로, 다음과 같은 주요 기능이 있습니다:
- 콘텐츠 상세분석기: 유튜브 영상, 웹사이트 내용 분석 및 요약
- 영어 자막 한글 번역 기능: 영어 콘텐츠를 자동으로 감지하고 한국어로 번역
- 지식정보창고: 분석된 모든 콘텐츠를 저장하고 검색
- CorpEasy 블로그: SEO 최적화된 블로그 콘텐츠 자동 생성
- AI 모델 통합: Claude, GPT, Gemini, Grok 등 다양한 AI 모델 지원`
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
        // 응답에서 HTML 태그 제거
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
   * 응답 텍스트 기반 감정 이모지 분석
   */
  private analyzeEmotion(text: string): '😊' | '🤔' | '😄' | '💡' | '❤️' | '⚠️' | '✨' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('죄송') || lowerText.includes('오류') || lowerText.includes('실패') || lowerText.includes('모르')) {
      return '⚠️';
    } else if (lowerText.includes('추천') || lowerText.includes('제안') || lowerText.includes('방법') || lowerText.includes('팁')) {
      return '💡';
    } else if (lowerText.includes('감사') || lowerText.includes('고마워') || lowerText.includes('좋아')) {
      return '😊';
    } else if (lowerText.includes('축하') || lowerText.includes('멋져') || lowerText.includes('환영')) {
      return '✨';
    } else if (lowerText.includes('도움') || lowerText.includes('가능')) {
      return '❤️';
    } else if (lowerText.includes('안녕') || lowerText.includes('반가') || lowerText.includes('질문')) {
      return '😄';
    } else {
      return '🤔';
    }
  }
}

export const cojiService = new CojiService();