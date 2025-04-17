// 📁 backend/services/grok.ts
// Grok API와 통신하기 위한 서비스 (최적화된 호환 버전)

import axios from 'axios';
import { logger } from '../utils/logger';
import { CircuitBreaker } from '../utils/circuit-breaker';
import { cache } from '../utils/cache-factory';
import crypto from 'crypto';
import http from 'http';
import https from 'https';

/**
 * Grok API에 사용되는 메시지 타입
 */
export interface GrokMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Grok API 옵션
 */
export interface GrokOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  timeout?: number;
  maxRetries?: number;
  skipOptimization?: boolean;
  cacheLevel?: 'none' | 'light' | 'aggressive';
  priority?: 'low' | 'normal' | 'high';
  reducePromptSize?: boolean;
}

/**
 * Grok API 응답 타입
 */
interface GrokResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string;
    };
    index: number;
    finish_reason?: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 간소화된 메모리 캐시
 */
class SimpleCache<K, V> {
  private cache = new Map<K, { value: V, timestamp: number }>();
  private readonly maxSize: number;
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }
  
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    return entry?.value;
  }
}

/**
 * 최적화된 Grok API 서비스 클래스
 */
class GrokService {
  private readonly breaker: CircuitBreaker;
  private readonly MODEL = 'grok-3-beta';
  private readonly DEFAULT_TIMEOUT = 38000;
  private readonly MAX_CONTENT_LENGTH = 6000;
  private readonly axiosInstance;
  private readonly responseCache: SimpleCache<string, GrokResponse>;
  private requestPool: { [key: string]: Promise<GrokResponse> } = {};
  private readonly MAX_POOL_SIZE = 5;

  constructor() {
    this.breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 30000,
      monitorInterval: 5000,
      name: 'grok-api'
    });

    this.responseCache = new SimpleCache<string, GrokResponse>(100);

    const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10, timeout: 60000 });
    const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10, timeout: 60000 });

    this.axiosInstance = axios.create({
      timeout: this.DEFAULT_TIMEOUT,
      headers: { 'Content-Type': 'application/json' },
      httpAgent,
      httpsAgent,
      decompress: true
    });

    logger.info(`Grok 서비스 초기화 완료: 타임아웃=${this.DEFAULT_TIMEOUT}ms`);
  }

  /**
   * 리소스 정리
   */
  public destroy(): void {
    if (this.breaker && typeof this.breaker.destroy === 'function') {
      this.breaker.destroy();
    }
    this.requestPool = {};
  }

  /**
   * 메시지 최적화
   */
  private optimizeContent(content: string, aggressive: boolean = false): string {
    if (!content) return '';
    let maxLength = aggressive ? this.MAX_CONTENT_LENGTH / 2 : this.MAX_CONTENT_LENGTH;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '[내용이 너무 길어 잘렸습니다]';
    }
    return content.replace(/\s+/g, ' ').trim();
  }

  /**
   * 캐시 키 생성
   */
  private generateCacheKey(messages: GrokMessage[], temperature: number): string {
    const messageKey = messages
      .map(msg => `${msg.role}:${msg.content.slice(0, 500)}`)
      .join('|');
    const hash = crypto
      .createHash('sha256')
      .update(`grok:${messageKey}:${temperature}`)
      .digest('hex')
      .slice(0, 16);
    return `${hash}:${temperature.toFixed(1)}:${Date.now()}`;
  }

  /**
   * API 호출을 위한 직접 함수
   */
  private async callGrokDirect(messages: GrokMessage[], options: GrokOptions = {}): Promise<GrokResponse> {
    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) throw new Error('GROK_API_KEY가 설정되지 않았습니다');

    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens || 1200;

    try {
      const response = await this.axiosInstance.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: this.MODEL,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: options.stream || false
        },
        {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          timeout: options.timeout || this.DEFAULT_TIMEOUT
        }
      );
      return this.validateResponse(response.data);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * 응답 형식 유효성 검사
   */
  private validateResponse(data: any): GrokResponse {
    if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('유효하지 않은 API 응답');
    }
    return data as GrokResponse;
  }

  /**
   * 요청 중복 제거 및 배치 처리
   */
  private async deduplicateAndBatchRequests(cacheKey: string, messages: GrokMessage[], options: GrokOptions): Promise<GrokResponse> {
    if (cacheKey in this.requestPool) {
      return this.requestPool[cacheKey];
    }
    if (Object.keys(this.requestPool).length >= this.MAX_POOL_SIZE) {
      return this.callGrokDirect(messages, options);
    }
    const requestPromise = this.callGrokDirect(messages, options).finally(() => {
      delete this.requestPool[cacheKey];
    });
    this.requestPool[cacheKey] = requestPromise;
    return requestPromise;
  }

  /**
   * 메시지 사전 처리 및 최적화
   */
  private preprocessMessages(messages: GrokMessage[], options: GrokOptions): GrokMessage[] {
    if (options.skipOptimization) return messages;
    const aggressive = options.reducePromptSize === true;
    return messages.map(msg => ({
      role: msg.role,
      content: this.optimizeContent(msg.content, aggressive)
    }));
  }
  
  /**
   * 고급 캐싱 전략 적용
   */
  private async applyAdvancedCaching(messages: GrokMessage[], options: GrokOptions): Promise<GrokResponse | null> {
    if (options.cacheLevel === 'none') return null;
    const temperature = options.temperature || 0.7;
    const cacheKey = this.generateCacheKey(messages, temperature);
    const exactCache = await cache.get<GrokResponse>(cacheKey) || this.responseCache.get(cacheKey);
    return exactCache || null;
  }
  
  /**
   * 응답 캐싱
   */
  private async cacheResponse(messages: GrokMessage[], response: GrokResponse, options: GrokOptions): Promise<void> {
    if (options.cacheLevel === 'none') return;
    const temperature = options.temperature || 0.7;
    const cacheKey = this.generateCacheKey(messages, temperature);
    await cache.set(cacheKey, response, { ttl: 3600 });
    if (options.cacheLevel === 'aggressive') {
      this.responseCache.set(cacheKey, response);
    }
  }

  /**
   * 최적화된 Circuit Breaker 패턴이 적용된 Grok API 호출
   */
  public async callGrok(messages: GrokMessage[], options: GrokOptions = {}): Promise<GrokResponse> {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('유효한 메시지 배열이 필요합니다');
    }

    const optimizedMessages = this.preprocessMessages(messages, options);
    const cachedResponse = await this.applyAdvancedCaching(optimizedMessages, options);
    if (cachedResponse) return cachedResponse;

    try {
      const cacheKey = this.generateCacheKey(optimizedMessages, options.temperature || 0.7);
      const result = await this.breaker.executeWithBreaker(() =>
        this.deduplicateAndBatchRequests(cacheKey, optimizedMessages, options)
      );
      await this.cacheResponse(optimizedMessages, result, options);
      return result;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * 스트리밍 응답을 위한 API 호출
   */
  public async callGrokStream(messages: GrokMessage[], options: GrokOptions = {}): Promise<NodeJS.ReadableStream> {
    const optimizedMessages = this.preprocessMessages(messages, options);
    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) throw new Error('GROK_API_KEY가 설정되지 않았습니다');

    return this.breaker.executeWithBreaker(async () => {
      try {
        const response = await this.axiosInstance.post(
          'https://api.x.ai/v1/chat/completions',
          {
            model: this.MODEL,
            messages: optimizedMessages,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 1500,
            stream: true
          },
          {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            responseType: 'stream',
            timeout: options.timeout || 60000
          }
        );
        return response.data;
      } catch (error: any) {
        throw error;
      }
    });
  }
}

// 서비스 인스턴스 생성
const grokService = new GrokService();

// 외부에서 사용할 함수들
export const callGrok = (messages: GrokMessage[], options?: GrokOptions) => {
  return grokService.callGrok(messages, options);
};

export const callGrokStream = (messages: GrokMessage[], options?: GrokOptions) => {
  return grokService.callGrokStream(messages, options);
};

// 서비스 직접 export (테스트 및 고급 사용 사례용)
export { grokService };