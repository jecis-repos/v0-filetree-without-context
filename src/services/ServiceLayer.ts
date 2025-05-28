import type { DIContainer } from "../container/DIContainer"
import type { IFileSystemProvider } from "../interfaces/IFileSystemProvider"
import type { IPerformanceMonitor } from "../interfaces/IPerformanceMonitor"
import type { ICacheService } from "../interfaces/ICacheService"
import type { ILoggingService } from "./LoggingService"
import type { IBenchmarkService } from "../interfaces/IBenchmarkService"
import type { IImageExportService } from "../interfaces/IImageExportService"
import type { IHealthService } from "../interfaces/IHealthService"

export class ServiceLayer {
  private container: DIContainer
  private initialized = false

  constructor(container: DIContainer) {
    this.container = container
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    console.log("ServiceLayer: Initializing service layer...")

    try {
      // Register all core services
      await this.registerCoreServices()

      // Register business services
      await this.registerBusinessServices()

      // Register infrastructure services
      await this.registerInfrastructureServices()

      // Validate all services
      await this.validateServices()

      this.initialized = true
      console.log("ServiceLayer: Service layer initialized successfully")
    } catch (error) {
      console.error("ServiceLayer: Failed to initialize service layer:", error)
      throw error
    }
  }

  private async registerCoreServices(): Promise<void> {
    // File System Provider
    if (!this.container.hasService("IFileSystemProvider")) {
      const { MemoryFileSystemProvider } = await import("../providers/MemoryFileSystemProvider")
      const performanceMonitor = this.container.resolve<IPerformanceMonitor>("IPerformanceMonitor")
      const provider = new MemoryFileSystemProvider(performanceMonitor)
      await provider.initialize()
      this.container.registerInstance("IFileSystemProvider", provider)
    }

    // Performance Monitor
    if (!this.container.hasService("IPerformanceMonitor")) {
      const { PerformanceMonitor } = await import("./PerformanceMonitor")
      const monitor = new PerformanceMonitor(1000)
      this.container.registerInstance("IPerformanceMonitor", monitor)
    }

    // Cache Service
    if (!this.container.hasService("ICacheService")) {
      const { CacheService } = await import("./CacheService")
      const cache = new CacheService(1000, 300000, "LRU")
      this.container.registerInstance("ICacheService", cache)
    }

    // Logging Service
    if (!this.container.hasService("ILoggingService")) {
      const { LoggingService } = await import("./LoggingService")
      const logger = new LoggingService(1000)
      this.container.registerInstance("ILoggingService", logger)
    }
  }

  private async registerBusinessServices(): Promise<void> {
    // File System Calculator
    if (!this.container.hasService("IFileSystemCalculator")) {
      const { FileSystemCalculator } = await import("./FileSystemCalculator")
      const cache = this.container.resolve<ICacheService>("ICacheService")
      const calculator = new FileSystemCalculator(cache)
      this.container.registerInstance("IFileSystemCalculator", calculator)
    }

    // File Importer
    if (!this.container.hasService("IFileImporter")) {
      const { FileImporter } = await import("./FileImporter")
      const performanceMonitor = this.container.resolve<IPerformanceMonitor>("IPerformanceMonitor")
      const importer = new FileImporter(performanceMonitor)
      this.container.registerInstance("IFileImporter", importer)
    }

    // Benchmark Service
    if (!this.container.hasService("IBenchmarkService")) {
      const { BenchmarkService } = await import("./BenchmarkService")
      const performanceMonitor = this.container.resolve<IPerformanceMonitor>("IPerformanceMonitor")
      const benchmark = new BenchmarkService(performanceMonitor)
      this.container.registerInstance("IBenchmarkService", benchmark)
    }

    // Image Export Service
    if (!this.container.hasService("IImageExportService")) {
      const { ImageExportService } = await import("./ImageExportService")
      const { PhpImageProvider } = await import("../providers/PhpImageProvider")
      const logger = this.container.resolve<ILoggingService>("ILoggingService")
      const performanceMonitor = this.container.resolve<IPerformanceMonitor>("IPerformanceMonitor")
      const phpProvider = new PhpImageProvider()
      const imageExport = new ImageExportService(phpProvider, logger, performanceMonitor)
      this.container.registerInstance("IImageExportService", imageExport)
    }
  }

  private async registerInfrastructureServices(): Promise<void> {
    // Health Service
    if (!this.container.hasService("IHealthService")) {
      const { HealthService } = await import("./HealthService")
      const logger = this.container.resolve<ILoggingService>("ILoggingService")
      const health = new HealthService(logger)
      this.container.registerInstance("IHealthService", health)
    }

    // Error Tracking Service
    if (!this.container.hasService("ErrorTrackingService")) {
      const { ErrorTrackingService } = await import("./ErrorTrackingService")
      const errorTracker = new ErrorTrackingService()
      this.container.registerInstance("ErrorTrackingService", errorTracker)
    }
  }

  private async validateServices(): Promise<void> {
    const requiredServices = [
      "IFileSystemProvider",
      "IPerformanceMonitor",
      "ICacheService",
      "ILoggingService",
      "IFileSystemCalculator",
      "IFileImporter",
      "IBenchmarkService",
      "IImageExportService",
      "IHealthService",
    ]

    const logger = this.container.resolve<ILoggingService>("ILoggingService")

    for (const serviceName of requiredServices) {
      try {
        const service = this.container.resolve(serviceName)
        if (!service) {
          throw new Error(`Service ${serviceName} resolved to null/undefined`)
        }
        logger.info("ServiceLayer", `✅ ${serviceName} validated successfully`)
      } catch (error) {
        logger.error("ServiceLayer", `❌ ${serviceName} validation failed`, { error: error.message })
        throw new Error(`Required service ${serviceName} is not available: ${error.message}`)
      }
    }
  }

  // Service accessors with proper typing
  getFileSystemProvider(): IFileSystemProvider {
    return this.container.resolve<IFileSystemProvider>("IFileSystemProvider")
  }

  getPerformanceMonitor(): IPerformanceMonitor {
    return this.container.resolve<IPerformanceMonitor>("IPerformanceMonitor")
  }

  getCacheService(): ICacheService {
    return this.container.resolve<ICacheService>("ICacheService")
  }

  getLoggingService(): ILoggingService {
    return this.container.resolve<ILoggingService>("ILoggingService")
  }

  getBenchmarkService(): IBenchmarkService {
    return this.container.resolve<IBenchmarkService>("IBenchmarkService")
  }

  getImageExportService(): IImageExportService {
    return this.container.resolve<IImageExportService>("IImageExportService")
  }

  getHealthService(): IHealthService {
    return this.container.resolve<IHealthService>("IHealthService")
  }

  // Health check for the service layer
  async healthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    const services: Record<string, boolean> = {}
    const serviceNames = this.container.getRegisteredServices()

    for (const serviceName of serviceNames) {
      try {
        const service = this.container.resolve(serviceName)
        services[serviceName] = service !== null && service !== undefined
      } catch (error) {
        services[serviceName] = false
      }
    }

    const healthyCount = Object.values(services).filter(Boolean).length
    const totalCount = Object.keys(services).length
    const healthPercentage = (healthyCount / totalCount) * 100

    return {
      status: healthPercentage >= 90 ? "healthy" : healthPercentage >= 70 ? "degraded" : "unhealthy",
      services,
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  dispose(): void {
    this.container.dispose()
    this.initialized = false
  }
}
