export type CacheEvictionStrategy = "LRU" | "LFU" | "FIFO" | "TTL"

export interface CacheEntry<T> {
  value: T
  timestamp: number
  accessCount: number
  ttl?: number
}

export interface ICacheService {
  get<T>(key: string): T | null
  set<T>(key: string, value: T, ttl?: number): void
  delete(key: string): boolean
  clear(): void
  size(): number
  getStats(): CacheStats
  setEvictionStrategy(strategy: CacheEvictionStrategy): void
}

export interface CacheStats {
  hits: number
  misses: number
  evictions: number
  size: number
  hitRate: number
}
