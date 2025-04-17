// 📁 backend/utils/circuit-breaker.ts
// Circuit Breaker 패턴 구현 (최적화 버전)

import { logger } from './logger';

/**
 * CircuitBreaker 상태 타입
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * CircuitBreaker 옵션 인터페이스
 */
export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitorInterval?: number;
  maxRetries?: number;
  name?: string;
  onStateChange?: (from: CircuitBreakerState, to: CircuitBreakerState) => void;
}

/**
 * CircuitBreaker 클래스
 * 
 * 반복적인 실패로부터 시스템을 보호하는 Circuit Breaker 패턴 구현
 */
export class CircuitBreaker {
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private state: CircuitBreakerState = 'closed';
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly monitorInterval: number;
  private readonly maxRetries: number;
  private readonly onStateChange?: (from: CircuitBreakerState, to: CircuitBreakerState) => void;
  private monitorTimer?: NodeJS.Timeout;

  /**
   * CircuitBreaker 생성자
   * @param options CircuitBreaker 옵션
   */
  constructor(options: CircuitBreakerOptions | number = 5, resetTimeout: number = 30000) {
    // 이전 버전 호환성을 위한 처리
    if (typeof options === 'number') {
      this.failureThreshold = options;
      this.resetTimeout = resetTimeout;
      this.name = 'default';
      this.monitorInterval = 60000; // 1분
      this.maxRetries = 1;
    } else {
      this.failureThreshold = options.failureThreshold;
      this.resetTimeout = options.resetTimeout;
      this.name = options.name || 'default';
      this.monitorInterval = options.monitorInterval || 60000; // 1분
      this.maxRetries = options.maxRetries || 1;
      this.onStateChange = options.onStateChange;
    }

    // 상태 모니터링 타이머 설정
    this.setupMonitoring();
    
    logger.info(`CircuitBreaker '${this.name}' 초기화: 임계값=${this.failureThreshold}, 재설정 시간=${this.resetTimeout}ms`);
  }

  /**
   * 모니터링 타이머 설정
   */
  private setupMonitoring(): void {
    // 기존 타이머가 있으면 정리
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
    }
    
    // 모니터링 간격이 0보다 크면 상태 모니터링 시작
    if (this.monitorInterval > 0) {
      this.monitorTimer = setInterval(() => this.monitorState(), this.monitorInterval);
    }
  }

  /**
   * 주기적인 상태 모니터링
   */
  private monitorState(): void {
    // 열린 상태이고 재설정 시간이 지났으면 반개 상태로 전환
    if (this.state === 'open' && Date.now() - this.lastFailureTime >= this.resetTimeout) {
      this.transitionTo('half-open');
      logger.info(`CircuitBreaker '${this.name}': 재설정 시간 경과, 반개 상태로 전환`);
    }
  }

  /**
   * 상태 전환
   * @param newState 새 상태
   */
  private transitionTo(newState: CircuitBreakerState): void {
    if (newState !== this.state) {
      const oldState = this.state;
      this.state = newState;
      
      // 상태 변경 시 리셋
      if (newState === 'closed') {
        this.failures = 0;
        this.successes = 0;
      } else if (newState === 'half-open') {
        this.successes = 0;
      }
      
      // 상태 변경 로깅
      logger.info(`CircuitBreaker '${this.name}' 상태 변경: ${oldState} -> ${newState}`);
      
      // 콜백 호출
      if (this.onStateChange) {
        try {
          this.onStateChange(oldState, newState);
        } catch (error) {
          logger.error(`CircuitBreaker '${this.name}' 상태 변경 콜백 오류:`, error);
        }
      }
    }
  }

  /**
   * 실행 함수
   * @param fn 실행할 함수
   * @param retryCount 재시도 횟수
   * @returns 실행 결과
   */
  public async executeWithBreaker<T>(
    fn: () => Promise<T>, 
    retryCount: number = this.maxRetries
  ): Promise<T> {
    // 열린 상태 체크
    if (this.state === 'open') {
      // 재설정 시간이 지나지 않았으면 오류 발생
      if (Date.now() - this.lastFailureTime < this.resetTimeout) {
        throw new Error(`Circuit breaker '${this.name}' is open`);
      }
      
      // 재설정 시간이 지났으면 반개 상태로 전환
      this.transitionTo('half-open');
    }
    
    try {
      // 함수 실행
      const result = await fn();
      
      // 성공 시 처리
      this.handleSuccess();
      
      return result;
    } catch (error) {
      // 실패 시 처리
      this.handleFailure(error);
      
      // 재시도 횟수가 남아있으면 재시도
      if (retryCount > 0) {
        logger.info(`CircuitBreaker '${this.name}': 실패 후 재시도 (남은 횟수: ${retryCount})`);
        
        // 지수 백오프 지연
        const delay = Math.min(1000 * Math.pow(2, this.maxRetries - retryCount), 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.executeWithBreaker(fn, retryCount - 1);
      }
      
      throw error;
    }
  }

  /**
   * 성공 처리
   */
  private handleSuccess(): void {
    // 반개 상태에서는 성공 횟수 증가
    if (this.state === 'half-open') {
      this.successes++;
      
      // 성공 횟수가 임계값에 도달하면 닫힘 상태로 전환
      if (this.successes >= this.failureThreshold) {
        this.transitionTo('closed');
      }
    }
  }

  /**
   * 실패 처리
   */
  private handleFailure(error: any): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    // 실패 로깅
    const stateMsg = this.state === 'half-open' ? '(half-open 상태)' : '';
    logger.warn(`CircuitBreaker '${this.name}' 실패 ${stateMsg}: ${error.message}`);
    
    // 반개 상태에서 실패하면 바로 열림 상태로 전환
    if (this.state === 'half-open') {
      this.transitionTo('open');
      return;
    }
    
    // 닫힘 상태에서 실패 임계값에 도달하면 열림 상태로 전환
    if (this.state === 'closed' && this.failures >= this.failureThreshold) {
      this.transitionTo('open');
    }
  }

  /**
   * 현재 상태 반환
   * @returns 현재 상태
   */
  public getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * 상태 정보 반환
   * @returns 상태 정보 객체
   */
  public getStats(): {
    state: CircuitBreakerState;
    failures: number;
    successes: number;
    lastFailureTime: number | null;
    remainingResetTime: number | null;
  } {
    let remainingResetTime = null;
    
    if (this.state === 'open' && this.lastFailureTime > 0) {
      const elapsed = Date.now() - this.lastFailureTime;
      remainingResetTime = Math.max(0, this.resetTimeout - elapsed);
    }
    
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime || null,
      remainingResetTime
    };
  }

  /**
   * 상태 수동 리셋
   */
  public reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.transitionTo('closed');
    logger.info(`CircuitBreaker '${this.name}' 수동 리셋됨`);
  }

  /**
   * 리소스 정리
   */
  public destroy(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = undefined;
    }
  }
}