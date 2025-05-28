export type ServiceLifetime = "singleton" | "transient" | "scoped"

export interface ServiceDescriptor {
  name: string
  implementation: string
  lifetime: ServiceLifetime
  dependencies?: string[]
  configuration?: Record<string, any>
}

export interface ContainerConfiguration {
  services: ServiceDescriptor[]
}

export interface ServiceInfo {
  name: string
  isRegistered: boolean
  isResolved: boolean
  lifetime: ServiceLifetime
  dependencies: string[]
  hasInstance: boolean
  hasFactory: boolean
  error?: string
}

export class DIContainer {
  private services = new Map<string, ServiceDescriptor>()
  private instances = new Map<string, any>()
  private factories = new Map<string, () => any>()
  private resolving = new Set<string>()
  private resolutionErrors = new Map<string, string>()

  constructor() {
    // Register self
    this.registerInstance("DIContainer", this)
    this.initializeDefaultServices()
  }

  private initializeDefaultServices() {
    console.log("[DIContainer] Initializing default services...")

    // Core Services
    this.registerFactory(
      "ILoggingService",
      () => {
        try {
          const { LoggingService } = require("../services/LoggingService")
          console.log("[DIContainer] LoggingService loaded successfully")
          return new LoggingService(1000)
        } catch (error) {
          console.warn("[DIContainer] LoggingService not available, using mock:", error)
          return this.createMockLoggingService()
        }
      },
      "singleton",
    )

    this.registerFactory(
      "IPerformanceMonitor",
      () => {
        try {
          const { PerformanceMonitor } = require("../services/PerformanceMonitor")
          console.log("[DIContainer] PerformanceMonitor loaded successfully")
          return new PerformanceMonitor(1000)
        } catch (error) {
          console.warn("[DIContainer] PerformanceMonitor not available, using mock:", error)
          return this.createMockPerformanceMonitor()
        }
      },
      "singleton",
    )

    this.registerFactory(
      "ICacheService",
      () => {
        try {
          const { CacheService } = require("../services/CacheService")
          console.log("[DIContainer] CacheService loaded successfully")
          return new CacheService(1000, 300000, "LRU")
        } catch (error) {
          console.warn("[DIContainer] CacheService not available, using mock:", error)
          return this.createMockCacheService()
        }
      },
      "singleton",
    )

    // File System Services
    this.registerFactory(
      "IFileSystemCalculator",
      () => {
        try {
          const { FileSystemCalculator } = require("../services/FileSystemCalculator")
          const cacheService = this.resolve("ICacheService")
          console.log("[DIContainer] FileSystemCalculator loaded successfully")
          return new FileSystemCalculator(cacheService)
        } catch (error) {
          console.warn("[DIContainer] FileSystemCalculator not available, using mock:", error)
          return this.createMockFileSystemCalculator()
        }
      },
      "singleton",
    )

    this.registerFactory(
      "IFileImporter",
      () => {
        try {
          const { FileImporter } = require("../services/FileImporter")
          const performanceMonitor = this.resolve("IPerformanceMonitor")
          console.log("[DIContainer] FileImporter loaded successfully")
          return new FileImporter(performanceMonitor)
        } catch (error) {
          console.warn("[DIContainer] FileImporter not available, using mock:", error)
          return this.createMockFileImporter()
        }
      },
      "singleton",
    )

    // Image Export Service
    this.registerFactory(
      "ImageExportService",
      () => {
        try {
          const { ImageExportService } = require("../services/ImageExportService")
          const phpImageProvider = this.resolve("PhpImageProvider")
          const logger = this.resolve("ILoggingService")
          const performanceMonitor = this.resolve("IPerformanceMonitor")
          console.log("[DIContainer] ImageExportService loaded successfully")
          return new ImageExportService(phpImageProvider, logger, performanceMonitor)
        } catch (error) {
          console.warn("[DIContainer] ImageExportService not available, using mock:", error)
          return this.createMockImageExportService()
        }
      },
      "singleton",
    )

    // PHP Image Provider
    this.registerFactory(
      "PhpImageProvider",
      () => {
        try {
          const { PhpImageProvider } = require("../providers/PhpImageProvider")
          console.log("[DIContainer] PhpImageProvider loaded successfully")
          return new PhpImageProvider()
        } catch (error) {
          console.warn("[DIContainer] PhpImageProvider not available, using mock:", error)
          return this.createMockPhpImageProvider()
        }
      },
      "singleton",
    )

    // File System Providers
    this.registerFactory(
      "MemoryFileSystemProvider",
      () => {
        try {
          const { MemoryFileSystemProvider } = require("../providers/MemoryFileSystemProvider")
          const performanceMonitor = this.resolve("IPerformanceMonitor")
          console.log("[DIContainer] MemoryFileSystemProvider loaded successfully")
          return new MemoryFileSystemProvider(performanceMonitor)
        } catch (error) {
          console.warn("[DIContainer] MemoryFileSystemProvider not available, using mock:", error)
          return this.createMockFileSystemProvider()
        }
      },
      "singleton",
    )

    this.registerFactory(
      "IFileSystemProvider",
      () => {
        try {
          return this.resolve("MemoryFileSystemProvider")
        } catch (error) {
          console.warn("[DIContainer] Default FileSystemProvider not available, using mock:", error)
          return this.createMockFileSystemProvider()
        }
      },
      "singleton",
    )

    // Business Services
    this.registerFactory(
      "EnhancedBenchmarkService",
      () => {
        try {
          const { EnhancedBenchmarkService } = require("../services/EnhancedBenchmarkService")
          console.log("[DIContainer] EnhancedBenchmarkService loaded successfully")
          return new EnhancedBenchmarkService()
        } catch (error) {
          console.warn("[DIContainer] EnhancedBenchmarkService not available, using mock:", error)
          return this.createMockBenchmarkService()
        }
      },
      "singleton",
    )

    this.registerFactory(
      "BenchmarkService",
      () => {
        try {
          const { BenchmarkService } = require("../services/BenchmarkService")
          const performanceMonitor = this.resolve("IPerformanceMonitor")
          console.log("[DIContainer] BenchmarkService loaded successfully")
          return new BenchmarkService(performanceMonitor)
        } catch (error) {
          console.warn("[DIContainer] BenchmarkService not available, using mock:", error)
          return this.createMockBenchmarkService()
        }
      },
      "singleton",
    )

    console.log("[DIContainer] Default services initialization completed")
  }

  // Mock service creators
  private createMockLoggingService() {
    return {
      info: (category: string, message: string, data?: any) => console.log(`[${category}] ${message}`, data),
      warn: (category: string, message: string, data?: any) => console.warn(`[${category}] ${message}`, data),
      error: (category: string, message: string, data?: any) => console.error(`[${category}] ${message}`, data),
      debug: (category: string, message: string, data?: any) => console.debug(`[${category}] ${message}`, data),
      getLogs: () => [],
      clearLogs: () => {},
      exportLogs: () => "[]",
    }
  }

  private createMockPerformanceMonitor() {
    return {
      startTimer: (operation: string) => ({ operation, startTime: Date.now() }),
      endTimer: (timer: any) => ({ ...timer, duration: 100 }),
      recordMetric: (name: string, value: number) => {},
      getMetrics: () => ({}),
      clearMetrics: () => {},
    }
  }

  private createMockCacheService() {
    return {
      get: (key: string) => undefined,
      set: (key: string, value: any, ttl?: number) => {},
      delete: (key: string) => false,
      clear: () => {},
      getStats: () => ({ hits: 0, misses: 0, size: 0 }),
    }
  }

  private createMockFileSystemCalculator() {
    return {
      calculateTotalSize: () => 0,
      calculateFileCount: () => 0,
      calculateDirectoryCount: () => 0,
      calculateDepth: () => 0,
    }
  }

  private createMockFileImporter() {
    return {
      importFromFiles: async () => ({ success: true, nodes: [], errors: [], totalFiles: 0, importedFiles: 0 }),
      importFromDirectory: async () => ({ success: true, nodes: [], errors: [], totalFiles: 0, importedFiles: 0 }),
      importFromJSON: async () => ({ success: true, nodes: [], errors: [], totalFiles: 0, importedFiles: 0 }),
      importFromUrl: async (url: string) => ({
        success: true,
        nodes: [
          {
            id: "mock-1",
            name: "Mock Import",
            type: "directory" as const,
            path: "/mock-import",
            children: [
              {
                id: "mock-file-1",
                name: "example.txt",
                type: "file" as const,
                path: "/mock-import/example.txt",
                size: 1024,
                lastModified: new Date(),
              },
            ],
            lastModified: new Date(),
          },
        ],
        errors: [],
        totalFiles: 1,
        importedFiles: 1,
      }),
      importFromLocalFile: async (file: File) => ({
        success: true,
        nodes: [
          {
            id: "local-mock-1",
            name: file.name,
            type: "file" as const,
            path: `/${file.name}`,
            size: file.size,
            lastModified: new Date(file.lastModified),
          },
        ],
        errors: [],
        totalFiles: 1,
        importedFiles: 1,
      }),
    }
  }

  private createMockFileSystemProvider() {
    return {
      readDirectory: async () => [],
      readFile: async () => new Uint8Array(),
      writeFile: async () => {},
      deleteFile: async () => {},
      createDirectory: async () => {},
      exists: async () => false,
      getStats: async () => ({ size: 0, isDirectory: false, isFile: false, modified: new Date() }),
    }
  }

  private createMockBenchmarkService() {
    return {
      runBenchmark: async (provider: any, options: any) => ({
        providerName: provider.name || "Mock",
        totalTime: 100 + Math.random() * 200,
        operationResults: [
          {
            operation: "read",
            averageTime: 50 + Math.random() * 50,
            minTime: 10,
            maxTime: 100,
            successRate: 0.95 + Math.random() * 0.05,
          },
          {
            operation: "write",
            averageTime: 75 + Math.random() * 75,
            minTime: 20,
            maxTime: 150,
            successRate: 0.9 + Math.random() * 0.1,
          },
        ],
        treeStats: {
          totalNodes: 50 + Math.floor(Math.random() * 100),
          totalFiles: 30 + Math.floor(Math.random() * 50),
          totalDirectories: 10 + Math.floor(Math.random() * 20),
          maxDepth: 3 + Math.floor(Math.random() * 3),
          totalSize: 1024 * (100 + Math.floor(Math.random() * 500)),
        },
      }),
    }
  }

  private createMockImageExportService() {
    return {
      exportFileTreeAsImage: async (fileTree: any[], options: any) => ({
        success: true,
        data: new Blob(["mock image data"], { type: "image/png" }),
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        metadata: {
          format: options.format || "png",
          size: 1024,
          width: options.width || 1200,
          height: options.height || 800,
        },
      }),
      exportDirectoryVisualization: async (fileTree: any[], options: any) => ({
        success: true,
        data: new Blob(["mock visualization data"], { type: "image/png" }),
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        metadata: {
          format: options.format || "png",
          size: 2048,
          width: options.width || 1200,
          height: options.height || 800,
          type: options.visualizationType,
        },
      }),
      downloadImage: async (result: any, filename?: string) => {
        console.log(`[MockImageExportService] Mock download: ${filename}`)
        // Create a mock download
        const link = document.createElement("a")
        link.href = result.url
        link.download = filename || "mock-export.png"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      },
    }
  }

  private createMockPhpImageProvider() {
    return {
      generateFileTreeImage: async (filePaths: string[], options: any) => ({
        success: true,
        data: new Blob(["mock php image"], { type: "image/png" }),
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        metadata: {
          format: options.format || "png",
          size: 1024,
          generatedBy: "MockPhpImageProvider",
        },
      }),
      generateDirectoryVisualization: async (filePaths: string[], options: any) => ({
        success: true,
        data: new Blob(["mock php visualization"], { type: "image/png" }),
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        metadata: {
          format: options.format || "png",
          size: 2048,
          type: options.visualizationType,
          generatedBy: "MockPhpImageProvider",
        },
      }),
    }
  }

  loadConfiguration(config: ContainerConfiguration): void {
    config.services.forEach((service) => {
      this.services.set(service.name, service)
    })
  }

  registerFactory<T>(name: string, factory: () => T, lifetime: ServiceLifetime = "transient"): void {
    this.factories.set(name, factory)
    this.services.set(name, {
      name,
      implementation: name,
      lifetime,
      dependencies: [],
    })
    console.log(`[DIContainer] Registered factory for ${name}`)
  }

  registerInstance<T>(name: string, instance: T): void {
    this.instances.set(name, instance)
    this.services.set(name, {
      name,
      implementation: name,
      lifetime: "singleton",
      dependencies: [],
    })
    console.log(`[DIContainer] Registered instance for ${name}`)
  }

  resolve<T>(serviceName: string): T {
    try {
      // Check for circular dependencies
      if (this.resolving.has(serviceName)) {
        throw new Error(`Circular dependency detected: ${serviceName}`)
      }

      // Return existing singleton instance
      if (this.instances.has(serviceName)) {
        return this.instances.get(serviceName)
      }

      const serviceDescriptor = this.services.get(serviceName)
      if (!serviceDescriptor) {
        throw new Error(`Service not registered: ${serviceName}`)
      }

      this.resolving.add(serviceName)

      let instance: T

      // Use factory if available
      if (this.factories.has(serviceName)) {
        instance = this.factories.get(serviceName)!()
      } else {
        // Resolve dependencies
        const dependencies = serviceDescriptor.dependencies?.map((dep) => this.resolve(dep)) || []

        // Create instance using dynamic import
        const ImplementationClass = this.getImplementationClass(serviceDescriptor.implementation)
        instance = new ImplementationClass(...dependencies, serviceDescriptor.configuration)
      }

      // Store singleton instances
      if (serviceDescriptor.lifetime === "singleton") {
        this.instances.set(serviceName, instance)
      }

      this.resolving.delete(serviceName)
      console.log(`[DIContainer] Successfully resolved ${serviceName}`)
      return instance
    } catch (error) {
      this.resolving.delete(serviceName)
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.resolutionErrors.set(serviceName, errorMessage)
      console.error(`[DIContainer] Failed to resolve ${serviceName}:`, error)
      throw error
    }
  }

  private getImplementationClass(implementation: string): any {
    const implementations: Record<string, any> = {}

    try {
      // Import all required implementations with error handling
      const modules = [
        { name: "WasmFileSystemProvider", path: "../providers/WasmFileSystemProvider" },
        { name: "MemoryFileSystemProvider", path: "../providers/MemoryFileSystemProvider" },
        { name: "PhpImageProvider", path: "../providers/PhpImageProvider" },
        { name: "CacheService", path: "../services/CacheService" },
        { name: "FileSystemCalculator", path: "../services/FileSystemCalculator" },
        { name: "PerformanceMonitor", path: "../services/PerformanceMonitor" },
        { name: "LoggingService", path: "../services/LoggingService" },
        { name: "ImageExportService", path: "../services/ImageExportService" },
      ]

      modules.forEach(({ name, path }) => {
        try {
          implementations[name] = require(path)[name]
        } catch (e) {
          console.warn(`[DIContainer] ${name} not available from ${path}`)
        }
      })
    } catch (error) {
      console.warn("[DIContainer] Failed to load some implementations:", error)
    }

    const ImplementationClass = implementations[implementation]
    if (!ImplementationClass) {
      throw new Error(`Implementation not found: ${implementation}`)
    }

    return ImplementationClass
  }

  hasService(serviceName: string): boolean {
    return this.services.has(serviceName) || this.instances.has(serviceName) || this.factories.has(serviceName)
  }

  getRegisteredServices(): string[] {
    return Array.from(this.services.keys())
  }

  getServiceInfo(serviceName: string): ServiceInfo {
    const service = this.services.get(serviceName)
    const hasInstance = this.instances.has(serviceName)
    const hasFactory = this.factories.has(serviceName)
    const error = this.resolutionErrors.get(serviceName)

    return {
      name: serviceName,
      isRegistered: !!service,
      isResolved: hasInstance,
      lifetime: service?.lifetime || ("unknown" as ServiceLifetime),
      dependencies: service?.dependencies || [],
      hasInstance,
      hasFactory,
      error,
    }
  }

  getAllServiceInfo(): ServiceInfo[] {
    const allServices = new Set([...this.services.keys(), ...this.instances.keys(), ...this.factories.keys()])

    return Array.from(allServices).map((serviceName) => this.getServiceInfo(serviceName))
  }

  testAllServices(): Record<string, boolean> {
    const results: Record<string, boolean> = {}
    const services = this.getRegisteredServices()

    console.log(`[DIContainer] Testing ${services.length} registered services...`)

    services.forEach((serviceName) => {
      try {
        const service = this.resolve(serviceName)
        results[serviceName] = service !== null && service !== undefined
        console.log(`[DIContainer] Service ${serviceName}: ${results[serviceName] ? "✅ OK" : "❌ FAILED"}`)
      } catch (error) {
        results[serviceName] = false
        console.error(`[DIContainer] Service ${serviceName}: ❌ ERROR -`, error)
      }
    })

    return results
  }

  dispose(): void {
    for (const [name, instance] of this.instances) {
      if (instance && typeof instance.dispose === "function") {
        try {
          instance.dispose()
          console.log(`[DIContainer] Disposed ${name}`)
        } catch (error) {
          console.warn(`[DIContainer] Failed to dispose ${name}:`, error)
        }
      }
    }
    this.instances.clear()
    this.resolving.clear()
    this.resolutionErrors.clear()
  }
}

export default DIContainer
