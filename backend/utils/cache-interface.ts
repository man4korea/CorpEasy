// 📁 backend/utils/cache-interface.ts
// 캐시 서비스 인터페이스 정의

import { CacheStats } from './types';

/**
 * 캐시 서비스 인터페이스
 * 다양한 캐시 구현체(메모리, Redis 등)를 위한 공통 인터페이스
 */
export interface CacheService {
  /**
   * 캐시에서 항목 조회
   * @param key 캐시 키
   * @returns 저장된 값 (없으면 null)
   */
  get<T>(key: string): Promise<T | null>;
  
  /**
   * 캐시에 항목 저장
   * @param key 캐시 키
   * @param value 저장할 값
   * @param options 캐시 옵션
   * @returns 저장 성공 여부
   */
  set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean>;
  
  /**
   * 캐시에서 항목 삭제
   * @param key 삭제할 키
   * @returns 삭제 성공 여부
   */
  del(key: string): Promise<boolean>;
  
  /**
   * 패턴과 일치하는 모든 키 조회
   * @param pattern 검색 패턴
   * @returns 일치하는 키 배열
   */
  keys(pattern: string): Promise<string[]>;
  
  /**
   * 모든 캐시 항목 삭제
   * @returns 초기화 성공 여부
   */
  flushAll(): Promise<boolean>;
  
  /**
   * 캐시 통계 정보 조회
   * @returns 통계 정보
   */
  getStats(): Promise<{
    type: string;
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    avgAccessTimeMs: string;
    error?: string;
  }>;
  
  /**
   * 현재 사용 중인 캐시 유형 확인
   * @returns 캐시 유형
   */
  getCurrentCacheType(): string;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  priority?: 'low' | 'normal' | 'high';
}

export interface CacheInterface {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
  warmUp(keys: string[]): Promise<void>;
  setAdaptiveTTL(key: string, hitCount: number): Promise<void>;
  getKeysByTag(tag: string): Promise<string[]>;
}

export const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  ttl: 600, // 10 minutes
  priority: 'normal',
  tags: []
};

export const ADAPTIVE_TTL_CONFIG = {
  MIN_TTL: 300,    // 5 minutes
  MAX_TTL: 3600,   // 1 hour
  HIT_MULTIPLIER: 1.5,
  BASE_TTL: 600    // 10 minutes
};