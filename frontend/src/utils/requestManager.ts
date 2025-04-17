// 📁 frontend/src/utils/requestManager.ts
export class AiRequestManager {
  private pendingRequests: Map<string, { promise: Promise<any>, controller: AbortController }> = new Map();
  private cache: Map<string, { data: any, timestamp: number }> = new Map();
  private cacheTTL = 30 * 60 * 1000; // 30분 캐시
  
  constructor(options: { cacheTTL?: number } = {}) {
    if (options.cacheTTL) {
      this.cacheTTL = options.cacheTTL;
    }
    
    // 주기적으로 만료된 캐시 정리
    setInterval(() => this.cleanExpiredCache(), 5 * 60 * 1000);
  }
  
  async request<T>(endpoint: string, payload: any, options: {
    forceRefresh?: boolean,
    abortSignal?: AbortSignal,
    timeout?: number
  } = {}): Promise<T> {
    const { forceRefresh = false, timeout = 30000 } = options;
    
    // 요청 식별자 생성
    const requestId = this.createRequestId(endpoint, payload);
    
    // 캐시 확인 (강제 갱신이 아닌 경우)
    if (!forceRefresh) {
      const cachedData = this.getFromCache<T>(requestId);
      if (cachedData) return cachedData;
    }
    
    // 이미 진행 중인 동일 요청이 있는지 확인
    if (this.pendingRequests.has(requestId)) {
      console.log(`🔄 기존 요청 재사용: ${requestId}`);
      return this.pendingRequests.get(requestId)!.promise as Promise<T>;
    }
    
    // AbortController 설정
    const controller = new AbortController();
    
    // 부모 AbortSignal이 있으면 연결
    if (options.abortSignal) {
      options.abortSignal.addEventListener('abort', () => controller.abort());
    }
    
    // 타임아웃 설정
    const timeoutId = setTimeout(() => {
      controller.abort(new Error('요청 시간 초과'));
    }, timeout);
    
    // 새 요청 생성
    const fetchPromise = fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
      .then(async res => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `API 오류: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        // 결과 캐싱
        this.setToCache(requestId, data);
        return data;
      })
      .finally(() => {
        // 타임아웃 제거 및 완료된 요청 제거
        clearTimeout(timeoutId);
        this.pendingRequests.delete(requestId);
      });
    
    // 진행 중인 요청 맵에 저장
    this.pendingRequests.set(requestId, { 
      promise: fetchPromise,
      controller
    });
    
    return fetchPromise as Promise<T>;
  }
  
  // 모든 진행 중인 요청 취소
  abortAll(): void {
    this.pendingRequests.forEach(({ controller }) => {
      controller.abort();
    });
    this.pendingRequests.clear();
  }
  
  // 특정 엔드포인트 요청 취소
  abortEndpoint(endpoint: string): void {
    this.pendingRequests.forEach((request, key) => {
      if (key.startsWith(endpoint)) {
        request.controller.abort();
        this.pendingRequests.delete(key);
      }
    });
  }
  
  // 캐시 관리 메서드들
  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // 만료 확인
    if (Date.now() - item.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`🎯 캐시 히트: ${key}`);
    return item.data as T;
  }
  
  private setToCache(key: string, data: any): void {
    this.cache.set(key, { 
      data, 
      timestamp: Date.now() 
    });
    
    // 캐시 크기 제한 (최대 100개)
    if (this.cache.size > 100) {
      // 가장 오래된 항목 제거
      const oldestKey = [...this.cache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
  }
  
  private cleanExpiredCache(): void {
    const now = Date.now();
    
    this.cache.forEach((item, key) => {
      if (now - item.timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    });
  }
  
  private createRequestId(endpoint: string, payload: any): string {
    // 간단한 해시 생성
    const payloadStr = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);
    
    return `${endpoint}:${this.hashString(payloadStr)}`;
  }
  
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    return hash.toString(36);
  }
}

// 싱글톤 인스턴스
export const aiRequestManager = new AiRequestManager();