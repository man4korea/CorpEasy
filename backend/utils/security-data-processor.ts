// 📁 backend/utils/security-data-processor.ts
// 민감한 데이터를 안전하게 처리하기 위한 유틸리티

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { logger, maskSensitiveInfo } from './secure-logger';

/**
 * 보안 데이터 처리기 - 민감한 데이터의 안전한 처리를 위한 유틸리티
 */
export class SecurityDataProcessor {
  private encryptionKey: Buffer;
  private hashAlgorithm: string;
  
  /**
   * 생성자
   * @param secretKey 암호화 키 (기본값: 환경변수 또는 난수)
   * @param algorithm 해시 알고리즘 (기본값: sha256)
   */
  constructor(
    secretKey: string = process.env.DATA_ENCRYPTION_KEY || randomBytes(32).toString('hex'),
    algorithm: string = 'sha256'
  ) {
    // 암호화 키 유도 (입력 키의 길이와 관계없이 32바이트 키 생성)
    this.encryptionKey = createHash('sha256').update(secretKey).digest();
    this.hashAlgorithm = algorithm;
    
    logger.debug('보안 데이터 처리기 초기화됨');
  }
  
  /**
   * 데이터 암호화
   * @param data 암호화할 데이터
   * @returns 암호화된 데이터와 IV
   */
  encrypt(data: string): { encryptedData: string; iv: string } {
    // 16바이트 초기화 벡터(IV) 생성
    const iv = randomBytes(16);
    
    // 암호화 객체 생성
    const cipher = createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    // 데이터 암호화
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex')
    };
  }
  
  /**
   * 데이터 복호화
   * @param encryptedData 암호화된 데이터
   * @param iv 초기화 벡터
   * @returns 복호화된 데이터
   */
  decrypt(encryptedData: string, iv: string): string {
    try {
      // 복호화 객체 생성
      const decipher = createDecipheriv('aes-256-cbc', this.encryptionKey, Buffer.from(iv, 'hex'));
      
      // 데이터 복호화
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('데이터 복호화 실패', { error });
      throw new Error('데이터 복호화 실패');
    }
  }
  
  /**
   * 데이터 해싱 (단방향)
   * @param data 해싱할 데이터
   * @param salt 솔트 (기본값: 랜덤 생성)
   * @returns 해시값과 솔트
   */
  hash(data: string, salt: string = randomBytes(16).toString('hex')): { hash: string; salt: string } {
    // 해시 생성 (데이터 + 솔트)
    const hash = createHash(this.hashAlgorithm)
      .update(data + salt)
      .digest('hex');
    
    return { hash, salt };
  }
  
  /**
   * 해시 검증
   * @param data 검증할 데이터
   * @param hash 비교할 해시
   * @param salt 해싱에 사용된 솔트
   * @returns 해시 일치 여부
   */
  verifyHash(data: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hash(data, salt);
    return computedHash === hash;
  }
  
  /**
   * 민감한 데이터 마스킹
   * @param data 마스킹할 데이터
   * @returns 마스킹된 데이터
   */
  maskSensitiveData(data: any): any {
    return maskSensitiveInfo(data);
  }
  
  /**
   * API 키 마스킹
   * @param apiKey API 키
   * @param visibleChars 표시할 문자 수 (앞/뒤)
   * @returns 마스킹된 API 키
   */
  maskApiKey(apiKey: string, visibleChars: number = 4): string {
    if (!apiKey || apiKey.length < visibleChars * 2) {
      return '********';
    }
    
    const firstPart = apiKey.substring(0, visibleChars);
    const lastPart = apiKey.substring(apiKey.length - visibleChars);
    const maskedLength = apiKey.length - (visibleChars * 2);
    const maskedPart = '*'.repeat(Math.min(maskedLength, 8));
    
    return `${firstPart}${maskedPart}${lastPart}`;
  }
  
  /**
   * 안전한 토큰 생성
   * @param length 토큰 길이 (바이트)
   * @returns 16진수 토큰 문자열
   */
  generateToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }
  
  /**
   * 요청 데이터 검사 및 민감 정보 제거
   * @param requestData 요청 데이터
   * @returns 정제된 요청 데이터
   */
  sanitizeRequestData(requestData: any): any {
    if (!requestData) return requestData;
    
    // 객체가 아닌 경우 그대로 반환
    if (typeof requestData !== 'object') return requestData;
    
    // 배열인 경우 각 항목 처리
    if (Array.isArray(requestData)) {
      return requestData.map(item => this.sanitizeRequestData(item));
    }
    
    // 일반 객체 처리
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(requestData)) {
      // 민감한 필드 제외 (제외할 필드 목록)
      const sensitiveFields = ['password', 'secret', 'token', 'api_key', 'apiKey', 'auth'];
      if (sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
        continue;
      }
      
      // 재귀적으로 처리
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeRequestData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * 로그 안전성 검사 - 민감한 정보가 포함되어 있는지 확인
   * @param logMessage 로그 메시지
   * @returns 안전 여부
   */
  isLogSafe(logMessage: string): boolean {
    const sensitivePatterns = [
      /api[-_]?key/i,
      /bearer\s+[a-z0-9_.-]+/i,
      /password/i,
      /secret/i,
      /token/i,
      /authorization:\s*bearer/i,
      /sk-[a-z0-9]{20,}/i,
      /xai-[a-z0-9]{20,}/i
    ];
    
    return !sensitivePatterns.some(pattern => pattern.test(logMessage));
  }
}

// 기본 인스턴스 생성
export const securityProcessor = new SecurityDataProcessor();