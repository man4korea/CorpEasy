import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '../utils/logger';

// 기본 메시지 타입
export interface ApiMessage {
  role: string;
  content: string;
}

// 기본 API 옵션
export interface ApiOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  timeout?: number;
  extraParams?: Record<string, any>;
}

// 기본 API 구성
export interface ApiConfig {
  url: string;
  apiKeyEnvVar: string;
  defaultModel: string;
  timeout: number;
  headers?: Record<string, string>;
}

/**
 * 기본 AI API 서비스 클래스
 */
export class BaseApiService {
  protected config: ApiConfig;
  
  constructor(config: ApiConfig) {
    this.config = config;
  }
  
  /**
   * API 키 검증
   */
  protected validateApiKey(): string {
    const apiKey = process.env[this.config.apiKeyEnvVar];
    if (!apiKey) {
      throw new Error(`${this.config.apiKeyEnvVar}가 설정되지 않았습니다`);
    }
    return apiKey;
  }
  
  /**
   * API 요청 전송
   */
  protected async sendRequest<T>(
    endpoint: string,
    data: any,
    options: ApiOptions = {}
  ): Promise<T> {
    const apiKey = this.validateApiKey();
    
    const requestConfig: AxiosRequestConfig = {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(this.config.headers || {})
      },
      timeout: options.timeout || this.config.timeout
    };
    
    try {
      const response = await axios.post<T>(
        `${this.config.url}${endpoint}`,
        data,
        requestConfig
      );
      
      return response.data;
    } catch (error: any) {
      logger.error(`API 호출 오류 (${this.config.url}${endpoint}):`, error.response?.data || error.message);
      throw error;
    }
  }
} 