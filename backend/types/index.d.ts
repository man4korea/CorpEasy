// 📁 backend/types/index.d.ts

// Express 확장 - 커스텀 프로퍼티 정의
declare namespace Express {
  export interface Request {
    startTime?: number;
  }
}

// use-debounce 타입 정의
declare module 'use-debounce' {
  export function useDebouncedCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number,
    options?: {
      maxWait?: number;
      leading?: boolean;
      trailing?: boolean;
    }
  ): T & { cancel: () => void; flush: () => void };
}

// RequestManager 클래스 타입 정의
interface RequestManagerStatic {
  getNewRequestId(): number;
  registerRequest(id: number, controller: AbortController): void;
  abortPreviousRequests(currentId: number): void;
  removeRequest(id: number): void;
}

// Node.js의 stream/promises 모듈
declare module 'stream/promises' {
  export function pipeline(...args: any[]): Promise<void>;
}

// 스트리밍 API 응답 타입 정의
interface ClaudeStreamResponse {
  type: string;
  index?: number;
  delta?: {
    type: string;
    text: string;
  };
  content_block?: {
    type: string;
    text: string;
  };
  error?: {
    message: string;
    type: string;
  };
}

// 캐시 메트릭 타입 정의
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  lastCleanup: number;
}

// 성능 메트릭 타입 정의
interface PerformanceMetric {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
}

// AI 모델 프로필 타입 정의
interface ModelProfile {
  description: string;
  responseSpeed: 'fast' | 'medium' | 'slow';
  tokenLimit: number;
  costPerInputToken: number;
  costPerOutputToken: number;
}