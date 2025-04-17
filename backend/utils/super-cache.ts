// 📁 backend/utils/super-cache.ts
// 고성능 캐싱 시스템 (Grok API 응답 시간 최적화용)

import { CacheService, CacheOptions, DEFAULT_CACHE_OPTIONS } from './cache-interface';
import { logger } from './logger';
import crypto from 'crypto';
import { promisify } from 'util';
import zlib from 'zlib';

// zlib 압축/해제 함수 Promise 버전
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * 캐시 항목 타입
 */
interface CacheItem<T> {
  value: T | Buffer; // 원본 값 또는 압축된 버퍼
  expiry: number;    // 만료 시간 (timestamp)
  isCompressed: boolean; // 압축 여부
  metadata: {
    hitCount: number;       // 조회 횟수
    lastAccessed: number;   // 마지막 접근 시간
    priority: 'low' | 'normal' | 'high'; // 우선순위
    tags: string[];         // 태그
    createdAt: number;      // 생성 시간
    size: number;           // 크기 (바이트)
  };
}

/**
 * 캐시 통계 타입
 */
interface CacheStats {
  hits: number;
  misses: number;
  totalItems: number;
  totalSizeBytes: number;
  compressionRatio: number;
  hitRate: number;
  avgAccessTime: number;
  avgCompressionTime: number;
  avgDecompressionTime: number;
  lastCleanup: number;
}

/**
 * 캐시 샤드 - 각 샤드는 특정 키 세트를 담당
 */
class CacheShard<T> {
  private items = new Map<string, CacheItem<T>>();
  private totalSize = 0;
  
  /**
   * 캐시 항목 저장
   */
  set(key: string, item: CacheItem<T>): void {
    // 기존 항목이 있으면 크기에서 제외
    if (this.items.has(key)) {
      const oldItem = this.items.get(key)!;
      this.totalSize -= oldItem.metadata.size;
    }
    
    this.items.set(key, item);
    this.totalSize += item.metadata.size;
  }
  
  /**
   * 캐시 항목 조회
   */
  get(key: string): CacheItem<T> | undefined {
    return this.items.get(key);
  }
  
  /**
   * 캐시 항목 삭제
   */
  delete(key: string): boolean {
    if (this.items.has(key)) {
      const item = this.items.get(key)!;
      this.totalSize -= item.metadata.size;
      return this.items.delete(key);
    }
    return false;
  }
  
  /**
   * 모든 캐시 항목 조회
   */
  entries(): IterableIterator<[string, CacheItem<T>]> {
    return this.items.entries();
  }
  
  /**
   * 캐시 크기 조회
   */
  size(): number {
    return this.items.size;
  }
  
  /**
   * 총 바이트 크기 조회
   */
  bytes(): number {
    return this.totalSize;
  }
  
  /**
   * 모든 캐시 항목 삭제
   */
  clear(): void {
    this.items.clear();
    this.totalSize = 0;
  }
  
  /**
   * 캐시 키 목록 조회
   */
  keys(): IterableIterator<string> {
    return this.items.keys();
  }
}

/**
 * 고성능 캐시 구현
 * - 샤딩: 여러 Map으로 데이터 분산
 * - 압