// 📁 backend/utils/parallel-processor.ts
import { logger } from './logger';
import { callClaude } from '../services/claude';

/**
 * 병렬 처리를 위한 타입 정의
 */
export type ParallelProcessor<T, R> = (items: T[]) => Promise<R[]>;

/**
 * 병렬 처리를 수행하는 함수
 * @param items 처리할 항목 배열
 * @param processor 각 항목을 처리하는 함수
 * @param maxConcurrent 최대 동시 처리 수 (기본값: 5)
 * @returns 처리된 결과 배열
 */
export async function processInParallel<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  maxConcurrent: number = 5
): Promise<R[]> {
  const results: R[] = [];
  const chunks: T[][] = [];
  
  // 항목을 청크로 분할
  for (let i = 0; i < items.length; i += maxConcurrent) {
    chunks.push(items.slice(i, i + maxConcurrent));
  }
  
  // 각 청크를 병렬로 처리
  for (const chunk of chunks) {
    const chunkPromises = chunk.map(item => processor(item));
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
    
    logger.info(`✅ 청크 처리 완료: ${chunkResults.length}개 항목`);
  }
  
  return results;
}

/**
 * 병렬 처리 상태를 추적하는 클래스
 */
export class ParallelProcessorState<T> {
  private processed: number = 0;
  private total: number;
  private errors: Error[] = [];
  
  constructor(total: number) {
    this.total = total;
  }
  
  incrementProcessed() {
    this.processed++;
  }
  
  addError(error: Error) {
    this.errors.push(error);
  }
  
  getProgress(): number {
    return (this.processed / this.total) * 100;
  }
  
  getErrors(): Error[] {
    return this.errors;
  }
  
  isComplete(): boolean {
    return this.processed === this.total;
  }
}

/**
 * 여러 작업을 병렬로 처리하기 위한 유틸리티 클래스
 */
export class ParallelProcessor {
  /**
   * 여러 작업을 병렬로 처리하는 함수
   * @param items 처리할 항목 배열
   * @param processFn 각 항목을 처리하는 함수
   * @param options 병렬 처리 옵션
   * @returns 처리 결과 배열
   */
  static async processInParallel<T>(
    items: any[],
    processFn: (item: any, index: number) => Promise<T>,
    options: {
      concurrency?: number;  // 동시 실행 개수
      abortOnError?: boolean;  // 오류 발생 시 모든 작업 중단
      progressCallback?: (completed: number, total: number) => void; // 진행 상황 콜백
    } = {}
  ): Promise<T[]> {
    const { 
      concurrency = 5, 
      abortOnError = false,
      progressCallback
    } = options;
    
    // 빈 배열이면 바로 반환
    if (items.length === 0) {
      return [];
    }
    
    logger.info(`병렬 처리 시작: ${items.length}개 항목, 동시성: ${concurrency}`);
    const startTime = Date.now();
    
    // 결과 배열 초기화
    const results: T[] = new Array(items.length);
    
    // 작업 큐
    const queue = items.map((item, index) => ({ item, index }));
    let completedCount = 0;
    
    // 작업 처리기
    const workers = Array(Math.min(concurrency, items.length))
      .fill(null)
      .map(async (_, workerId) => {
        logger.debug(`워커 ${workerId} 시작`);
        
        while (queue.length > 0) {
          const { item, index } = queue.shift()!;
          
          try {
            logger.debug(`워커 ${workerId}: 항목 ${index} 처리 중`);
            const itemStartTime = Date.now();
            
            results[index] = await processFn(item, index);
            
            const itemDuration = Date.now() - itemStartTime;
            logger.debug(`워커 ${workerId}: 항목 ${index} 완료 (${itemDuration}ms)`);
            
            completedCount++;
            if (progressCallback) {
              progressCallback(completedCount, items.length);
            }
          } catch (error: any) {
            logger.error(`워커 ${workerId}: 항목 ${index} 처리 오류: ${error.message}`);
            
            if (abortOnError) {
              logger.warn('오류로 인해 모든 작업 중단');
              queue.length = 0;  // 큐 비우기
              throw error;
            }
            
            // 오류는 결과에 포함 (오류 객체를 저장)
            results[index] = error as any;
            
            completedCount++;
            if (progressCallback) {
              progressCallback(completedCount, items.length);
            }
          }
        }
        
        logger.debug(`워커 ${workerId} 종료`);
      });
    
    // 모든 작업자 완료 대기
    await Promise.all(workers);
    
    const totalDuration = Date.now() - startTime;
    logger.info(`병렬 처리 완료: ${items.length}개 항목, 총 소요시간: ${totalDuration}ms`);
    
    return results;
  }
  
  /**
   * 여러 텍스트에 대해 Claude API 호출을 병렬로 처리
   * @param texts 처리할 텍스트 배열
   * @param promptTemplate 프롬프트 템플릿 함수
   * @param options 처리 옵션
   * @returns Claude 응답 배열
   */
  static async processBatchWithClaude(
    texts: string[],
    promptTemplate: (text: string) => string,
    options: {
      model?: string;
      concurrency?: number;
      maxTokens?: number;
      progressCallback?: (completed: number, total: number) => void;
    } = {}
  ): Promise<string[]> {
    const { 
      model = 'claude-3-haiku-20240307', 
      concurrency = 3, 
      maxTokens = 1000,
      progressCallback
    } = options;
    
    logger.info(`Claude 배치 처리 시작: ${texts.length}개 텍스트, 모델: ${model}`);
    
    return this.processInParallel(
      texts,
      async (text, index) => {
        const prompt = promptTemplate(text);
        
        return callClaude(
          [{ role: 'user', content: prompt }],
          { model, max_tokens: maxTokens }
        );
      },
      { 
        concurrency,
        progressCallback
      }
    );
  }
  
  /**
   * 여러 데이터 항목에 대해 처리 작업을 맵 형태로 병렬 수행
   * @param dataMap 키-값 쌍으로 구성된 데이터 맵
   * @param processFn 각 데이터 항목을 처리하는 함수
   * @param options 병렬 처리 옵션
   * @returns 처리 결과 맵
   */
  static async processMapInParallel<K extends string | number | symbol, V, R>(
    dataMap: Record<K, V>,
    processFn: (value: V, key: K) => Promise<R>,
    options: {
      concurrency?: number;
      abortOnError?: boolean;
    } = {}
  ): Promise<Record<K, R>> {
    const keys = Object.keys(dataMap) as K[];
    const values = Object.values(dataMap) as V[];
    
    const results = await this.processInParallel(
      values,
      async (value, index) => {
        const key = keys[index];
        return processFn(value, key);
      },
      options
    );
    
    // 결과를 다시 맵으로 변환
    return keys.reduce((resultMap, key, index) => {
      resultMap[key] = results[index];
      return resultMap;
    }, {} as Record<K, R>);
  }
  
  /**
   * 작업을 시간 제한과 함께 실행
   * @param promise 실행할 Promise
   * @param timeoutMs 제한 시간 (밀리초)
   * @param timeoutMessage 타임아웃 시 오류 메시지
   * @returns Promise 결과
   */
  static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = '작업 시간 초과'
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    });
    
    try {
      // Promise.race로 먼저 완료되는 Promise 반환
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId!);
    }
  }
}

/**
 * 사용 예시:
 * 
 * // 1. 여러 텍스트 요약하기
 * const texts = ["긴 텍스트 1", "긴 텍스트 2", "긴 텍스트 3"];
 * const summaries = await ParallelProcessor.processBatchWithClaude(
 *   texts,
 *   (text) => `다음 텍스트를 한 문장으로 요약해주세요: ${text}`,
 *   {
 *     model: 'claude-3-haiku-20240307',
 *     concurrency: 3,
 *     progressCallback: (completed, total) => {
 *       console.log(`진행 상황: ${completed}/${total}`);
 *     }
 *   }
 * );
 * 
 * // 2. 여러 API 호출 병렬 처리
 * const urls = ["https://api.example.com/1", "https://api.example.com/2"];
 * const responses = await ParallelProcessor.processInParallel(
 *   urls,
 *   async (url) => {
 *     const response = await fetch(url);
 *     return response.json();
 *   },
 *   { concurrency: 2 }
 * );
 */