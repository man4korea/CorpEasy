// 📁 backend/utils/logger.ts
import { performance } from 'perf_hooks';

// 로깅 레벨 정의
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// 환경 변수에서 로깅 레벨 가져오기 (기본값: INFO)
const LOG_LEVEL = (process.env.LOG_LEVEL || 'INFO').toUpperCase();
const CURRENT_LOG_LEVEL = LogLevel[LOG_LEVEL as keyof typeof LogLevel] || LogLevel.INFO;

// 성능 메트릭 저장소
const performanceMetrics: Record<string, {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
}> = {};

/**
 * 비동기 함수 실행 시간 측정 유틸
 * @param label - 콘솔에 출력할 이름
 * @param fn - 측정 대상 함수
 * @returns 함수 실행 결과
 */
export async function logTimer<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (CURRENT_LOG_LEVEL < LogLevel.INFO) {
    return fn(); // 로깅 레벨이 낮으면 그냥 실행
  }
  
  const start = performance.now();
  
  try {
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    
    // 콘솔에 출력
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    
    // 메트릭 저장
    updatePerformanceMetric(label, duration);
    
    return result;
  } catch (error) {
    const end = performance.now();
    const duration = end - start;
    
    // 에러 케이스도 메트릭에 포함
    updatePerformanceMetric(`${label} (오류)`, duration);
    
    throw error;
  }
}

/**
 * 성능 메트릭 업데이트
 */
function updatePerformanceMetric(label: string, duration: number): void {
  if (!performanceMetrics[label]) {
    performanceMetrics[label] = {
      count: 0,
      totalTime: 0,
      minTime: duration,
      maxTime: duration,
      avgTime: duration,
    };
  }
  
  const metric = performanceMetrics[label];
  metric.count++;
  metric.totalTime += duration;
  metric.minTime = Math.min(metric.minTime, duration);
  metric.maxTime = Math.max(metric.maxTime, duration);
  metric.avgTime = metric.totalTime / metric.count;
}

/**
 * 현재 성능 메트릭 보고서 생성
 */
export function getPerformanceReport(): any {
  return Object.entries(performanceMetrics).map(([label, metric]) => ({
    label,
    count: metric.count,
    avgTime: metric.avgTime.toFixed(2),
    minTime: metric.minTime.toFixed(2),
    maxTime: metric.maxTime.toFixed(2),
    totalTime: metric.totalTime.toFixed(2),
  }));
}

/**
 * 레벨별 로깅 함수들
 */
export const logger = {
  error: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL >= LogLevel.ERROR) {
      console.error(`❌ ERROR: ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL >= LogLevel.WARN) {
      console.warn(`⚠️ WARN: ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL >= LogLevel.INFO) {
      console.info(`ℹ️ INFO: ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL >= LogLevel.DEBUG) {
      console.debug(`🔍 DEBUG: ${message}`, ...args);
    }
  },
  
  // 요청 추적용 로깅 함수
  request: (method: string, path: string, duration: number): void => {
    if (CURRENT_LOG_LEVEL >= LogLevel.INFO) {
      const durationColor = 
        duration < 100 ? '\x1b[32m' : // 녹색 (빠름)
        duration < 1000 ? '\x1b[33m' : // 노란색 (보통)
        '\x1b[31m'; // 빨간색 (느림)
      
      console.log(`🌐 ${method} ${path} - ${durationColor}${duration.toFixed(2)}ms\x1b[0m`);
      
      // 성능 메트릭에 추가
      updatePerformanceMetric(`${method} ${path}`, duration);
    }
  },
  
  // 주기적인 성능 보고서 출력
  enablePerformanceReporting: (intervalMs: number = 60000): NodeJS.Timeout => {
    return setInterval(() => {
      if (CURRENT_LOG_LEVEL >= LogLevel.INFO) {
        console.log('\n📊 성능 메트릭 보고서:');
        console.table(getPerformanceReport());
      }
    }, intervalMs);
  }
};