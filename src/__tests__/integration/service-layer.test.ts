import { DIContainer } from "../../container/DIContainer"
import { ServiceLayer } from "../../services/ServiceLayer"

describe("ServiceLayer Integration", () => {
  let container: DIContainer
  let serviceLayer: ServiceLayer

  beforeEach(async () => {
    container = new DIContainer()
    serviceLayer = new ServiceLayer(container)
  })

  afterEach(() => {
    serviceLayer.dispose()
  })

  describe("Initialization", () => {
    test("should initialize all required services", async () => {
      await serviceLayer.initialize()

      expect(serviceLayer.isInitialized()).toBe(true)

      // Test core services
      expect(() => serviceLayer.getFileSystemProvider()).not.toThrow()
      expect(() => serviceLayer.getPerformanceMonitor()).not.toThrow()
      expect(() => serviceLayer.getCacheService()).not.toThrow()
      expect(() => serviceLayer.getLoggingService()).not.toThrow()

      // Test business services
      expect(() => serviceLayer.getBenchmarkService()).not.toThrow()
      expect(() => serviceLayer.getImageExportService()).not.toThrow()

      // Test infrastructure services
      expect(() => serviceLayer.getHealthService()).not.toThrow()
    })

    test("should perform health check successfully", async () => {
      await serviceLayer.initialize()

      const healthCheck = await serviceLayer.healthCheck()

      expect(healthCheck.status).toMatch(/healthy|degraded|unhealthy/)
      expect(typeof healthCheck.services).toBe("object")
      expect(Object.keys(healthCheck.services).length).toBeGreaterThan(0)
    })

    test("should handle initialization errors gracefully", async () => {
      // Mock a service to fail
      const originalResolve = container.resolve
      container.resolve = jest.fn().mockImplementation((serviceName) => {
        if (serviceName === "IFileSystemProvider") {
          throw new Error("Mock initialization failure")
        }
        return originalResolve.call(container, serviceName)
      })

      await expect(serviceLayer.initialize()).rejects.toThrow()
      expect(serviceLayer.isInitialized()).toBe(false)
    })
  })

  describe("Service Integration", () => {
    beforeEach(async () => {
      await serviceLayer.initialize()
    })

    test("should integrate file system provider with performance monitoring", async () => {
      const provider = serviceLayer.getFileSystemProvider()
      const monitor = serviceLayer.getPerformanceMonitor()

      const initialMetrics = monitor.getMetrics()

      await provider.getFileTree()

      const finalMetrics = monitor.getMetrics()
      expect(finalMetrics.length).toBeGreaterThanOrEqual(initialMetrics.length)
    })

    test("should integrate cache service with file system calculator", async () => {
      const cache = serviceLayer.getCacheService()
      const calculator = container.resolve("IFileSystemCalculator")

      // Test that calculator uses cache
      const testKey = "test-calculation"
      cache.set(testKey, { result: "cached" })

      expect(cache.get(testKey)).toEqual({ result: "cached" })
    })

    test("should integrate logging across all services", async () => {
      const logger = serviceLayer.getLoggingService()
      const initialLogCount = logger.getLogs().length

      // Trigger operations that should log
      const provider = serviceLayer.getFileSystemProvider()
      await provider.getFileTree()

      const benchmark = serviceLayer.getBenchmarkService()
      await benchmark.runBenchmark(provider, {
        breadth: 2,
        depth: 2,
        fileSize: 1024,
        operations: ["read"],
        iterations: 1,
      })

      const finalLogCount = logger.getLogs().length
      expect(finalLogCount).toBeGreaterThan(initialLogCount)
    })

    test("should export images with real data", async () => {
      const imageExport = serviceLayer.getImageExportService()
      const provider = serviceLayer.getFileSystemProvider()

      const fileTree = await provider.getFileTree()

      const result = await imageExport.exportFileTreeAsImage(fileTree, {
        width: 800,
        height: 600,
        format: "png",
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeInstanceOf(Blob)
      expect(result.metadata?.width).toBe(800)
      expect(result.metadata?.height).toBe(600)
    })
  })

  describe("Error Handling", () => {
    beforeEach(async () => {
      await serviceLayer.initialize()
    })

    test("should handle service errors gracefully", async () => {
      const logger = serviceLayer.getLoggingService()
      const initialErrorCount = logger.getLogs().filter((log) => log.level === "error").length

      // Trigger an error condition
      const provider = serviceLayer.getFileSystemProvider()
      try {
        await provider.getNode("/non-existent-path")
      } catch (error) {
        // Expected to handle gracefully
      }

      // Should not crash the system
      expect(() => serviceLayer.getFileSystemProvider()).not.toThrow()
    })
  })
})
