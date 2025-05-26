import type { CacheInterface, CacheStats } from "./cache-interface"

export class IndexedDBCache implements CacheInterface {
  private dbName = "filetree-cache"
  private version = 1
  private stats = { hits: 0, misses: 0 }

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache", { keyPath: "key" })
        }
      }
    })
  }

  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(["cache"], "readonly")
      const store = transaction.objectStore("cache")

      return new Promise((resolve) => {
        const request = store.get(key)
        request.onsuccess = () => {
          const result = request.result
          if (result && Date.now() <= result.expires) {
            this.stats.hits++
            resolve(result.data)
          } else {
            this.stats.misses++
            if (result) this.delete(key) // Clean expired
            resolve(defaultValue)
          }
        }
        request.onerror = () => {
          this.stats.misses++
          resolve(defaultValue)
        }
      })
    } catch {
      this.stats.misses++
      return defaultValue
    }
  }

  async set<T>(key: string, value: T, ttl = 300000): Promise<boolean> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(["cache"], "readwrite")
      const store = transaction.objectStore("cache")

      return new Promise((resolve) => {
        const request = store.put({
          key,
          data: value,
          expires: Date.now() + ttl,
        })
        request.onsuccess = () => resolve(true)
        request.onerror = () => resolve(false)
      })
    } catch {
      return false
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(["cache"], "readwrite")
      const store = transaction.objectStore("cache")

      return new Promise((resolve) => {
        const request = store.delete(key)
        request.onsuccess = () => resolve(true)
        request.onerror = () => resolve(false)
      })
    } catch {
      return false
    }
  }

  async clear(): Promise<boolean> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(["cache"], "readwrite")
      const store = transaction.objectStore("cache")

      return new Promise((resolve) => {
        const request = store.clear()
        request.onsuccess = () => resolve(true)
        request.onerror = () => resolve(false)
      })
    } catch {
      return false
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== undefined
  }

  async getStats(): Promise<CacheStats> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(["cache"], "readonly")
      const store = transaction.objectStore("cache")

      return new Promise((resolve) => {
        const request = store.count()
        request.onsuccess = () =>
          resolve({
            hits: this.stats.hits,
            misses: this.stats.misses,
            size: request.result,
            type: "indexeddb",
          })
        request.onerror = () =>
          resolve({
            hits: this.stats.hits,
            misses: this.stats.misses,
            size: 0,
            type: "indexeddb",
          })
      })
    } catch {
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        size: 0,
        type: "indexeddb",
      }
    }
  }
}
