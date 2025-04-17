// 📁 backend/middlewares/error-handler.ts
// 공통 오류 처리 미들웨어

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger';

// Request 인터페이스 확장 (startTime 추가)
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      requestId?: string;
    }
  }
}

// 비동기 라우트 핸들러를 위한 래퍼 함수
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 개발 환경 여부 확인 함수
function isDev(): boolean {
  return process.env.NODE_ENV !== 'production';
}

// 사용자 정의 오류 클래스
export class ApiError extends Error {
  statusCode: number;
  details?: any;
  code?: string;
  
  constructor(message: string, statusCode: number, details?: any, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
  }
  
  static badRequest(message: string, details?: any): ApiError {
    return new ApiError(message, 400, details, 'BAD_REQUEST');
  }
  
  static unauthorized(message: string = '인증이 필요합니다'): ApiError {
    return new ApiError(message, 401, undefined, 'UNAUTHORIZED');
  }
  
  static forbidden(message: string = '접근이 거부되었습니다'): ApiError {
    return new ApiError(message, 403, undefined, 'FORBIDDEN');
  }
  
  static notFound(message: string = '리소스를 찾을 수 없습니다'): ApiError {
    return new ApiError(message, 404, undefined, 'NOT_FOUND');
  }
  
  static timeout(message: string = '요청 시간이 초과되었습니다'): ApiError {
    return new ApiError(message, 408, undefined, 'REQUEST_TIMEOUT');
  }
  
  static internalError(message: string = '서버 내부 오류'): ApiError {
    return new ApiError(message, 500, undefined, 'INTERNAL_ERROR');
  }
  
  // Anthropic API 관련 오류를 위한 정적 메서드 추가
  static apiClientError(message: string, details?: any): ApiError {
    return new ApiError(message, 400, details, 'API_CLIENT_ERROR');
  }
  
  static apiRateLimitError(message: string = 'API 요청 한도 초과'): ApiError {
    return new ApiError(message, 429, undefined, 'RATE_LIMIT_EXCEEDED');
  }
}

// 404 Not Found 핸들러
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(ApiError.notFound(`${req.method} ${req.path} 경로를 찾을 수 없습니다`));
};

// 오류 로깅 미들웨어
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: isDev() ? err.stack : undefined,
    path: req.path,
    method: req.method,
    requestId: req.requestId
  });
  next(err);
};

// API 오류 상세 매핑
function mapApiErrorDetails(err: any): { message: string, details?: any } {
  // Anthropic API 오류 메시지 개선
  if (err.response && err.response.data && err.response.data.error) {
    const apiError = err.response.data.error;
    
    // 필드 관련 오류 메시지 향상
    if (apiError.message && apiError.message.includes('max_tokens')) {
      return {
        message: '요청에 필수 필드 누락: max_tokens',
        details: {
          field: 'max_tokens',
          solution: '요청 객체에 max_tokens 필드를 추가하세요 (예: max_tokens: 1024)'
        }
      };
    }
    
    // 응답 확인 확장 (필요에 따라 추가)
    // ...
    
    return {
      message: apiError.message || '알 수 없는 API 오류',
      details: apiError
    };
  }
  
  return { message: err.message };
}

// 오류 응답 핸들러
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // 이미 응답이 전송된 경우
  if (res.headersSent) {
    return next(err);
  }
  
  // API 오류 처리
  if (err instanceof ApiError) {
    const { statusCode, message, code, details } = err;
    return res.status(statusCode).json({
      error: code || 'API_ERROR',
      message,
      statusCode,
      details: isDev() ? details : undefined
    });
  }
  
  // JSON 파싱 오류 처리
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'INVALID_JSON',
      message: '잘못된 JSON 형식입니다',
      statusCode: 400
    });
  }
  
  // Axios 오류 처리 (API 요청 문제)
  if (err.isAxiosError) {
    const { message, details } = mapApiErrorDetails(err);
    
    if (err.code === 'ECONNABORTED') {
      return res.status(408).json({
        error: 'REQUEST_TIMEOUT',
        message: '외부 API 요청 시간이 초과되었습니다',
        statusCode: 408
      });
    }
    
    const statusCode = err.response?.status || 500;
    return res.status(statusCode).json({
      error: 'EXTERNAL_API_ERROR',
      message,
      statusCode,
      details: isDev() ? details : undefined
    });
  }
  
  // 기타 모든 오류는 500 Internal Server Error로 처리
  logger.error('Unhandled error:', err);
  return res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: isDev() ? err.message : '서버 내부 오류가 발생했습니다',
    statusCode: 500,
    stack: isDev() ? err.stack : undefined
  });
};

// Express 앱에 오류 처리 미들웨어 등록 함수
export function setupErrorHandling(app: any) {
  // SPA 지원을 위한 HTML5 History API 폴백
  if (process.env.SERVE_STATIC === 'true') {
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.accepts('html')) {
        res.sendFile('index.html', { root: './public' });
      } else {
        next();
      }
    });
  }
  
  // 404 핸들러는 다른 모든 라우트 후에 등록
  app.use(notFoundHandler);
  
  // 오류 로깅 미들웨어
  app.use(errorLogger);
  
  // 오류 응답 핸들러
  app.use(errorHandler);
}