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

export class DIContainer {
  private services = new Map<string, ServiceDescriptor>()
  private instances = new Map<string, any>()
  private factories = new Map<string, () => any>()
  private resolving = new Set<string>()

  constructor() {
    // Register self
    this.registerInstance("DIContainer", this)

    // Register missing services with default implementations
    this.registerFactory(
      "IFileImporter",
      () => {
        const { FileImporter } = require("../services/FileImporter")
        const performanceMonitor = this.resolve("IPerformanceMonitor")
        return new FileImporter(performanceMonitor)
      },
      "singleton",
    )
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
  }

  registerInstance<T>(name: string, instance: T): void {
    this.instances.set(name, instance)
    this.services.set(name, {
      name,
      implementation: name,
      lifetime: "singleton",
      dependencies: [],
    })
  }

  resolve<T>(serviceName: string): T {
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

    try {
      let instance: T

      // Use factory if available
      if (this.factories.has(serviceName)) {
        instance = this.factories.get(serviceName)!()
      } else {
        // Resolve dependencies
        const dependencies = serviceDescriptor.dependencies?.map((dep) => this.resolve(dep)) || []

        // Create instance using dynamic import (simplified for demo)
        const ImplementationClass = this.getImplementationClass(serviceDescriptor.implementation)
        instance = new ImplementationClass(...dependencies, serviceDescriptor.configuration)
      }

      // Store singleton instances
      if (serviceDescriptor.lifetime === "singleton") {
        this.instances.set(serviceName, instance)
      }

      return instance
    } finally {
      this.resolving.delete(serviceName)
    }
  }

  private getImplementationClass(implementation: string): any {
    // Import implementations dynamically
    const implementations: Record<string, any> = {}

    // Register implementations
    try {
      // Import all required implementations
      const WasmFileSystemProvider = require("../providers/WasmFileSystemProvider").WasmFileSystemProvider
      const MemoryFileSystemProvider = require("../providers/MemoryFileSystemProvider").MemoryFileSystemProvider
      const CacheService = require("../services/CacheService").CacheService
      const FileSystemCalculator = require("../services/FileSystemCalculator").FileSystemCalculator
      const PerformanceMonitor = require("../services/PerformanceMonitor").PerformanceMonitor
      const LoggingService = require("../services/LoggingService").LoggingService

      // Register all implementations
      implementations.WasmFileSystemProvider = WasmFileSystemProvider
      implementations.MemoryFileSystemProvider = MemoryFileSystemProvider
      implementations.CacheService = CacheService
      implementations.FileSystemCalculator = FileSystemCalculator
      implementations.PerformanceMonitor = PerformanceMonitor
      implementations.LoggingService = LoggingService
    } catch (error) {
      console.warn("Failed to load some implementations:", error)
    }

    const ImplementationClass = implementations[implementation]
    if (!ImplementationClass) {
      throw new Error(`Implementation not found: ${implementation}`)
    }

    return ImplementationClass
  }

  // Check if a service is registered
  hasService(serviceName: string): boolean {
    return this.services.has(serviceName) || this.instances.has(serviceName) || this.factories.has(serviceName)
  }

  getRegisteredServices(): string[] {
    return Array.from(this.services.keys())
  }

  dispose(): void {
    // Dispose all singleton instances that implement IDisposable
    for (const [name, instance] of this.instances) {
      if (instance && typeof instance.dispose === "function") {
        instance.dispose()
      }
    }
    this.instances.clear()
    this.resolving.clear()
  }
}

// Export default as well for compatibility
export default DIContainer
