// 📁 backend/utils/api-key-vault.ts
// API 키 및 민감한 정보 관리를 위한 보안 볼트

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { logger } from './secure-logger';

// ES 모듈에서 __dirname 에뮬레이션
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경변수 로드
dotenv.config();

// 키 생성에 사용될 암호화 솔트
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

// 키 유형 정의
type ApiKeyType = 'anthropic' | 'openai' | 'google' | 'grok' | 'youtube' | string;

// 키 정보 인터페이스
interface ApiKeyInfo {
  id: string;         // 식별자
  type: ApiKeyType;   // 키 유형
  value: string;      // 암호화된 값
  iv: string;         // 암호화 IV
  createdAt: number;  // 생성 시간
  updatedAt: number;  // 업데이트 시간
  expiresAt?: number; // 만료 시간
  label?: string;     // 키 설명
  isActive: boolean;  // 활성 상태
}

// 메모리 캐시 (빠른 접근용)
const keyCache: Map<string, string> = new Map();

// 키 목록 파일 경로 (기본값)
const KEY_FILE_PATH = process.env.API_KEY_FILE || path.join(__dirname, '../../keys/api-keys.json');

/**
 * API 키 볼트 클래스 - API 키의 안전한 저장 및 관리
 */
class ApiKeyVault {
  private keys: ApiKeyInfo[] = [];
  private initialized = false;
  
  // 초기화
  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // 키 파일 디렉토리 확인 및 생성
      const keyDir = path.dirname(KEY_FILE_PATH);
      await fs.mkdir(keyDir, { recursive: true });
      
      // 키 파일 로드 시도
      try {
        const data = await fs.readFile(KEY_FILE_PATH, 'utf8');
        this.keys = JSON.parse(data);
        logger.info(`API 키 볼트 초기화: ${this.keys.length}개 키 로드됨`);
      } catch (err) {
        // 파일이 없으면 빈 배열로 시작
        if ((err as any).code === 'ENOENT') {
          this.keys = [];
          logger.info('API 키 파일이 없습니다. 새 볼트를 초기화합니다.');
          await this.saveKeys();
        } else {
          throw err;
        }
      }
      
      // 환경변수의 키를 메모리에 로드
      this.loadKeysFromEnv();
      
      this.initialized = true;
    } catch (error) {
      logger.error('API 키 볼트 초기화 실패', { error });
      throw error;
    }
  }
  
  // 환경변수에서 키 로드
  private loadKeysFromEnv(): void {
    const keyMappings = {
      'ANTHROPIC_API_KEY': 'anthropic',
      'OPENAI_API_KEY': 'openai',
      'GOOGLE_API_KEY': 'google',
      'GEMINI_API_KEY': 'gemini',
      'GROK_API_KEY': 'grok',
      'YOUTUBE_API_KEY': 'youtube'
    };
    
    for (const [envName, keyType] of Object.entries(keyMappings)) {
      const keyValue = process.env[envName];
      if (keyValue) {
        keyCache.set(keyType, keyValue);
        logger.info(`환경변수에서 ${keyType} API 키를 로드했습니다.`);
      }
    }
  }
  
  // 키 저장
  private async saveKeys(): Promise<void> {
    try {
      await fs.writeFile(KEY_FILE_PATH, JSON.stringify(this.keys, null, 2), 'utf8');
    } catch (error) {
      logger.error('API 키 저장 실패', { error });
      throw error;
    }
  }
  
  // 키 암호화
  private encryptKey(key: string): { value: string, iv: string } {
    // 암호화 키 유도 (PBKDF2 사용이 더 안전하지만 간단한 구현을 위해 해시 사용)
    const derivedKey = createHash('sha256').update(ENCRYPTION_KEY).digest();
    
    // 16바이트 초기화 벡터(IV) 생성
    const iv = randomBytes(16);
    
    // 암호화
    const cipher = createCipheriv('aes-256-cbc', derivedKey, iv);
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      value: encrypted,
      iv: iv.toString('hex')
    };
  }
  
  // 키 복호화
  private decryptKey(encrypted: string, iv: string): string {
    try {
      // 암호화 키 유도
      const derivedKey = createHash('sha256').update(ENCRYPTION_KEY).digest();
      
      // 복호화
      const decipher = createDecipheriv('aes-256-cbc', derivedKey, Buffer.from(iv, 'hex'));
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('키 복호화 실패', { error });
      throw new Error('키 복호화 실패');
    }
  }
  
  /**
   * API 키 추가
   */
  async addKey(type: ApiKeyType, keyValue: string, options: { label?: string, expiresAt?: number } = {}): Promise<string> {
    await this.init();
    
    // 이미 존재하는 같은 유형의 활성 키가 있으면 비활성화
    const existingKeys = this.keys.filter(k => k.type === type && k.isActive);
    if (existingKeys.length > 0) {
      for (const key of existingKeys) {
        key.isActive = false;
        key.updatedAt = Date.now();
      }
    }
    
    // 키 암호화
    const { value, iv } = this.encryptKey(keyValue);
    
    // 새 키 생성
    const id = `${type}-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const newKey: ApiKeyInfo = {
      id,
      type,
      value,
      iv,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true,
      ...options
    };
    
    // 키 추가
    this.keys.push(newKey);
    
    // 메모리 캐시에 저장
    keyCache.set(type, keyValue);
    
    // 파일에 저장
    await this.saveKeys();
    
    logger.info(`새 ${type} API 키가 추가되었습니다 (ID: ${id})`);
    return id;
  }
  
  /**
   * API 키 가져오기
   */
  async getKey(type: ApiKeyType): Promise<string | null> {
    await this.init();
    
    // 메모리 캐시에서 먼저 확인
    if (keyCache.has(type)) {
      return keyCache.get(type) || null;
    }
    
    // 활성 키 찾기
    const key = this.keys.find(k => k.type === type && k.isActive);
    if (!key) {
      return null;
    }
    
    // 만료 시간 확인
    if (key.expiresAt && key.expiresAt < Date.now()) {
      key.isActive = false;
      await this.saveKeys();
      logger.warn(`${type} API 키가 만료되었습니다. (ID: ${key.id})`);
      return null;
    }
    
    // 키 복호화
    const decryptedKey = this.decryptKey(key.value, key.iv);
    
    // 메모리 캐시에 저장
    keyCache.set(type, decryptedKey);
    
    return decryptedKey;
  }
  
  /**
   * API 키 활성화/비활성화
   */
  async setKeyActive(id: string, isActive: boolean): Promise<boolean> {
    await this.init();
    
    const key = this.keys.find(k => k.id === id);
    if (!key) {
      return false;
    }
    
    key.isActive = isActive;
    key.updatedAt = Date.now();
    
    // 메모리 캐시 업데이트
    if (!isActive && keyCache.has(key.type)) {
      keyCache.delete(key.type);
    } else if (isActive) {
      // 활성화된 경우 캐시 비우고 다음 getKey 호출 시 로드되도록 함
      keyCache.delete(key.type);
    }
    
    await this.saveKeys();
    
    logger.info(`API 키 ${id}의 상태가 ${isActive ? '활성화' : '비활성화'}로 변경되었습니다.`);
    return true;
  }
  
  /**
   * API 키 삭제
   */
  async deleteKey(id: string): Promise<boolean> {
    await this.init();
    
    const keyIndex = this.keys.findIndex(k => k.id === id);
    if (keyIndex === -1) {
      return false;
    }
    
    const keyType = this.keys[keyIndex].type;
    
    // 키 삭제
    this.keys.splice(keyIndex, 1);
    
    // 메모리 캐시에서도 삭제
    if (keyCache.has(keyType)) {
      keyCache.delete(keyType);
    }
    
    await this.saveKeys();
    
    logger.info(`API 키 ${id}가 삭제되었습니다.`);
    return true;
  }
  
  /**
   * 모든 키 목록 가져오기 (민감 정보 제외)
   */
  async listKeys(): Promise<Omit<ApiKeyInfo, 'value' | 'iv'>[]> {
    await this.init();
    
    // 민감 정보 제외하고 반환
    return this.keys.map(({ value, iv, ...rest }) => rest);
  }
  
  /**
   * 키 유효성 검증 (외부 API 테스트 호출 수행)
   */
  async validateKey(type: ApiKeyType): Promise<boolean> {
    const key = await this.getKey(type);
    if (!key) {
      return false;
    }
    
    // TODO: 키 유형에 따라 적절한 검증 API 호출 구현
    switch (type) {
      case 'anthropic':
        return await this.validateClaudeKey(key);
      // 다른 API 키 유형에 대한 검증 로직 추가
      default:
        logger.warn(`'${type}' 유형의 키에 대한 검증 로직이 구현되지 않았습니다.`);
        return true; // 검증 로직이 없는 경우 유효한 것으로 간주
    }
  }
  
  /**
   * Claude API 키 유효성 검증
   */
  private async validateClaudeKey(key: string): Promise<boolean> {
    try {
      // Axios 사용
      const axios = await import('axios');
      const response = await axios.default.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'API key validation test' }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          timeout: 10000 // 10초 타임아웃
        }
      );
      
      logger.info('Claude API 키 검증 성공');
      return response.status === 200;
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        logger.error('Claude API 키가 유효하지 않습니다.');
      } else {
        logger.error('Claude API 키 검증 중 오류 발생', { 
          status: error.response?.status, 
          message: error.message 
        });
      }
      return false;
    }
  }
  
  /**
   * 키 값 업데이트
   */
  async updateKeyValue(id: string, newValue: string): Promise<boolean> {
    await this.init();
    
    const key = this.keys.find(k => k.id === id);
    if (!key) {
      return false;
    }
    
    // 키 암호화
    const { value, iv } = this.encryptKey(newValue);
    
    // 키 업데이트
    key.value = value;
    key.iv = iv;
    key.updatedAt = Date.now();
    
    // 메모리 캐시 업데이트
    if (key.isActive) {
      keyCache.set(key.type, newValue);
    }
    
    await this.saveKeys();
    
    logger.info(`API 키 ${id}의 값이 업데이트되었습니다.`);
    return true;
  }
  
  /**
   * 현재 환경변수의 키 값을 볼트에 영구 저장
   */
  async persistEnvKeys(): Promise<void> {
    await this.init();
    
    const keyMappings = {
      'ANTHROPIC_API_KEY': 'anthropic',
      'OPENAI_API_KEY': 'openai',
      'GOOGLE_API_KEY': 'google',
      'GEMINI_API_KEY': 'gemini',
      'GROK_API_KEY': 'grok',
      'YOUTUBE_API_KEY': 'youtube'
    };
    
    for (const [envName, keyType] of Object.entries(keyMappings)) {
      const keyValue = process.env[envName];
      if (keyValue) {
        await this.addKey(keyType as ApiKeyType, keyValue, {
          label: `From .env (${new Date().toISOString()})`
        });
        logger.info(`환경변수 ${envName}의 키가 볼트에 저장되었습니다.`);
      }
    }
  }
}

// 단일 인스턴스 생성
const apiKeyVault = new ApiKeyVault();

// 애플리케이션 시작 시 초기화
apiKeyVault.init().catch(err => {
  logger.error('API 키 볼트 초기화 실패', { error: err });
});

export default apiKeyVault;