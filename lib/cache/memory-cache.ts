import type { CacheInterface, CacheStats } from "./cache-interface"

export class MemoryCache implements CacheInterface {
  private cache = new Map<string, { data: any; expires: number }>()
  private stats = { hits: 0, misses: 0 }

  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const entry = this.cache.get(key)

    if (!entry || Date.now() > entry.expires) {
      this.stats.misses++
      this.cache.delete(key)
      return defaultValue
    }

    this.stats.hits++
    return entry.data
  }

  async set<T>(key: string, value: T, ttl = 300000): Promise<boolean> {
    this.cache.set(key, {
      data: value,
      expires: Date.now() + ttl,
    })
    return true
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key)
  }

  async clear(): Promise<boolean> {
    this.cache.clear()
    return true
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key)
    return entry ? Date.now() <= entry.expires : false
  }

  async getStats(): Promise<CacheStats> {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      type: "memory",
    }
  }
}
