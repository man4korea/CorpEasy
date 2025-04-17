// 📁 backend/utils/request-optimizer.ts
// Grok API 요청 최적화 및 전처리 유틸리티

import { GrokMessage } from '../services/grok';
import { logger } from './logger';

/**
 * 요청 최적화 옵션
 */
export interface RequestOptimizationOptions {
  maxContentLength?: number;       // 최대 콘텐츠 길이
  removeRedundantWhitespace?: boolean; // 중복 공백 제거
  minifyJSON?: boolean;           // JSON 포맷 압축
  optimizeCodeBlocks?: boolean;   // 코드 블록 최적화
  optimizeMarkdown?: boolean;     // 마크다운 최적화
  parallelProcessing?: boolean;   // 병렬 처리 사용
  enablePreloading?: boolean;     // 사전 로딩 활성화
}

/**
 * Grok API 요청 최적화기
 */
export class RequestOptimizer {
  private readonly DEFAULT_MAX_CONTENT_LENGTH = 8000; // 8000자로 제한
  private readonly DEFAULT_OPTIONS: RequestOptimizationOptions = {
    maxContentLength: this.DEFAULT_MAX_CONTENT_LENGTH,
    removeRedundantWhitespace: true,
    minifyJSON: true,
    optimizeCodeBlocks: true,
    optimizeMarkdown: true,
    parallelProcessing: true,
    enablePreloading: true
  };

  /**
   * 요청 메시지 최적화
   * @param messages 원본 메시지 배열
   * @param options 최적화 옵션
   * @returns 최적화된 메시지 배열
   */
  optimizeMessages(
    messages: GrokMessage[],
    customOptions: Partial<RequestOptimizationOptions> = {}
  ): GrokMessage[] {
    const options = { ...this.DEFAULT_OPTIONS, ...customOptions };
    
    // 빈 메시지 배열 확인
    if (!messages || messages.length === 0) {
      return [];
    }
    
    // 단일 메시지면 직접 최적화
    if (messages.length === 1) {
      const optimizedContent = this.optimizeContent(messages[0].content, options);
      return [{ role: messages[0].role, content: optimizedContent }];
    }
    
    // 다중 메시지 최적화
    let optimizedMessages: GrokMessage[];
    
    if (options.parallelProcessing && messages.length > 2) {
      // 병렬 처리 (여러 메시지)
      optimizedMessages = this.parallelOptimizeMessages(messages, options);
    } else {
      // 순차 처리
      optimizedMessages = messages.map(msg => ({
        role: msg.role,
        content: this.optimizeContent(msg.content, options)
      }));
    }
    
    // 대화 컨텍스트 최적화 (중복 정보 제거)
    return this.optimizeConversationContext(optimizedMessages, options);
  }
  
  /**
   * 메시지 내용 최적화
   * @param content 원본 내용
   * @param options 최적화 옵션
   * @returns 최적화된 내용
   */
  private optimizeContent(
    content: string,
    options: RequestOptimizationOptions
  ): string {
    if (!content) return '';
    
    const startTime = performance.now();
    let optimized = content;
    
    // 최대 길이 제한
    if (options.maxContentLength && optimized.length > options.maxContentLength) {
      const truncatedLength = options.maxContentLength - 100;
      logger.debug(`콘텐츠 길이 제한: ${optimized.length} -> ${truncatedLength} 자`);
      optimized = optimized.substring(0, truncatedLength) + 
        '\n\n[Note: Content truncated for optimization]';
    }
    
    // 중복 공백 제거
    if (options.removeRedundantWhitespace) {
      // 과도한 줄바꿈 제거 (최대 2개)
      optimized = optimized.replace(/\n{3,}/g, '\n\n');
      
      // 과도한 공백 제거 (최대 1개)
      optimized = optimized.replace(/[ \t]{2,}/g, ' ');
      
      // 줄 끝 공백 제거
      optimized = optimized.replace(/[ \t]+\n/g, '\n');
    }
    
    // 마크다운 최적화
    if (options.optimizeMarkdown) {
      optimized = this.optimizeMarkdown(optimized);
    }
    
    // 코드 블록 최적화
    if (options.optimizeCodeBlocks) {
      optimized = this.optimizeCodeBlocks(optimized);
    }
    
    // JSON 데이터 최적화
    if (options.minifyJSON) {
      optimized = this.minifyJSONInContent(optimized);
    }
    
    const endTime = performance.now();
    const optimizationTime = endTime - startTime;
    
    // 최적화율이 높으면 로깅
    const reductionPercent = ((content.length - optimized.length) / content.length) * 100;
    if (reductionPercent > 10) {
      logger.debug(`콘텐츠 최적화: ${content.length} -> ${optimized.length} 자 (${reductionPercent.toFixed(1)}% 감소, ${optimizationTime.toFixed(1)}ms)`);
    }
    
    return optimized.trim();
  }
  
  /**
   * 마크다운 최적화
   * @param content 원본 내용
   * @returns 최적화된 마크다운
   */
  private optimizeMarkdown(content: string): string {
    let optimized = content;
    
    // 중복된 헤더 마커 최적화 (예: ######### -> #####)
    optimized = optimized.replace(/#{6,}/g, '#####');
    
    // 불필요한 포맷팅 최적화
    optimized = optimized.replace(/\*\*\*\*+(.+?)\*\*\*\*+/g, '**$1**'); // **** -> **
    optimized = optimized.replace(/_{3,}(.+?)_{3,}/g, '_$1_'); // ___ -> _
    
    // 빈 목록 항목 제거
    optimized = optimized.replace(/^[\s]*[-*+][\s]*$/gm, '');
    
    // 빈 헤더 제거
    optimized = optimized.replace(/^#+\s*$/gm, '');
    
    return optimized;
  }
  
  /**
   * 코드 블록 최적화
   * @param content 원본 내용
   * @returns 최적화된 코드 블록
   */
  private optimizeCodeBlocks(content: string): string {
    // 코드 블록 찾기
    return content.replace(/```[\w]*\n([\s\S]*?)```/g, (match, codeContent) => {
      // 코드 내용 최적화
      let optimizedCode = codeContent;
      
      // 주석 줄이 3줄 이상인 경우 하나만 남기기
      optimizedCode = optimizedCode.replace(/(\/\/[^\n]*\n){3,}/g, '// ...\n');
      optimizedCode = optimizedCode.replace(/(#[^\n]*\n){3,}/g, '# ...\n');
      
      // 빈 줄이 3줄 이상인 경우 하나만 남기기
      optimizedCode = optimizedCode.replace(/\n{3,}/g, '\n\n');
      
      // 들여쓰기를 유지하면서 줄 끝 공백 제거
      optimizedCode = optimizedCode.replace(/[ \t]+$/gm, '');
      
      // 최적화된 코드 블록 반환
      return '```' + optimizedCode + '```';
    });
  }
  
  /**
   * JSON 데이터 최적화 (문자열 내 JSON 객체 압축)
   * @param content 원본 내용
   * @returns JSON이 최적화된 내용
   */
  private minifyJSONInContent(content: string): string {
    // JSON 패턴 찾기 ({ ... } 또는 [ ... ])
    return content.replace(/(\{[\s\S]*?\}|\[[\s\S]*?\])/g, (match) => {
      // JSON으로 파싱 시도
      try {
        const parsed = JSON.parse(match);
        // 공백 없이 직렬화 (최소화)
        return JSON.stringify(parsed);
      } catch (e) {
        // 파싱 실패 시 원본 반환
        return match;
      }
    });
  }
  
  /**
   * 병렬 메시지 최적화 (여러 메시지 동시 처리)
   * @param messages 메시지 배열
   * @param options 최적화 옵션
   * @returns 최적화된 메시지 배열
   */
  private parallelOptimizeMessages(
    messages: GrokMessage[],
    options: RequestOptimizationOptions
  ): GrokMessage[] {
    // worker threads 또는 Promise.all 사용 가능
    // 간단히 Promise.all로 구현
    const optimizedContents = messages.map(msg => {
      return new Promise<string>((resolve) => {
        // 비동기 최적화
        setTimeout(() => {
          resolve(this.optimizeContent(msg.content, options));
        }, 0);
      });
    });
    
    // 모든 최적화 완료 대기
    return Promise.all(optimizedContents).then(contents => {
      return messages.map((msg, index) => ({
        role: msg.role,
        content: contents[index]
      }));
    });
  }
  
  /**
   * 대화 컨텍스트 최적화 (중복 정보 제거, 오래된 메시지 요약)
   * @param messages 메시지 배열
   * @param options 최적화 옵션
   * @returns 최적화된 대화 컨텍스트
   */
  private optimizeConversationContext(
    messages: GrokMessage[],
    options: RequestOptimizationOptions
  ): GrokMessage[] {
    // 짧은 대화는 그대로 반환
    if (messages.length <= 2) return messages;
    
    // 메시지가 많은 경우 (8개 이상) 일부 요약
    if (messages.length >= 8) {
      // 첫 번째 메시지 (시스템/사용자 지침)와 최근 6개 메시지 유지
      const firstMessage = messages[0];
      const recentMessages = messages.slice(-6);
      
      // 중간 메시지 요약
      const summarizedMessage: GrokMessage = {
        role: 'assistant',
        content: `[Note: ${messages.length - 7} earlier messages in the conversation were summarized for efficiency]`
      };
      
      return [firstMessage, summarizedMessage, ...recentMessages];
    }
    
    // 중복 내용 제거
    // 순차적으로 처리해 유사한 내용 감지
    const uniqueMessages: GrokMessage[] = [];
    const contentFingerprints = new Set<string>();
    
    for (const message of messages) {
      // 간단한 핑거프린트 생성 (내용의 일부로)
      const contentWords = message.content
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 10)
        .join(' ');
      
      // 너무 짧은 내용은 항상 포함
      if (contentWords.length < 20) {
        uniqueMessages.push(message);
        continue;
      }
      
      // 중복 확인
      if (!contentFingerprints.has(contentWords)) {
        contentFingerprints.add(contentWords);
        uniqueMessages.push(message);
      }
    }
    
    // 중복 제거로 메시지가 줄었으면 로깅
    if (uniqueMessages.length < messages.length) {
      logger.debug(`대화 컨텍스트 최적화: ${messages.length} -> ${uniqueMessages.length} 메시지`);
    }
    
    return uniqueMessages;
  }
}

// 요청 최적화기 인스턴스 생성
export const requestOptimizer = new RequestOptimizer();

// 유틸리티 함수: 단일 메시지 최적화
export function optimizeMessage(message: string, options?: Partial<RequestOptimizationOptions>): string {
  return requestOptimizer.optimizeMessages(
    [{ role: 'user', content: message }],
    options
  )[0].content;
}

// 유틸리티 함수: 메시지 배열 최적화
export function optimizeMessages(messages: GrokMessage[], options?: Partial<RequestOptimizationOptions>): GrokMessage[] {
  return requestOptimizer.optimizeMessages(messages, options);
}

export default requestOptimizer;