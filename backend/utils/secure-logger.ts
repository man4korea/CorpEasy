// 📁 backend/utils/secure-logger.ts
// 민감한 정보를 마스킹하는 보안 로깅 유틸리티

import winston from 'winston';
import { format } from 'winston';

// 환경 변수 설정
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const isDev = process.env.NODE_ENV !== 'production';

// 민감한 정보 패턴들
const SENSITIVE_PATTERNS = [
  // API 키 패턴들 (다양한 API 제공업체 형식 커버)
  { pattern: /(["']?(?:api[_-]?key|apikey|key)["']?\s*[:=]\s*["']?)([^"'\s]+)(["']?)/gi, replacement: '$1********$3' },
  { pattern: /(Bearer\s+)([A-Za-z0-9\-_\.]+)/gi, replacement: '$1********' },
  { pattern: /(Authorization:\s*(?:Basic|Bearer)\s+)([A-Za-z0-9\-_\.=]+)/gi, replacement: '$1********' },
  
  // 특정 API 키 형식들
  { pattern: /(sk-ant-api[0-9]+-)[A-Za-z0-9]+/gi, replacement: '$1********' }, // Claude API 키
  { pattern: /(sk-)[A-Za-z0-9]{20,}/gi, replacement: '$1********' }, // OpenAI API 키
  { pattern: /(xai-)[A-Za-z0-9]{20,}/gi, replacement: '$1********' }, // Grok API 키
  
  // 암호 패턴들
  { pattern: /(["']?(?:password|passwd|pwd)["']?\s*[:=]\s*["']?)([^"'\s]+)(["']?)/gi, replacement: '$1********$3' },
  
  // JWT 토큰 패턴
  { pattern: /(eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+)\.[a-zA-Z0-9\-_]+/g, replacement: '$1.********' },
  
  // 개인정보 패턴들
  { pattern: /(\d{3})-(\d{2})-(\d{4})/g, replacement: '$1-XX-XXXX' }, // SSN
  { pattern: /(\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?)\d{4}/g, replacement: '$1XXXX' }, // 신용카드
  { pattern: /([a-zA-Z0-9._-]+@)([a-zA-Z0-9._-]+)(\.[a-zA-Z0-9._-]+)/gi, replacement: '$1******$3' } // 이메일
];

// 민감한 정보 마스킹 함수
export function maskSensitiveInfo(data: any): any {
  // 데이터가 없는 경우
  if (!data) return data;
  
  // 문자열인 경우 직접 마스킹
  if (typeof data === 'string') {
    let maskedData = data;
    SENSITIVE_PATTERNS.forEach(({ pattern, replacement }) => {
      maskedData = maskedData.replace(pattern, replacement);
    });
    return maskedData;
  }
  
  // 객체인 경우 깊은 복사 후 마스킹
  if (typeof data === 'object') {
    // 배열인 경우
    if (Array.isArray(data)) {
      return data.map(item => maskSensitiveInfo(item));
    }
    
    // 일반 객체인 경우
    const maskedObj: Record<string, any> = {};
    
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // 민감한 키 이름인지 확인
        const isSensitiveKey = ['api_key', 'apiKey', 'key', 'password', 'token', 'secret', 'credential'].includes(key.toLowerCase());
        
        // 민감한 키는 값을 마스킹, 아닌 경우 재귀적으로 처리
        if (isSensitiveKey && typeof data[key] === 'string') {
          maskedObj[key] = '********';
        } else {
          maskedObj[key] = maskSensitiveInfo(data[key]);
        }
      }
    }
    
    return maskedObj;
  }
  
  // 기타 타입은 그대로 반환
  return data;
}

// 로깅 포맷 함수
const logFormat = format.printf(({ level, message, timestamp, ...meta }) => {
  // 메시지와 메타데이터 마스킹 처리
  const maskedMessage = maskSensitiveInfo(message);
  const maskedMeta = maskSensitiveInfo(meta);
  
  // 메타데이터가 있는 경우 포함하여 로그 구성
  const metaStr = Object.keys(maskedMeta).length 
    ? `\n${JSON.stringify(maskedMeta, null, 2)}` 
    : '';
  
  return `${timestamp} [${level.toUpperCase()}]: ${maskedMessage}${metaStr}`;
});

// 로거 인스턴스 생성
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    logFormat
  ),
  defaultMeta: { service: 'ai-api-service' },
  transports: [
    // 에러 로그는 별도 파일에 기록
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // 전체 로그는 combined.log에 기록
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// 개발 환경에서는 콘솔에도 출력
if (isDev) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    )
  }));
}

// 성능 측정을 위한 로그 타이머
export async function logTimer<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.info(`${label} 완료 (${duration}ms)`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`${label} 실패 (${duration}ms)`, { error: maskSensitiveInfo(error) });
    throw error;
  }
}

// 성능 측정 데이터
const performanceMetrics: Record<string, { count: number, totalTime: number, avgTime: number }> = {};

// 성능 데이터 추가
export function recordPerformance(operation: string, duration: number): void {
  if (!performanceMetrics[operation]) {
    performanceMetrics[operation] = { count: 0, totalTime: 0, avgTime: 0 };
  }
  
  const metric = performanceMetrics[operation];
  metric.count++;
  metric.totalTime += duration;
  metric.avgTime = metric.totalTime / metric.count;
}

// 성능 보고서 가져오기
export function getPerformanceReport(): Record<string, any> {
  return Object.entries(performanceMetrics).reduce((report, [operation, metrics]) => {
    report[operation] = {
      count: metrics.count,
      totalTimeMs: metrics.totalTime,
      avgTimeMs: Math.round(metrics.avgTime * 100) / 100
    };
    return report;
  }, {} as Record<string, any>);
}

// 주기적 성능 보고 활성화
export function enablePerformanceReporting(intervalMs: number = 300000): void {
  setInterval(() => {
    if (Object.keys(performanceMetrics).length > 0) {
      logger.info('성능 보고서', getPerformanceReport());
    }
  }, intervalMs);
}

// 요청 로깅 헬퍼
export function logRequest(method: string, path: string, duration: number): void {
  logger.info(`${method} ${path} (${duration}ms)`);
  recordPerformance(`${method} ${path}`, duration);
}

// 특화된 로거 인터페이스 노출
export const secureLogger = {
  error: (message: string, meta?: any) => logger.error(message, maskSensitiveInfo(meta)),
  warn: (message: string, meta?: any) => logger.warn(message, maskSensitiveInfo(meta)),
  info: (message: string, meta?: any) => logger.info(message, maskSensitiveInfo(meta)),
  debug: (message: string, meta?: any) => logger.debug(message, maskSensitiveInfo(meta)),
  request: logRequest,
  timer: logTimer,
  enablePerformanceReporting,
  getPerformanceReport
};

// maskSensitiveInfo 함수를 외부에서도 사용할 수 있도록 export
export { secureLogger as logger };