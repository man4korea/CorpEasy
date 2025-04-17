// 📁 backend/utils/api-errors.ts
// API 오류 처리를 위한 클래스

import { logger } from './logger';

/**
 * API 오류 유형
 */
export type ApiErrorType = 
  | 'validation_error'      // 입력 검증 오류
  | 'authentication_error'  // 인증 오류 
  | 'authorization_error'   // 권한 오류
  | 'not_found'             // 리소스 찾을 수 없음
  | 'timeout'               // 타임아웃
  | 'rate_limit'            // 요청 속도 제한
  | 'service_unavailable'   // 서비스 이용 불가
  | 'external_api_error'    // 외부 API 오류
  | 'configuration_error'   // 설정 오류
  | 'internal_error'        // 내부 서버 오류
  | string;                 // 기타 오류

/**
 * API 오류 정보 인터페이스
 */
export interface ApiErrorInfo {
  message: string;
  type: ApiErrorType;
  status: number;
  details?: any;
  timestamp: string;
}

/**
 * API 오류 클래스
 */
export class ApiError extends Error {
  readonly type: ApiErrorType;
  readonly status: number;
  readonly details?: any;
  readonly timestamp: string;
  
  /**
   * API 오류 생성자
   * @param message 오류 메시지
   * @param type 오류 유형
   * @param status HTTP 상태 코드
   * @param details 추가 상세 정보 (선택)
   */
  constructor(
    message: string,
    type: ApiErrorType = 'internal_error',
    status: number = 500,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.status = status;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // 오류 추적을 위한 스택 트레이스 설정
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
    
    // 심각한 오류는 로깅
    if (status >= 500) {
      logger.error(`API 오류 [${type}]: ${message}`, details || '');
    }
  }
  
  /**
   * 응답 객체로 변환
   */
  toResponse(): ApiErrorInfo {
    return {
      message: this.message,
      type: this.type,
      status: this.status,
      details: this.details,
      timestamp: this.timestamp
    };
  }
  
  /**
   * 사전 정의된 오류 생성 헬퍼 메서드들
   */
  
  // 400 Bad Request
  static badRequest(message: string, details?: any): ApiError {
    return new ApiError(message, 'validation_error', 400, details);
  }
  
  // 401 Unauthorized
  static unauthorized(message: string = '인증이 필요합니다', details?: any): ApiError {
    return new ApiError(message, 'authentication_error', 401, details);
  }
  
  // 403 Forbidden
  static forbidden(message: string = '권한이 없습니다', details?: any): ApiError {
    return new ApiError(message, 'authorization_error', 403, details);
  }
  
  // 404 Not Found
  static notFound(message: string = '리소스를 찾을 수 없습니다', details?: any): ApiError {
    return new ApiError(message, 'not_found', 404, details);
  }
  
  // 408 Request Timeout
  static timeout(message: string = '요청 시간이 초과되었습니다', details?: any): ApiError {
    return new ApiError(message, 'timeout', 408, details);
  }
  
  // 429 Too Many Requests
  static rateLimit(message: string = '요청 한도를 초과했습니다', retryAfter?: number): ApiError {
    return new ApiError(message, 'rate_limit', 429, { retryAfter });
  }
  
  // 502 Bad Gateway
  static externalApiError(message: string = '외부 API 요청 실패', details?: any): ApiError {
    return new ApiError(message, 'external_api_error', 502, details);
  }
  
  // 503 Service Unavailable
  static serviceUnavailable(message: string = '서비스를 일시적으로 이용할 수 없습니다', details?: any): ApiError {
    return new ApiError(message, 'service_unavailable', 503, details);
  }
  
  // 500 Internal Server Error
  static internal(message: string = '내부 서버 오류', details?: any): ApiError {
    return new ApiError(message, 'internal_error', 500, details);
  }
  
  // 커스텀 에러 생성
  static custom(status: number, message: string, details?: any): ApiError {
    return new ApiError(message, 'custom_error', status, details);
  }
}

// 미들웨어 에러 핸들러
export function errorHandler(err: Error, req: any, res: any, next: any) {
  // API 오류 처리
  if (err instanceof ApiError) {
    const errorResponse = err.toResponse();
    return res.status(err.status).json(errorResponse);
  }
  
  // 기타 오류 처리 (일반 Error 객체)
  logger.error('처리되지 않은 오류:', err);
  
  return res.status(500).json({
    message: '서버 오류가 발생했습니다',
    type: 'internal_error',
    status: 500,
    timestamp: new Date().toISOString()
  });
}