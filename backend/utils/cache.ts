// 📁 backend/utils/cache.ts
import { createClient } from 'redis';
import { logger } from './logger';
import crypto from 'crypto';
import { cache } from './cache-factory';

// 메모리 캐시를 위한 Map
const memoryCache = new Map<string, { value: any; timestamp: number }>();

// 개발 환경 여부 확인
const isDevelopment = process.env.NODE_ENV === 'development';

logger.info(`메모리 캐시를 사용합니다 (${isDevelopment ? '개발' : '프로덕션'} 모드)`);

// Redis 클라이언트 초기화 함수
const initRedisClient = async () => {
  // 개발 환경이면 Redis 연결 시도하지 않음
  if (isDevelopment) {
    return null;
  }

  // 프로덕션 환경에서만 Redis 연결 시도
  try {
    const client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    client.on('error', (err) => {
      logger.error('Redis 연결 오류:', err);
    });
    
    await client.connect();
    logger.info('Redis 연결 성공');
    return client;
  } catch (error) {
    logger.error('Redis 초기화 실패:', error);
    return null;
  }
};

// Redis 클라이언트 (프로덕션 모드에서만 초기화)
let redisClient: any = null;

// 캐시 클래스
export class EnhancedCache {
  private static instance: EnhancedCache;
  private metrics: Map<string, { hits: number; misses: number }>;
  private initialized: boolean = false;

  private constructor() {
    this.metrics = new Map();
  }

  static async getInstance(): Promise<EnhancedCache> {
    if (!EnhancedCache.instance) {
      EnhancedCache.instance = new EnhancedCache();
    }
    
    // 초기화가 아직 안된 경우에만 초기화 진행
    if (!EnhancedCache.instance.initialized) {
      if (!isDevelopment) {
        redisClient = await initRedisClient();
      }
      EnhancedCache.instance.initialized = true;
    }
    
    return EnhancedCache.instance;
  }

  // 캐시에서 값 가져오기
  async get(key: string): Promise<any> {
    this.initMetrics(key);
    
    try {
      // 개발 환경에서는 항상 메모리 캐시 사용
      if (isDevelopment) {
        const item = memoryCache.get(key);
        if (item && Date.now() - item.timestamp < 3600000) { // 1시간 TTL
          this.metrics.get(key)!.hits++;
          return item.value;
        }
      } else if (redisClient) {
        const value = await redisClient.get(key);
        if (value) {
          this.metrics.get(key)!.hits++;
          return JSON.parse(value);
        }
      }
      
      this.metrics.get(key)!.misses++;
      return null;
    } catch (error) {
      logger.error('캐시 조회 오류:', error);
      return null;
    }
  }

  // 캐시에 값 저장
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      // 개발 환경에서는 항상 메모리 캐시 사용
      if (isDevelopment) {
        memoryCache.set(key, {
          value,
          timestamp: Date.now()
        });
      } else if (redisClient) {
        await redisClient.setEx(key, ttl, JSON.stringify(value));
      }
    } catch (error) {
      logger.error('캐시 저장 오류:', error);
    }
  }

  // 캐시 메트릭 초기화
  private initMetrics(key: string): void {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, { hits: 0, misses: 0 });
    }
  }

  // 캐시 메트릭 조회
  getMetrics(): Map<string, { hits: number; misses: number }> {
    return this.metrics;
  }
}

// 캐시 인스턴스 생성 함수
export const createCache = async (): Promise<EnhancedCache> => {
  return EnhancedCache.getInstance();
};

/**
 * 캐시에서 값 가져오기
 * @param key 캐시 키
 * @returns 캐시된 값 또는 null
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    return await cache.get<T>(key);
  } catch (error) {
    logger.error(`캐시 조회 오류 (${key}):`, error);
    return null;
  }
}

/**
 * 캐시에 값 저장
 * @param key 캐시 키
 * @param value 저장할 값
 * @param ttl 만료 시간(초)
 */
export async function setToCache<T>(key: string, value: T, ttl?: number): Promise<void> {
  try {
    await cache.set(key, value, ttl);
  } catch (error) {
    logger.error(`캐시 저장 오류 (${key}):`, error);
  }
}

/**
 * 캐시 초기화
 * @param key 특정 키만 초기화할 경우 해당 키
 */
export async function clearCache(key?: string): Promise<void> {
  try {
    if (key) {
      await cache.del(key);
    } else {
      await cache.flushAll();
    }
  } catch (error) {
    logger.error('캐시 초기화 오류:', error);
  }
}

/**
 * 복잡한 데이터에 대한 해시 기반 캐시 키 생성
 * @param data 해시화할 데이터
 * @returns MD5 해시 문자열
 */
export function createHashKey(data: any): string {
  const stringified = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('md5').update(stringified).digest('hex');
}

/**
 * 함수 호출 결과를 캐싱하는 래퍼 함수
 * @param cacheKey 캐시 키
 * @param fetchFn 결과를 가져오는 함수
 * @param ttl 만료 시간(초)
 * @returns 캐시된 결과 또는 새로 가져온 결과
 */
export async function withCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // 캐시에서 확인
  const cachedResult = await getFromCache<T>(cacheKey);
  if (cachedResult !== null) {
    logger.debug(`🎯 캐시 히트: ${cacheKey}`);
    return cachedResult;
  }

  // 캐시 미스 - 새로 가져오기
  logger.debug(`🔍 캐시 미스: ${cacheKey}`);
  const startTime = Date.now();
  
  try {
    const result = await fetchFn();
    const duration = Date.now() - startTime;
    logger.debug(`⏱️ 데이터 가져오기 완료: ${cacheKey} (${duration}ms)`);
    
    // 결과 캐싱
    await setToCache(cacheKey, result, ttl);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`❌ 데이터 가져오기 실패: ${cacheKey} (${duration}ms)`, error);
    throw error;
  }
}

/**
 * 요청 메모이제이션 (동일 요청이 동시에 여러번 들어올 경우 중복 방지)
 */
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * 동시 요청 메모이제이션
 * @param cacheKey 캐시 키
 * @param fetchFn 결과를 가져오는 함수
 * @returns 캐시된 결과 또는 새로 가져온 결과
 */
export async function memoizeRequest<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  // 진행 중인 요청이 있는지 확인
  if (inFlightRequests.has(cacheKey)) {
    logger.debug(`⏳ 기존 요청 재사용: ${cacheKey}`);
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }
  
  // 캐시에서 확인
  const cachedResult = await getFromCache<T>(cacheKey);
  if (cachedResult !== null) {
    logger.debug(`🎯 캐시 히트: ${cacheKey}`);
    return cachedResult;
  }
  
  // 새 요청 생성 및 추적
  logger.debug(`🔄 새 요청 시작: ${cacheKey}`);
  const promise = fetchFn()
    .then(async result => {
      // 결과 캐싱
      await setToCache(cacheKey, result);
      return result;
    })
    .finally(() => {
      // 완료된 요청 제거
      inFlightRequests.delete(cacheKey);
    });
  
  // 진행 중인 요청 맵에 저장
  inFlightRequests.set(cacheKey, promise);
  
  return promise;
}