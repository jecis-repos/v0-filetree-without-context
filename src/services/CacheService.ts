import type { ICacheService, CacheEntry, CacheEvictionStrategy, CacheStats } from "../interfaces/ICacheService"

export class CacheService implements ICacheService {
  private cache = new Map<string, CacheEntry<any>>()
  private accessOrder: string[] = []
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    hitRate: 0,
  }

  constructor(
    private maxSize = 1000,
    private defaultTtl = 300000, // 5 minutes
    private evictionStrategy: CacheEvictionStrategy = "LRU",
  ) {}

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    // Check TTL
    if (entry.ttl && Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    // Update access patterns
    entry.accessCount++
    this.updateAccessOrder(key)

    this.stats.hits++
    this.updateHitRate()
    return entry.value
  }

  set<T>(key: string, value: T, ttl?: number): void {
    // Check if we need to evict
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict()
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      ttl: ttl || this.defaultTtl,
    }

    this.cache.set(key, entry)
    this.updateAccessOrder(key)
    this.stats.size = this.cache.size
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.removeFromAccessOrder(key)
      this.stats.size = this.cache.size
    }
    return deleted
  }

  clear(): void {
    this.cache.clear()
    this.accessOrder = []
    this.stats.size = 0
  }

  size(): number {
    return this.cache.size
  }

  getStats(): CacheStats {
    return { ...this.stats }
  }

  setEvictionStrategy(strategy: CacheEvictionStrategy): void {
    this.evictionStrategy = strategy
  }

  private evict(): void {
    let keyToEvict: string | undefined

    switch (this.evictionStrategy) {
      case "LRU":
        keyToEvict = this.accessOrder[0]
        break
      case "LFU":
        keyToEvict = this.findLeastFrequentlyUsed()
        break
      case "FIFO":
        keyToEvict = this.accessOrder[0]
        break
      case "TTL":
        keyToEvict = this.findExpiredOrOldest()
        break
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict)
      this.removeFromAccessOrder(keyToEvict)
      this.stats.evictions++
      this.stats.size = this.cache.size
    }
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key)
    this.accessOrder.push(key)
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  private findLeastFrequentlyUsed(): string | undefined {
    let minCount = Number.POSITIVE_INFINITY
    let leastUsedKey: string | undefined

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < minCount) {
        minCount = entry.accessCount
        leastUsedKey = key
      }
    }

    return leastUsedKey
  }

  private findExpiredOrOldest(): string | undefined {
    const now = Date.now()
    let oldestKey: string | undefined
    let oldestTime = Number.POSITIVE_INFINITY

    for (const [key, entry] of this.cache) {
      // Check if expired
      if (entry.ttl && now > entry.timestamp + entry.ttl) {
        return key
      }

      // Track oldest
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }
}
