import { logger } from './logger';

// 개발 환경 여부 확인
const isDev = process.env.NODE_ENV === 'development';

/**
 * 서버 종료 핸들러 설정
 */
export function setupShutdownHandlers() {
  // 종료 신호 처리
  process.on('SIGTERM', () => {
    logger.info('SIGTERM 수신, 서버 종료 중...');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    logger.info('SIGINT 수신, 서버 종료 중...');
    process.exit(0);
  });
  
  // 처리되지 않은 예외 처리
  process.on('uncaughtException', (err) => {
    logger.error('처리되지 않은 예외:', err);
    if (!isDev) {
      process.exit(1);
    }
  });
  
  // 처리되지 않은 Promise 거부 처리
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('처리되지 않은 Promise 거부:', reason);
  });

  logger.info('서버 종료 핸들러가 설정되었습니다.');
}

/**
 * 서버 초기화 함수
 */
export async function initializeServer() {
  try {
    // 종료 핸들러 설정
    setupShutdownHandlers();

    // 환경 변수 검증
    validateEnvironment();

    logger.info('서버 초기화가 완료되었습니다.');
  } catch (error) {
    logger.error('서버 초기화 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 필수 환경 변수 검증
 */
function validateEnvironment() {
  const requiredEnvVars = [
    'PORT',
    'NODE_ENV',
    'JWT_SECRET',
    'API_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`필수 환경 변수가 누락되었습니다: ${missingVars.join(', ')}`);
  }

  logger.info('환경 변수 검증이 완료되었습니다.');
} 