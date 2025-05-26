import { WasmFileSystemProvider } from "../../providers/WasmFileSystemProvider"
import { MemoryFileSystemProvider } from "../../providers/MemoryFileSystemProvider"
import { PerformanceMonitor } from "../../services/PerformanceMonitor"
import type { IFileSystemProvider } from "../../interfaces/IFileSystemProvider"

describe("FileSystemProvider Integration Tests", () => {
  let performanceMonitor: PerformanceMonitor

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor()
  })

  describe("Provider Interoperability", () => {
    test("should have consistent interface across providers", async () => {
      const providers: IFileSystemProvider[] = [
        new MemoryFileSystemProvider(performanceMonitor),
        new WasmFileSystemProvider(performanceMonitor),
      ]

      for (const provider of providers) {
        expect(provider.name).toBeDefined()
        expect(typeof provider.initialize).toBe("function")
        expect(typeof provider.getFileTree).toBe("function")
        expect(typeof provider.getStats).toBe("function")
        expect(typeof provider.dispose).toBe("function")
      }
    })

    test("should produce similar stats structure across providers", async () => {
      const memoryProvider = new MemoryFileSystemProvider(performanceMonitor)
      const wasmProvider = new WasmFileSystemProvider(performanceMonitor)

      await memoryProvider.initialize()
      await wasmProvider.initialize()

      const memoryStats = await memoryProvider.getStats()
      const wasmStats = await wasmProvider.getStats()

      // Both should have the same stat properties
      expect(memoryStats).toHaveProperty("totalFiles")
      expect(memoryStats).toHaveProperty("totalDirectories")
      expect(memoryStats).toHaveProperty("totalSize")
      expect(memoryStats).toHaveProperty("maxDepth")

      expect(wasmStats).toHaveProperty("totalFiles")
      expect(wasmStats).toHaveProperty("totalDirectories")
      expect(wasmStats).toHaveProperty("totalSize")
      expect(wasmStats).toHaveProperty("maxDepth")
    })
  })

  describe("Performance Monitoring Integration", () => {
    test("should track performance metrics for all operations", async () => {
      const provider = new MemoryFileSystemProvider(performanceMonitor)

      await provider.initialize()
      await provider.getFileTree()
      await provider.getStats()
      await provider.createDirectory("/test")
      await provider.deleteNode("/test")

      const metrics = performanceMonitor.getMetrics()

      expect(metrics.length).toBeGreaterThan(0)
      expect(metrics.some((m) => m.operation === "memory_initialize")).toBe(true)
      expect(metrics.some((m) => m.operation === "memory_get_file_tree")).toBe(true)
      expect(metrics.some((m) => m.operation === "memory_get_stats")).toBe(true)
      expect(metrics.some((m) => m.operation === "memory_create_directory")).toBe(true)
      expect(metrics.some((m) => m.operation === "memory_delete_node")).toBe(true)
    })

    test("should track both successful and failed operations", async () => {
      const provider = new MemoryFileSystemProvider(performanceMonitor)

      // Successful operation
      await provider.initialize()

      // Failed operation (trying to get node before initialization)
      const uninitializedProvider = new MemoryFileSystemProvider(performanceMonitor)
      try {
        await uninitializedProvider.getFileTree()
      } catch (error) {
        // Expected to fail
      }

      const metrics = performanceMonitor.getMetrics()
      const successfulMetrics = metrics.filter((m) => m.success === true)
      const failedMetrics = metrics.filter((m) => m.success === false)

      expect(successfulMetrics.length).toBeGreaterThan(0)
      expect(failedMetrics.length).toBeGreaterThan(0)
    })
  })

  describe("Provider Switching", () => {
    test("should maintain data consistency when switching providers", async () => {
      const memoryProvider = new MemoryFileSystemProvider(performanceMonitor)
      await memoryProvider.initialize()

      const initialTree = await memoryProvider.getFileTree()
      const initialStats = await memoryProvider.getStats()

      // Create a new directory
      await memoryProvider.createDirectory("/test-dir")
      const updatedTree = await memoryProvider.getFileTree()
      const updatedStats = await memoryProvider.getStats()

      expect(updatedStats.totalDirectories).toBe(initialStats.totalDirectories + 1)
      expect(updatedTree.length).toBeGreaterThanOrEqual(initialTree.length)
    })

    test("should handle provider disposal correctly", async () => {
      const provider = new MemoryFileSystemProvider(performanceMonitor)
      await provider.initialize()

      const tree = await provider.getFileTree()
      expect(tree.length).toBeGreaterThan(0)

      await provider.dispose()

      // After disposal, provider should not work
      try {
        await provider.getFileTree()
        throw new Error("Should have thrown an error")
      } catch (error) {
        expect(error.message).toContain("not initialized")
      }
    })
  })

  describe("Concurrent Operations", () => {
    test("should handle concurrent file operations", async () => {
      const provider = new MemoryFileSystemProvider(performanceMonitor)
      await provider.initialize()

      // Perform multiple operations concurrently
      const operations = [
        provider.createDirectory("/concurrent1"),
        provider.createDirectory("/concurrent2"),
        provider.createDirectory("/concurrent3"),
        provider.getFileTree(),
        provider.getStats(),
      ]

      const results = await Promise.allSettled(operations)

      // All operations should succeed
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`Operation ${index} failed:`, result.reason)
        }
        expect(result.status).toBe("fulfilled")
      })
    })

    test("should maintain performance under load", async () => {
      const provider = new MemoryFileSystemProvider(performanceMonitor)
      await provider.initialize()

      const startTime = performance.now()

      // Perform many operations
      const operations = Array.from({ length: 100 }, (_, i) => provider.createDirectory(`/load-test-${i}`))

      await Promise.all(operations)

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should complete within reasonable time (adjust threshold as needed)
      expect(totalTime).toBeLessThan(5000) // 5 seconds

      const avgTime = performanceMonitor.getAverageTime("memory_create_directory")
      expect(avgTime).toBeLessThan(100) // Average operation should be under 100ms
    })
  })
})
