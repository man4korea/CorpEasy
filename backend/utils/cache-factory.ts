// 📁 backend/utils/cache-factory.ts
// 캐시 서비스 팩토리 구현 (최적화 버전)

import { CacheService } from './cache-interface';
import { MemoryCache } from './memory-cache';
import { logger } from './logger';

// 개발 환경 확인
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 사용 가능한 캐시 유형
 */
type CacheType = 'memory' | 'redis' | 'auto';

/**
 * 캐시 팩토리 클래스 - 환경 설정에 따른 캐시 인스턴스 제공
 */
class CacheFactory {
  private static instance: CacheFactory;
  private cacheInstance: CacheService | null = null;
  private cacheType: CacheType = 'auto';
  private lastInitTime: number = 0;
  private initErrors: number = 0;
  private readonly MAX_ERRORS = 3;

  private constructor() {
    // 환경 변수에서 캐시 타입 읽기
    const envCacheType = process.env.CACHE_TYPE as CacheType;
    if (envCacheType && ['memory', 'redis', 'auto'].includes(envCacheType)) {
      this.cacheType = envCacheType;
      logger.info(`환경 변수에서 캐시 타입 설정: ${this.cacheType}`);
    } else {
      // 개발 환경에서는 기본적으로 메모리 캐시 사용
      if (isDevelopment) {
        this.cacheType = 'memory';
        logger.info('개발 환경: 기본 메모리 캐시 사용');
      }
    }
    
    this.initCache();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): CacheFactory {
    if (!CacheFactory.instance) {
      CacheFactory.instance = new CacheFactory();
    }
    return CacheFactory.instance;
  }

  /**
   * 캐시 초기화
   */
  private initCache(): CacheService {
    try {
      this.lastInitTime = Date.now();
      
      // 모든 환경에서 기본적으로 메모리 캐시 사용
      // Redis는 현재 구현에서 제외 (Redis 구현 시 여기서 추가)
      logger.info(`캐시 타입 '${this.cacheType}' 초기화: 메모리 캐시 사용`);
      this.cacheInstance = new MemoryCache({
        maxItems: parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10),
        cleanupIntervalMs: parseInt(process.env.CACHE_CLEANUP_INTERVAL || '300000', 10) // 5분
      });
      
      this.initErrors = 0; // 초기화 성공 시 오류 카운터 리셋
      return this.cacheInstance;
    } catch (error) {
      this.initErrors++;
      logger.error(`캐시 초기화 오류 (${this.initErrors}/${this.MAX_ERRORS}):`, error);
      
      // 안전하게 메모리 캐시 생성
      this.cacheInstance = new MemoryCache();
      return this.cacheInstance;
    }
  }

  /**
   * 캐시 인스턴스 반환
   * @param forceType 강제 캐시 유형 (선택 사항)
   * @returns 캐시 서비스 인스턴스
   */
  public getCache(forceType?: CacheType): CacheService {
    // 이미 생성된 인스턴스가 있고 강제 타입이 지정되지 않았다면 기존 인스턴스 반환
    if (this.cacheInstance && !forceType) {
      return this.cacheInstance;
    }

    // 강제 타입이 지정된 경우 해당 타입 사용
    if (forceType) {
      this.cacheType = forceType;
    }

    return this.initCache();
  }

  /**
   * 캐시 초기화 (재설정)
   * @param type 강제 캐시 유형 (선택 사항)
   * @returns 초기화된 캐시 인스턴스 
   */
  public resetCache(type?: CacheType): CacheService {
    // 기존 인스턴스 정리
    if (this.cacheInstance && typeof (this.cacheInstance as any).destroy === 'function') {
      try {
        (this.cacheInstance as any).destroy();
      } catch (e) {
        logger.warn('기존 캐시 인스턴스 정리 중 오류:', e);
      }
    }
    
    this.cacheInstance = null;
    
    if (type) {
      this.cacheType = type;
    }
    
    return this.getCache();
  }

  /**
   * 현재 사용 중인 캐시 유형 확인
   * @returns 캐시 유형 
   */
  public getCurrentCacheType(): string {
    if (!this.cacheInstance) {
      return 'none';
    }
    
    try {
      return this.cacheInstance.getCurrentCacheType();
    } catch (error) {
      logger.error('캐시 타입 확인 오류:', error);
      return 'unknown';
    }
  }

  /**
   * 캐시 통계 반환
   * @returns 캐시 통계 정보
   */
  public async getStats(): Promise<any> {
    if (!this.cacheInstance) {
      return {
        type: 'none',
        status: 'not_initialized',
        lastInitTime: this.lastInitTime ? new Date(this.lastInitTime).toISOString() : null
      };
    }
    
    try {
      return await this.cacheInstance.getStats();
    } catch (error) {
      logger.error('캐시 통계 조회 오류:', error);
      return {
        type: this.getCurrentCacheType(),
        status: 'error',
        error: error.message,
        lastInitTime: this.lastInitTime ? new Date(this.lastInitTime).toISOString() : null
      };
    }
  }
}

// 팩토리 인스턴스 생성
export const cacheFactory = CacheFactory.getInstance();

// 기본 캐시 인스턴스 가져오기
export const cache = cacheFactory.getCache();

// 팩토리도 내보내기
export default cacheFactory;