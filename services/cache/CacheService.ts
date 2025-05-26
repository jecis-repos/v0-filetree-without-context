import type { ICacheService, CacheStats, EvictionStrategy } from "../../types/interfaces"

interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl?: number
  accessCount: number
  lastAccessed: number
}

export class CacheService implements ICacheService {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize: number
  private stats: CacheStats
  private evictionStrategy: EvictionStrategy

  constructor(maxSize = 1000, evictionStrategy: EvictionStrategy = "LRU") {
    this.maxSize = maxSize
    this.evictionStrategy = evictionStrategy
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      maxSize,
      evictions: 0,
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      this.stats.size--
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.stats.hits++

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
      ttl,
      accessCount: 1,
      lastAccessed: Date.now(),
    }

    const isNew = !this.cache.has(key)
    this.cache.set(key, entry)

    if (isNew) {
      this.stats.size++
    }
  }

  delete(key: string): void {
    if (this.cache.delete(key)) {
      this.stats.size--
    }
  }

  clear(): void {
    this.cache.clear()
    this.stats.size = 0
    this.stats.hits = 0
    this.stats.misses = 0
    this.stats.evictions = 0
  }

  getStats(): CacheStats {
    return { ...this.stats }
  }

  setEvictionStrategy(strategy: EvictionStrategy): void {
    this.evictionStrategy = strategy
  }

  private evict(): void {
    if (this.cache.size === 0) return

    let keyToEvict: string

    switch (this.evictionStrategy) {
      case "LRU":
        keyToEvict = this.findLRUKey()
        break
      case "LFU":
        keyToEvict = this.findLFUKey()
        break
      case "FIFO":
        keyToEvict = this.findFIFOKey()
        break
      case "TTL":
        keyToEvict = this.findExpiredKey() || this.findLRUKey()
        break
      default:
        keyToEvict = this.findLRUKey()
    }

    this.cache.delete(keyToEvict)
    this.stats.size--
    this.stats.evictions++
  }

  private findLRUKey(): string {
    let oldestKey = ""
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    return oldestKey
  }

  private findLFUKey(): string {
    let leastUsedKey = ""
    let leastCount = Number.POSITIVE_INFINITY

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount
        leastUsedKey = key
      }
    }

    return leastUsedKey
  }

  private findFIFOKey(): string {
    let oldestKey = ""
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }

  private findExpiredKey(): string | null {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        return key
      }
    }
    return null
  }
}
