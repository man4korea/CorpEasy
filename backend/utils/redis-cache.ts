// 📁 backend/utils/redis-cache.ts
// Redis 기반 캐싱 서비스 구현

import { createClient } from 'redis';
import { CacheService } from './cache-interface';
import { logger } from './logger';
import { MemoryCache } from './memory-cache';

// 개발 환경 여부 확인
const isDevelopment = process.env.NODE_ENV === 'development';

class RedisCache implements CacheService {
  private client: any;
  private memoryCache: MemoryCache;
  private useMemoryCache: boolean = false;
  private connectionAttempts: number = 0;
  private readonly MAX_CONNECTION_ATTEMPTS: number = 3;
  private readonly CONNECTION_TIMEOUT: number = 5000; // 5초
  private connectionPromise: Promise<void> | null = null;
  
  private stats = {
    hits: 0,
    misses: 0,
    size: 0,
    totalAccessTime: 0,
    accessCount: 0
  };

  constructor() {
    // 메모리 캐시 인스턴스 생성
    this.memoryCache = new MemoryCache();
    
    // 개발 환경에서는 기본적으로 메모리 캐시 사용
    this.useMemoryCache = isDevelopment;
    
    if (!isDevelopment) {
      this.initRedis();
    } else {
      logger.info('개발 환경: 메모리 캐시를 사용합니다');
    }
  }

  /**
   * Redis 클라이언트 초기화
   */
  private async initRedis(): Promise<void> {
    // 이미 연결 시도 중이면 해당 Promise 반환
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    
    // 연결 시도 횟수 증가
    this.connectionAttempts++;
    
    this.connectionPromise = new Promise<void>(async (resolve, reject) => {
      try {
        // Redis URL이 없으면 메모리 캐시 사용
        if (!process.env.REDIS_URL) {
          logger.warn('Redis URL이 설정되지 않았습니다. 메모리 캐시를 사용합니다.');
          this.useMemoryCache = true;
          resolve();
          return;
        }
        
        // 연결 시도 제한 확인
        if (this.connectionAttempts > this.MAX_CONNECTION_ATTEMPTS) {
          logger.warn(`최대 연결 시도 횟수(${this.MAX_CONNECTION_ATTEMPTS})를 초과했습니다. 메모리 캐시를 사용합니다.`);
          this.useMemoryCache = true;
          resolve();
          return;
        }

        logger.info(`Redis 연결 시도 중... (시도 ${this.connectionAttempts}/${this.MAX_CONNECTION_ATTEMPTS})`);
        
        // 연결 타임아웃 설정
        const timeout = setTimeout(() => {
          logger.error('Redis 연결 시간 초과');
          this.useMemoryCache = true;
          reject(new Error('Redis 연결 시간 초과'));
        }, this.CONNECTION_TIMEOUT);

        this.client = createClient({
          url: process.env.REDIS_URL || 'redis://localhost:6379',
          socket: {
            reconnectStrategy: (retries) => {
              const maxRetries = 2;
              
              if (retries > maxRetries) {
                logger.warn(`Redis 재연결 실패 (${retries}회 시도)`);
                this.useMemoryCache = true;
                return false; // 재연결 중지
              }
              
              // 백오프 시간: 100ms, 200ms
              return Math.min(retries * 100, 200);
            }
          }
        });

        this.client.on('error', (err: Error) => {
          logger.error('Redis 연결 오류:', err);
          this.useMemoryCache = true;
        });

        this.client.on('connect', () => {
          logger.info('Redis 연결 성공');
          this.useMemoryCache = false;
          clearTimeout(timeout);
        });

        this.client.on('reconnecting', () => {
          logger.info('Redis 재연결 시도 중...');
        });

        // 연결 시도
        await this.client.connect();
        clearTimeout(timeout);
        resolve();
      } catch (error) {
        logger.error('Redis 초기화 실패:', error);
        this.useMemoryCache = true;
        reject(error);
      } finally {
        this.connectionPromise = null;
      }
    }).catch(error => {
      logger.error('Redis 초기화 중 예외 발생:', error);
      this.useMemoryCache = true;
    });

    try {
      await this.connectionPromise;
    } catch (error) {
      // 이미 오류 처리됨
    }
  }

  /**
   * Redis 연결 재시도
   */
  public async reconnect(): Promise<CacheService> {
    // 연결 시도 카운터 리셋
    this.connectionAttempts = 0;
    this.useMemoryCache = false;
    
    try {
      // 기존 클라이언트가 있으면 닫기
      if (this.client) {
        try {
          await this.client.quit();
        } catch (error) {
          logger.warn('Redis 클라이언트 종료 중 오류:', error);
        }
        this.client = null;
      }
      
      // 다시 연결 시도
      await this.initRedis();
      
      // 연결 성공했으면 현재 인스턴스 반환, 실패했으면 메모리 캐시 반환
      return this.useMemoryCache ? this.memoryCache : this;
    } catch (error) {
      logger.error('Redis 재연결 실패:', error);
      this.useMemoryCache = true;
      return this.memoryCache;
    }
  }

  /**
   * 캐시에서 데이터 조회
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();

    if (this.useMemoryCache) {
      return this.memoryCache.get<T>(key);
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        this.stats.hits++;
        const endTime = performance.now();
        this.updateAccessStats(endTime - startTime);
        return JSON.parse(value);
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      logger.error(`Redis 조회 오류 (${key}):`, error);
      this.useMemoryCache = true;
      return this.memoryCache.get<T>(key);
    }
  }

  /**
   * 캐시에 데이터 저장
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (this.useMemoryCache) {
      return this.memoryCache.set(key, value, ttl);
    }

    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      return true;
    } catch (error) {
      logger.error(`Redis 저장 오류 (${key}):`, error);
      this.useMemoryCache = true;
      return this.memoryCache.set(key, value, ttl);
    }
  }

  /**
   * 캐시에서 데이터 삭제
   */
  async del(key: string): Promise<boolean> {
    if (this.useMemoryCache) {
      return this.memoryCache.del(key);
    }

    try {
      const result = await this.client.del(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis 삭제 오류 (${key}):`, error);
      this.useMemoryCache = true;
      return this.memoryCache.del(key);
    }
  }

  /**
   * 패턴과 일치하는 모든 키 조회
   */
  async keys(pattern: string): Promise<string[]> {
    if (this.useMemoryCache) {
      return this.memoryCache.keys(pattern);
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Redis 키 조회 오류 (${pattern}):`, error);
      this.useMemoryCache = true;
      return this.memoryCache.keys(pattern);
    }
  }

  /**
   * 모든 캐시 항목 삭제
   */
  async flushAll(): Promise<boolean> {
    if (this.useMemoryCache) {
      return this.memoryCache.flushAll();
    }

    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      logger.error('Redis 초기화 오류:', error);
      this.useMemoryCache = true;
      return this.memoryCache.flushAll();
    }
  }

  /**
   * 캐시 통계 정보 조회
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
    try {
      const hitRate = this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) 
        : 0;
      
      const avgAccessTime = this.stats.accessCount > 0
        ? this.stats.totalAccessTime / this.stats.accessCount
        : 0;

      return {
        type: this.useMemoryCache ? 'memory (fallback)' : 'redis',
        size: this.stats.size,
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: parseFloat(hitRate.toFixed(2)),
        avgAccessTimeMs: avgAccessTime.toFixed(2)
      };
    } catch (error: any) {
      logger.error('Redis 통계 조회 오류:', error);
      return {
        type: 'redis',
        size: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        avgAccessTimeMs: '0',
        error: error.message
      };
    }
  }

  /**
   * 접근 통계 업데이트
   */
  private updateAccessStats(accessTime: number): void {
    this.stats.totalAccessTime += accessTime;
    this.stats.accessCount++;
  }

  /**
   * 현재 사용 중인 캐시 유형 확인
   */
  getCurrentCacheType(): string {
    return this.useMemoryCache ? 'memory (fallback)' : 'redis';
  }
}

// Redis 캐시 인스턴스 생성
const redisCache = new RedisCache();

export default redisCache;