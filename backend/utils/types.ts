export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  avgAccessTime: number;
  lastCleanup: Date;
  adaptiveTTLCount: number;
}

export interface CacheMetrics {
  accessCount: number;
  lastAccessed: Date;
  hitCount: number;
  missCount: number;
  avgResponseTime: number;
}

export interface CacheItem<T> {
  value: T;
  expiry: number;
  metadata: CacheMetrics;
  tags: string[];
  priority: 'high' | 'normal' | 'low';
} 