import type { CacheInterface } from "./cache-interface"
import { MemoryCache } from "./memory-cache"
import { IndexedDBCache } from "./indexed-db-cache"

export class CacheFactory {
  private static instance: CacheInterface | null = null

  static async createBest(): Promise<CacheInterface> {
    if (this.instance) return this.instance

    // Try IndexedDB first (persistent)
    if (typeof window !== "undefined" && "indexedDB" in window) {
      try {
        const cache = new IndexedDBCache()
        await cache.set("test", "test", 1000)
        await cache.delete("test")
        this.instance = cache
        return cache
      } catch {
        // Fall back to memory cache
      }
    }

    // Fallback to memory cache
    this.instance = new MemoryCache()
    return this.instance
  }

  static async create(type: "memory" | "indexeddb"): Promise<CacheInterface> {
    switch (type) {
      case "indexeddb":
        return new IndexedDBCache()
      case "memory":
      default:
        return new MemoryCache()
    }
  }
}
