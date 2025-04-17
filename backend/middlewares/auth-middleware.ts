// 📁 backend/middlewares/auth-middleware.ts
// 클라이언트-서버 통신을 위한 보안 인증 미들웨어

import { Request, Response, NextFunction, Router } from 'express';
import { createHash, randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { ApiError } from './error-handler';
import { logger } from '../utils/logger';
import apiKeyVault from '../utils/api-key-vault';
import jwt from 'jsonwebtoken';
import { cache } from '../utils/cache-factory';

// 애플리케이션 토큰 관리를 위한 맵
const clientTokens: Map<string, {
  clientId: string;
  issuedAt: number;
  expiresAt: number;
  scope: string[];
}> = new Map();

// 토큰 만료 시간 (기본값: 24시간)
const TOKEN_EXPIRY_MS = parseInt(process.env.TOKEN_EXPIRY_MS || '86400000', 10);

// 서버 API 키 (클라이언트 인증용)
const API_SERVER_SECRET = process.env.API_SERVER_SECRET || randomBytes(32).toString('hex');

// 인증 시도 추적을 위한 맵
const authAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15분

// 시스템 상태 추적
const systemStatus = {
  startTime: Date.now(),
  totalRequests: 0,
  failedAttempts: 0,
  blockedIPs: new Set<string>()
};

// 환경 변수에서 시크릿 키 가져오기
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const API_KEY = process.env.API_KEY || 'your-api-key';

/**
 * 관리자 인증 미들웨어
 */
function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const adminKey = req.headers['x-admin-key'];
  
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    logger.warn(`관리자 인증 실패 시도: ${req.ip}`);
    return next(ApiError.badRequest('관리자 인증 실패'));
  }
  
  next();
}

/**
 * 인증 시도 추적 및 제한
 */
function checkAuthAttempts(ip: string): boolean {
  const now = Date.now();
  const attempts = authAttempts.get(ip);
  systemStatus.totalRequests++;

  // 이전 시도가 없거나 차단 시간이 지난 경우
  if (!attempts || (now - attempts.lastAttempt) > BLOCK_DURATION) {
    authAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  // 최대 시도 횟수 초과
  if (attempts.count >= MAX_ATTEMPTS) {
    systemStatus.blockedIPs.add(ip);
    logger.warn(`인증 시도 제한 초과: ${ip}`);
    return false;
  }

  // 시도 횟수 증가
  attempts.count += 1;
  attempts.lastAttempt = now;
  authAttempts.set(ip, attempts);
  
  if (attempts.count >= MAX_ATTEMPTS) {
    systemStatus.failedAttempts++;
  }
  
  return true;
}

/**
 * 클라이언트 인증 토큰 생성
 */
export function generateClientToken(clientId: string, scope: string[] = ['default']): string {
  // 토큰 내용
  const timestamp = Date.now();
  const expiresAt = timestamp + TOKEN_EXPIRY_MS;
  const tokenId = randomBytes(16).toString('hex');
  
  // HMAC 생성을 위한 페이로드
  const payload = `${clientId}:${tokenId}:${timestamp}:${expiresAt}:${scope.join(',')}`;
  
  // HMAC 서명
  const hmac = createHmac('sha256', API_SERVER_SECRET)
    .update(payload)
    .digest('hex');
  
  // 토큰 구성: tokenId.timestamp.expiresAt.hmac
  const token = `${tokenId}.${timestamp}.${expiresAt}.${hmac}`;
  
  // 토큰 저장
  clientTokens.set(tokenId, {
    clientId,
    issuedAt: timestamp,
    expiresAt,
    scope
  });
  
  // 만료된 토큰 정리
  cleanupExpiredTokens();
  
  logger.info(`클라이언트 토큰 생성: ${clientId}`, { scopes: scope, expiresAt: new Date(expiresAt).toISOString() });
  return token;
}

/**
 * 클라이언트 토큰 검증
 */
function validateClientToken(token: string): { valid: boolean; clientId?: string; scope?: string[] } {
  try {
    // 토큰 파싱
    const [tokenId, timestamp, expiresAt, receivedHmac] = token.split('.');
    
    // 토큰 정보 가져오기
    const tokenInfo = clientTokens.get(tokenId);
    if (!tokenInfo) {
      logger.warn(`존재하지 않는 토큰 ID: ${tokenId}`);
      return { valid: false };
    }
    
    // 만료 시간 확인
    if (parseInt(expiresAt, 10) < Date.now()) {
      logger.warn(`만료된 토큰: ${tokenId}`);
      clientTokens.delete(tokenId); // 만료된 토큰 제거
      return { valid: false };
    }
    
    // HMAC 재계산
    const payload = `${tokenInfo.clientId}:${tokenId}:${timestamp}:${expiresAt}:${tokenInfo.scope.join(',')}`;
    const expectedHmac = createHmac('sha256', API_SERVER_SECRET)
      .update(payload)
      .digest('hex');
    
    // 타이밍 공격 방지를 위해 상수 시간 비교 사용
    const hmacBuffer = Buffer.from(receivedHmac, 'hex');
    const expectedHmacBuffer = Buffer.from(expectedHmac, 'hex');
    
    if (hmacBuffer.length !== expectedHmacBuffer.length) {
      logger.warn(`HMAC 길이 불일치: ${tokenId}`);
      return { valid: false };
    }
    
    const isValid = timingSafeEqual(hmacBuffer, expectedHmacBuffer);
    
    if (!isValid) {
      logger.warn(`유효하지 않은 HMAC: ${tokenId}`);
      return { valid: false };
    }
    
    // 토큰 유효성 확인 성공
    return { 
      valid: true, 
      clientId: tokenInfo.clientId, 
      scope: tokenInfo.scope 
    };
  } catch (error) {
    logger.error('토큰 검증 오류', { error });
    return { valid: false };
  }
}

/**
 * 만료된 토큰 정리
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  let expiredCount = 0;
  
  clientTokens.forEach((tokenInfo, tokenId) => {
    if (tokenInfo.expiresAt < now) {
      clientTokens.delete(tokenId);
      expiredCount++;
    }
  });
  
  if (expiredCount > 0) {
    logger.debug(`만료된 토큰 ${expiredCount}개 제거됨`);
  }
}

/**
 * API 키 유형 결정 함수
 */
function determineApiKeyType(path: string): string | null {
  // 경로 기반으로 API 키 유형 결정
  if (path.startsWith('/api/claude')) {
    return 'anthropic';
  } else if (path.startsWith('/api/gpt') || path.startsWith('/api/openai')) {
    return 'openai';
  } else if (path.startsWith('/api/gemini')) {
    return 'google';
  } else if (path.startsWith('/api/grok')) {
    return 'grok';
  } else if (path.startsWith('/api/youtube')) {
    return 'youtube';
  }
  
  return null;
}

/**
 * API 키 검증 미들웨어
 */
export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;

  // 개발 환경에서는 검증 스킵
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  
  // 인증 시도 제한 확인
  if (!checkAuthAttempts(ip)) {
    return next(ApiError.badRequest('너무 많은 인증 시도. 잠시 후 다시 시도해주세요.'));
  }

  if (!apiKey || apiKey !== API_KEY) {
    logger.warn(`잘못된 API 키 시도: ${ip}`);
    return next(ApiError.badRequest('유효하지 않은 API 키'));
  }
  
  // 성공한 경우 시도 횟수 초기화
  authAttempts.delete(ip);
  next();
};

/**
 * 클라이언트 인증 미들웨어
 */
export const clientAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: '인증 토큰이 없습니다.' });
    }

    // 토큰 검증
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // 캐시에서 토큰 블랙리스트 확인
    const isBlacklisted = await cache.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: '만료된 토큰입니다.' });
    }

    next();
  } catch (error) {
    logger.error('인증 오류:', error);
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

/**
 * API 경로에 따른 인증 미들웨어 적용
 */
export function setupApiAuth(app: any) {
  // Claude API 경로 보호
  app.use('/api/claude', apiKeyMiddleware);
  
  // GPT API 경로 보호
  app.use('/api/gpt', apiKeyMiddleware);
  
  // Gemini API 경로 보호
  app.use('/api/gemini', apiKeyMiddleware);
  
  // 클라이언트 인증이 필요한 경로 보호
  app.use('/api/client', clientAuthMiddleware);
}

/**
 * 인증 라우트 설정
 */
export function setupAuthRoutes(router: Router) {
  // API 인증 미들웨어 설정
  setupApiAuth(router);
  
  // 로그인
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      // TODO: 실제 사용자 인증 로직 구현
      if (username === 'admin' && password === 'password') {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ token });
      }

      res.status(401).json({ error: '잘못된 인증 정보입니다.' });
    } catch (error) {
      logger.error('로그인 오류:', error);
      res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
    }
  });

  // 로그아웃
  router.post('/logout', clientAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        // 토큰을 블랙리스트에 추가 (1시간 동안)
        await cache.set(`blacklist:${token}`, true, 3600);
      }
      res.json({ message: '로그아웃되었습니다.' });
    } catch (error) {
      logger.error('로그아웃 오류:', error);
      res.status(500).json({ error: '로그아웃 처리 중 오류가 발생했습니다.' });
    }
  });

  // 토큰 검증
  router.get('/verify', clientAuthMiddleware, (req: Request, res: Response) => {
    res.json({ valid: true, user: req.user });
  });

  // 테스트용 인증 상태 확인 엔드포인트
  router.get('/auth/status', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      message: '인증 시스템 정상 작동 중',
      timestamp: new Date().toISOString()
    });
  });
  
  // API 키가 필요한 테스트 엔드포인트
  router.get('/auth/test/apikey', apiKeyMiddleware, (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      message: 'API 키 인증 성공',
      timestamp: new Date().toISOString()
    });
  });

  // 클라이언트 인증이 필요한 테스트 엔드포인트
  router.get('/auth/test/client', clientAuthMiddleware, (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      message: '클라이언트 인증 성공',
      timestamp: new Date().toISOString()
    });
  });

  // 복합 인증이 필요한 테스트 엔드포인트
  router.get('/auth/test/all', [apiKeyMiddleware, clientAuthMiddleware], (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      message: '모든 인증 성공',
      timestamp: new Date().toISOString()
    });
  });

  // 관리자용 시스템 상태 모니터링
  router.get('/auth/admin/status', adminAuthMiddleware, (req: Request, res: Response) => {
    const now = Date.now();
    const uptimeHours = ((now - systemStatus.startTime) / (1000 * 60 * 60)).toFixed(2);
    
    res.json({
      status: 'ok',
      uptime: `${uptimeHours} hours`,
      stats: {
        totalRequests: systemStatus.totalRequests,
        failedAttempts: systemStatus.failedAttempts,
        activeBlocks: systemStatus.blockedIPs.size,
        currentAttempts: authAttempts.size
      },
      timestamp: new Date().toISOString()
    });
  });

  // 차단된 IP 목록 조회
  router.get('/auth/admin/blocked', adminAuthMiddleware, (req: Request, res: Response) => {
    const blockedList = Array.from(systemStatus.blockedIPs).map(ip => ({
      ip,
      attempts: authAttempts.get(ip)?.count || 0,
      lastAttempt: new Date(authAttempts.get(ip)?.lastAttempt || 0).toISOString()
    }));
    
    res.json({
      total: blockedList.length,
      blocked: blockedList
    });
  });

  // 특정 IP 차단 해제
  router.post('/auth/admin/unblock', adminAuthMiddleware, (req: Request, res: Response) => {
    const { ip } = req.body;
    
    if (!ip) {
      return next(ApiError.badRequest('IP 주소가 필요합니다'));
    }
    
    authAttempts.delete(ip);
    systemStatus.blockedIPs.delete(ip);
    
    logger.info(`관리자가 IP 차단 해제: ${ip}`);
    res.json({
      status: 'ok',
      message: `${ip} 차단 해제됨`,
      timestamp: new Date().toISOString()
    });
  });

  // 시스템 상태 초기화
  router.post('/auth/admin/reset', adminAuthMiddleware, (req: Request, res: Response) => {
    authAttempts.clear();
    systemStatus.blockedIPs.clear();
    systemStatus.failedAttempts = 0;
    systemStatus.totalRequests = 0;
    
    logger.info('관리자가 인증 시스템 상태 초기화');
    res.json({
      status: 'ok',
      message: '시스템 상태가 초기화되었습니다',
      timestamp: new Date().toISOString()
    });
  });

  // 주기적으로 오래된 인증 시도 기록 정리
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of authAttempts.entries()) {
      if (now - data.lastAttempt > BLOCK_DURATION) {
        authAttempts.delete(ip);
        systemStatus.blockedIPs.delete(ip);
      }
    }
  }, BLOCK_DURATION);
}

// Request 인터페이스 확장 (TypeScript용)
declare global {
  namespace Express {
    interface Request {
      clientId?: string;
      scope?: string[];
      apiKey?: string;
      apiKeyType?: string;
      user?: any;
    }
  }
}