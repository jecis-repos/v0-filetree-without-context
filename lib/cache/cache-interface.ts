export interface CacheInterface {
  get<T>(key: string, defaultValue?: T): Promise<T | undefined>
  set<T>(key: string, value: T, ttl?: number): Promise<boolean>
  delete(key: string): Promise<boolean>
  clear(): Promise<boolean>
  has(key: string): Promise<boolean>
  getStats(): Promise<CacheStats>
}

export interface CacheStats {
  hits: number
  misses: number
  size: number
  type: string
}
