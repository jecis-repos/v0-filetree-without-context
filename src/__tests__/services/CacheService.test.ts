import { CacheService } from "../../services/CacheService"

describe("CacheService", () => {
  let cacheService: CacheService

  beforeEach(() => {
    cacheService = new CacheService(3, 1000) // Small cache for testing
  })

  afterEach(() => {
    cacheService.clear()
  })

  describe("Basic Operations", () => {
    test("should store and retrieve values", () => {
      cacheService.set("key1", "value1")
      expect(cacheService.get("key1")).toBe("value1")
    })

    test("should return null for non-existent keys", () => {
      expect(cacheService.get("nonexistent")).toBeNull()
    })

    test("should delete values", () => {
      cacheService.set("key1", "value1")
      expect(cacheService.delete("key1")).toBe(true)
      expect(cacheService.get("key1")).toBeNull()
    })

    test("should return false when deleting non-existent key", () => {
      expect(cacheService.delete("nonexistent")).toBe(false)
    })

    test("should clear all values", () => {
      cacheService.set("key1", "value1")
      cacheService.set("key2", "value2")
      cacheService.clear()
      expect(cacheService.size()).toBe(0)
    })
  })

  describe("TTL (Time To Live)", () => {
    test("should expire values after TTL", async () => {
      cacheService.set("key1", "value1", 50) // 50ms TTL
      expect(cacheService.get("key1")).toBe("value1")

      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(cacheService.get("key1")).toBeNull()
    })

    test("should use default TTL when not specified", () => {
      const shortTtlCache = new CacheService(10, 50) // 50ms default TTL
      shortTtlCache.set("key1", "value1")

      setTimeout(() => {
        expect(shortTtlCache.get("key1")).toBeNull()
      }, 60)
    })
  })

  describe("Eviction Strategies", () => {
    test("should evict LRU item when cache is full", () => {
      cacheService.setEvictionStrategy("LRU")

      cacheService.set("key1", "value1")
      cacheService.set("key2", "value2")
      cacheService.set("key3", "value3")

      // Access key1 to make it recently used
      cacheService.get("key1")

      // Add key4, should evict key2 (least recently used)
      cacheService.set("key4", "value4")

      expect(cacheService.get("key1")).toBe("value1")
      expect(cacheService.get("key2")).toBeNull()
      expect(cacheService.get("key3")).toBe("value3")
      expect(cacheService.get("key4")).toBe("value4")
    })

    test("should evict LFU item when cache is full", () => {
      cacheService.setEvictionStrategy("LFU")

      cacheService.set("key1", "value1")
      cacheService.set("key2", "value2")
      cacheService.set("key3", "value3")

      // Access key1 and key3 multiple times
      cacheService.get("key1")
      cacheService.get("key1")
      cacheService.get("key3")

      // Add key4, should evict key2 (least frequently used)
      cacheService.set("key4", "value4")

      expect(cacheService.get("key1")).toBe("value1")
      expect(cacheService.get("key2")).toBeNull()
      expect(cacheService.get("key3")).toBe("value3")
      expect(cacheService.get("key4")).toBe("value4")
    })
  })

  describe("Statistics", () => {
    test("should track hit and miss statistics", () => {
      cacheService.set("key1", "value1")

      cacheService.get("key1") // hit
      cacheService.get("key2") // miss
      cacheService.get("key1") // hit

      const stats = cacheService.getStats()
      expect(stats.hits).toBe(2)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBe(2 / 3)
    })

    test("should track evictions", () => {
      cacheService.set("key1", "value1")
      cacheService.set("key2", "value2")
      cacheService.set("key3", "value3")
      cacheService.set("key4", "value4") // Should cause eviction

      const stats = cacheService.getStats()
      expect(stats.evictions).toBe(1)
    })
  })

  describe("Edge Cases", () => {
    test("should handle undefined and null values", () => {
      cacheService.set("undefined", undefined)
      cacheService.set("null", null)

      expect(cacheService.get("undefined")).toBeUndefined()
      expect(cacheService.get("null")).toBeNull()
    })

    test("should handle complex objects", () => {
      const complexObject = {
        nested: { value: 42 },
        array: [1, 2, 3],
        date: new Date(),
      }

      cacheService.set("complex", complexObject)
      expect(cacheService.get("complex")).toEqual(complexObject)
    })
  })
})
