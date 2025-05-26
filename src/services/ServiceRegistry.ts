import type { DIContainer } from "../container/DIContainer"
import { LoggingService } from "./LoggingService"
import { PerformanceMonitor } from "./PerformanceMonitor"
import { CacheService } from "./CacheService"
import { FileSystemCalculator } from "./FileSystemCalculator"
import { MemoryFileSystemProvider } from "../providers/MemoryFileSystemProvider"
import { FileImporter } from "./FileImporter"
import { ErrorTrackingService } from "./ErrorTrackingService"
import { HealthCheckService } from "./HealthCheckService"
import { IntegrityCheckService } from "./IntegrityCheckService"
import { ImageExportService } from "./ImageExportService"
import { PhpImageProvider } from "../providers/PhpImageProvider"

export interface ServiceRegistryConfig {
  enableWasm?: boolean
  enableIndexedDB?: boolean
  enableImageExport?: boolean
  enableHealthChecks?: boolean
}

export class ServiceRegistry {
  private container: DIContainer
  private config: ServiceRegistryConfig
  private registeredServices: Set<string> = new Set()

  constructor(container: DIContainer, config: ServiceRegistryConfig = {}) {
    this.container = container
    this.config = {
      enableWasm: true,
      enableIndexedDB: true,
      enableImageExport: true,
      enableHealthChecks: true,
      ...config,
    }
  }

  async registerAllServices(): Promise<void> {
    console.log("ServiceRegistry: Starting service registration")

    try {
      // Core services first
      await this.registerCoreServices()

      // Infrastructure services
      await this.registerInfrastructureServices()

      // File system providers
      await this.registerFileSystemProviders()

      // Business logic services
      await this.registerBusinessServices()

      // Optional services
      await this.registerOptionalServices()

      console.log("ServiceRegistry: All services registered successfully", {
        registered: Array.from(this.registeredServices),
        count: this.registeredServices.size,
      })
    } catch (error) {
      console.error("ServiceRegistry: Failed to register services", error)
      throw error
    }
  }

  private async registerCoreServices(): Promise<void> {
    console.log("ServiceRegistry: Registering core services")

    // Logging Service
    if (!this.container.hasService("ILoggingService")) {
      const loggingService = new LoggingService(1000)
      this.container.registerInstance("ILoggingService", loggingService)
      this.registeredServices.add("ILoggingService")
      console.log("ServiceRegistry: Registered LoggingService")
    }

    // Performance Monitor
    if (!this.container.hasService("IPerformanceMonitor")) {
      const performanceMonitor = new PerformanceMonitor(1000)
      this.container.registerInstance("IPerformanceMonitor", performanceMonitor)
      this.registeredServices.add("IPerformanceMonitor")
      console.log("ServiceRegistry: Registered PerformanceMonitor")
    }

    // Cache Service
    if (!this.container.hasService("ICacheService")) {
      const cacheService = new CacheService(1000, 300000, "LRU")
      this.container.registerInstance("ICacheService", cacheService)
      this.registeredServices.add("ICacheService")
      console.log("ServiceRegistry: Registered CacheService")
    }
  }

  private async registerInfrastructureServices(): Promise<void> {
    console.log("ServiceRegistry: Registering infrastructure services")

    // Error Tracking Service
    if (!this.container.hasService("ErrorTrackingService")) {
      const errorTracker = new ErrorTrackingService()
      this.container.registerInstance("ErrorTrackingService", errorTracker)
      this.registeredServices.add("ErrorTrackingService")
      console.log("ServiceRegistry: Registered ErrorTrackingService")
    }

    // Health Check Service
    if (!this.container.hasService("HealthCheckService") && this.config.enableHealthChecks) {
      const healthService = new HealthCheckService()
      this.container.registerInstance("HealthCheckService", healthService)
      this.registeredServices.add("HealthCheckService")
      console.log("ServiceRegistry: Registered HealthCheckService")
    }

    // Integrity Check Service
    if (!this.container.hasService("IntegrityCheckService")) {
      const logger = this.container.resolve("ILoggingService")
      const integrityService = new IntegrityCheckService(logger)
      this.container.registerInstance("IntegrityCheckService", integrityService)
      this.registeredServices.add("IntegrityCheckService")
      console.log("ServiceRegistry: Registered IntegrityCheckService")
    }
  }

  private async registerFileSystemProviders(): Promise<void> {
    console.log("ServiceRegistry: Registering file system providers")

    const performanceMonitor = this.container.resolve("IPerformanceMonitor")

    // Memory File System Provider
    if (!this.container.hasService("MemoryFileSystemProvider")) {
      const memoryProvider = new MemoryFileSystemProvider(performanceMonitor)
      this.container.registerInstance("MemoryFileSystemProvider", memoryProvider)
      this.registeredServices.add("MemoryFileSystemProvider")
      console.log("ServiceRegistry: Registered MemoryFileSystemProvider")
    }

    // Set default file system provider
    if (!this.container.hasService("IFileSystemProvider")) {
      const memoryProvider = this.container.resolve("MemoryFileSystemProvider")
      this.container.registerInstance("IFileSystemProvider", memoryProvider)
      this.registeredServices.add("IFileSystemProvider")
      console.log("ServiceRegistry: Set default IFileSystemProvider to Memory")
    }

    // WASM File System Provider (optional)
    if (this.config.enableWasm && !this.container.hasService("WasmFileSystemProvider")) {
      try {
        const { WasmFileSystemProvider } = await import("../providers/WasmFileSystemProvider")
        const logger = this.container.resolve("ILoggingService")
        const wasmProvider = new WasmFileSystemProvider(performanceMonitor, logger)
        this.container.registerInstance("WasmFileSystemProvider", wasmProvider)
        this.registeredServices.add("WasmFileSystemProvider")
        console.log("ServiceRegistry: Registered WasmFileSystemProvider")
      } catch (error) {
        console.warn("ServiceRegistry: Failed to register WasmFileSystemProvider", error)
      }
    }
  }

  private async registerBusinessServices(): Promise<void> {
    console.log("ServiceRegistry: Registering business services")

    // File System Calculator
    if (!this.container.hasService("IFileSystemCalculator")) {
      const cacheService = this.container.resolve("ICacheService")
      const calculator = new FileSystemCalculator(cacheService)
      this.container.registerInstance("IFileSystemCalculator", calculator)
      this.registeredServices.add("IFileSystemCalculator")
      console.log("ServiceRegistry: Registered FileSystemCalculator")
    }

    // File Importer
    if (!this.container.hasService("IFileImporter")) {
      const performanceMonitor = this.container.resolve("IPerformanceMonitor")
      const fileImporter = new FileImporter(performanceMonitor)
      this.container.registerInstance("IFileImporter", fileImporter)
      this.registeredServices.add("IFileImporter")
      console.log("ServiceRegistry: Registered FileImporter")
    }
  }

  private async registerOptionalServices(): Promise<void> {
    console.log("ServiceRegistry: Registering optional services")

    // Image Export Services
    if (this.config.enableImageExport && !this.container.hasService("ImageExportService")) {
      try {
        const logger = this.container.resolve("ILoggingService")
        const performanceMonitor = this.container.resolve("IPerformanceMonitor")
        const phpImageProvider = new PhpImageProvider()
        const imageExportService = new ImageExportService(phpImageProvider, logger, performanceMonitor)
        this.container.registerInstance("ImageExportService", imageExportService)
        this.registeredServices.add("ImageExportService")
        console.log("ServiceRegistry: Registered ImageExportService")
      } catch (error) {
        console.warn("ServiceRegistry: Failed to register ImageExportService", error)
      }
    }
  }

  getRegisteredServices(): string[] {
    return Array.from(this.registeredServices)
  }

  async testAllServices(): Promise<Record<string, boolean>> {
    console.log("ServiceRegistry: Testing all services")
    const results: Record<string, boolean> = {}

    for (const serviceName of this.registeredServices) {
      try {
        const service = this.container.resolve(serviceName)
        results[serviceName] = service !== null && service !== undefined
        console.log(`ServiceRegistry: Service ${serviceName} - ${results[serviceName] ? "OK" : "FAILED"}`)
      } catch (error) {
        results[serviceName] = false
        console.error(`ServiceRegistry: Service ${serviceName} test failed`, error)
      }
    }

    return results
  }
}
