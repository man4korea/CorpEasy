// 📁 backend/utils/memory-cache.ts
// 인메모리 캐시 구현 (최적화 버전)

import { CacheService, CacheOptions, DEFAULT_CACHE_OPTIONS } from './cache-interface';
import { logger } from './logger';

// 캐시 항목 인터페이스
interface CacheItem<T> {
  value: T;
  expiry: number;
  metadata: {
    hitCount: number;
    lastAccessed: Date;
    priority: 'low' | 'normal' | 'high';
    tags: string[];
    createdAt: Date;
  };
}

/**
 * 메모리 캐시 서비스 구현
 */
export class MemoryCache implements CacheService {
  private cache: Map<string, CacheItem<any>>;
  private stats: {
    hits: number;
    misses: number;
    totalAccessTime: number;
    accessCount: number;
    lastCleanup: Date;
  };
  private cleanupInterval: NodeJS.Timeout;
  private readonly maxItems: number;
  private readonly cleanupIntervalMs: number;

  /**
   * MemoryCache 생성자
   * @param options 캐시 옵션
   */
  constructor(options: {
    maxItems?: number;
    cleanupIntervalMs?: number;
  } = {}) {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      totalAccessTime: 0,
      accessCount: 0,
      lastCleanup: new Date()
    };
    
    // 옵션 설정
    this.maxItems = options.maxItems || 1000; // 기본 최대 1000개 항목
    this.cleanupIntervalMs = options.cleanupIntervalMs || 5 * 60 * 1000; // 기본 5분
    
    // 주기적 청소 작업 설정
    this.cleanupInterval = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
    
    logger.info(`메모리 캐시 초기화: 최대 항목 수=${this.maxItems}, 정리 간격=${this.cleanupIntervalMs/1000}초`);
  }

  /**
   * 캐시에서 항목 조회
   * @param key 캐시 키
   * @returns 저장된 값 (없으면 null)
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    const item = this.cache.get(key);
    
    // 캐시 미스 또는 만료된 항목
    if (!item || item.expiry < Date.now()) {
      this.stats.misses++;
      
      // 만료된 항목이면 삭제
      if (item) {
        this.cache.delete(key);
      }
      
      return null;
    }
    
    // 캐시 히트
    this.stats.hits++;
    item.metadata.hitCount++;
    item.metadata.lastAccessed = new Date();
    
    // 성능 통계 업데이트
    const duration = Date.now() - startTime;
    this.stats.totalAccessTime += duration;
    this.stats.accessCount++;
    
    return item.value as T;
  }

  /**
   * 캐시에 항목 저장
   * @param key 캐시 키
   * @param value 저장할 값
   * @param options 캐시 옵션
   * @returns 저장 성공 여부
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    try {
      // 옵션 기본값 적용
      const opts = { ...DEFAULT_CACHE_OPTIONS, ...(options || {}) };
      
      // 만료 시간 계산 (현재 시간 + TTL)
      const expiry = Date.now() + (opts.ttl! * 1000);
      
      // 캐시 항목 생성
      const item: CacheItem<T> = {
        value,
        expiry,
        metadata: {
          hitCount: 0,
          lastAccessed: new Date(),
          priority: opts.priority!,
          tags: opts.tags || [],
          createdAt: new Date()
        }
      };
      
      // 캐시에 저장
      this.cache.set(key, item);
      
      // 캐시 크기 관리
      if (this.cache.size > this.maxItems) {
        this.cleanupLeastImportant();
      }
      
      return true;
    } catch (error) {
      logger.error(`캐시 항목 저장 실패 (${key}):`, error);
      return false;
    }
  }

  /**
   * 캐시에서 항목 삭제
   * @param key 삭제할 키
   * @returns 삭제 성공 여부
   */
  async del(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * 패턴과 일치하는 모든 키 조회
   * @param pattern 검색 패턴
   * @returns 일치하는 키 배열
   */
  async keys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keys.push(key);
      }
    }
    
    return keys;
  }

  /**
   * 모든 캐시 항목 삭제
   * @returns 초기화 성공 여부
   */
  async flushAll(): Promise<boolean> {
    try {
      this.cache.clear();
      
      // 통계 초기화
      this.stats = {
        hits: 0,
        misses: 0,
        totalAccessTime: 0,
        accessCount: 0,
        lastCleanup: new Date()
      };
      
      return true;
    } catch (error) {
      logger.error('캐시 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 캐시 통계 정보 조회
   * @returns 통계 정보
   */
  async getStats(): Promise<{
    type: string;
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    avgAccessTimeMs: string;
    error?: string;
  }> {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;
      
    const avgAccessTime = this.stats.accessCount > 0
      ? this.stats.totalAccessTime / this.stats.accessCount
      : 0;
    
    return {
      type: 'memory',
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: parseFloat(hitRate.toFixed(2)),
      avgAccessTimeMs: avgAccessTime.toFixed(2)
    };
  }

  /**
   * 현재 사용 중인 캐시 유형 확인
   * @returns 캐시 유형
   */
  getCurrentCacheType(): string {
    return 'memory';
  }

  /**
   * 만료된 항목 및 캐시 크기 관리를 위한 정리 작업
   */
  private cleanup(): void {
    try {
      const now = Date.now();
      let expiredCount = 0;
      
      // 만료된 항목 삭제
      for (const [key, item] of this.cache.entries()) {
        if (item.expiry < now) {
          this.cache.delete(key);
          expiredCount++;
        }
      }
      
      // 캐시 크기가 최대치를 초과하면 추가 정리
      if (this.cache.size > this.maxItems) {
        const removedCount = this.cleanupLeastImportant();
        logger.info(`캐시 크기 제한으로 ${removedCount}개 항목 제거됨`);
      }
      
      if (expiredCount > 0) {
        logger.info(`캐시 정리: ${expiredCount}개 만료 항목 제거됨, 현재 크기: ${this.cache.size}`);
      }
      
      this.stats.lastCleanup = new Date();
    } catch (error) {
      logger.error('캐시 정리 중 오류 발생:', error);
    }
  }

  /**
   * 캐시 크기 관리를 위해 중요도가 낮은 항목 제거
   * @returns 제거된 항목 수
   */
  private cleanupLeastImportant(): number {
    // 제거할 항목 수 계산 (20%)
    const removeCount = Math.ceil(this.cache.size * 0.2);
    let removed = 0;
    
    // 항목 점수 계산 함수
    const getItemScore = (item: CacheItem<any>): number => {
      const priorityScore = 
        item.metadata.priority === 'high' ? 3 :
        item.metadata.priority === 'normal' ? 2 : 1;
      
      const hitScore = Math.log(item.metadata.hitCount + 1);
      const freshnessScore = Math.max(0, (item.expiry - Date.now()) / 1000 / 3600); // 남은 시간(시간)
      
      return priorityScore * hitScore * (freshnessScore + 1);
    };
    
    // 모든 항목을 점수별로 정렬
    const sortedItems = Array.from(this.cache.entries())
      .sort((a, b) => getItemScore(a[1]) - getItemScore(b[1]));
    
    // 점수가 가장 낮은 항목부터 제거
    for (let i = 0; i < Math.min(removeCount, sortedItems.length); i++) {
      this.cache.delete(sortedItems[i][0]);
      removed++;
    }
    
    return removed;
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}