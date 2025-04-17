// 📁 backend/utils/hash.ts
import crypto from 'crypto';

/**
 * 프롬프트, 모델, 옵션 값을 조합해 고유한 캐시 키를 생성
 * @param model - AI 모델 이름 (예: 'gpt35', 'claude')
 * @param prompt - 사용자 입력 문자열
 * @param options - 추가 옵션 (예: max_tokens, temperature 등)
 * @returns 해시 문자열
 */
export function createHashKey(model: string, prompt: string, options: any = {}): string {
  const raw = JSON.stringify({ model, prompt, options });
  return crypto.createHash('md5').update(raw).digest('hex');
}
