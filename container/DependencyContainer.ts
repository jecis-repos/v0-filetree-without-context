import type { IDependencyContainer, DIConfiguration } from "../types/interfaces"

export class DependencyContainer implements IDependencyContainer {
  private services = new Map<string, any>()
  private factories = new Map<string, () => any>()
  private singletons = new Map<string, boolean>()
  private configuration: DIConfiguration | null = null

  register<T>(name: string, factory: () => T, singleton = false): void {
    this.factories.set(name, factory)
    this.singletons.set(name, singleton)
  }

  registerInstance<T>(name: string, instance: T): void {
    this.services.set(name, instance)
    this.singletons.set(name, true)
  }

  resolve<T>(name: string): T {
    // Check if we already have an instance for singletons
    if (this.singletons.get(name) && this.services.has(name)) {
      return this.services.get(name)
    }

    // Get factory and create instance
    const factory = this.factories.get(name)
    if (!factory) {
      throw new Error(`Service '${name}' not registered`)
    }

    const instance = factory()

    // Store singleton instances
    if (this.singletons.get(name)) {
      this.services.set(name, instance)
    }

    return instance
  }

  configure(config: DIConfiguration): void {
    this.configuration = config
    this.registerFromConfiguration()
  }

  switchProvider(providerType: string, providerName: string): void {
    if (!this.configuration) {
      throw new Error("Container not configured")
    }

    // Update configuration
    this.configuration.defaultProvider = providerName

    // Clear existing provider instances to force recreation
    this.services.delete("fileSystemProvider")

    // Re-register services that depend on the provider
    this.registerFromConfiguration()
  }

  private registerFromConfiguration(): void {
    if (!this.configuration) return

    // Register providers
    for (const [name, config] of Object.entries(this.configuration.providers)) {
      this.register(name, () => this.createInstance(config.class), config.singleton)
    }

    // Register services
    for (const [name, config] of Object.entries(this.configuration.services)) {
      this.register(name, () => this.createServiceInstance(name, config), config.singleton)
    }
  }

  private createInstance(className: string): any {
    // In a real implementation, this would use reflection or a class registry
    // For this demo, we'll use a simple mapping
    const classMap: Record<string, any> = {
      WasmFileSystemProvider: () =>
        import("../providers/WasmFileSystemProvider").then((m) => new m.WasmFileSystemProvider()),
      MemoryFileSystemProvider: () =>
        import("../providers/MemoryFileSystemProvider").then((m) => new m.MemoryFileSystemProvider()),
      CacheService: () => import("../services/cache/CacheService").then((m) => new m.CacheService()),
      PerformanceMonitor: () =>
        import("../services/performance/PerformanceMonitor").then((m) => new m.PerformanceMonitor()),
    }

    const factory = classMap[className]
    if (!factory) {
      throw new Error(`Unknown class: ${className}`)
    }

    return factory()
  }

  private createServiceInstance(serviceName: string, config: any): any {
    // Resolve dependencies
    const dependencies = config.dependencies?.map((dep: string) => this.resolve(dep)) || []

    // Create service with dependencies
    const serviceMap: Record<string, any> = {
      fileSystemCalculator: () => {
        const { FileSystemCalculator } = require("../services/business/FileSystemCalculator")
        return new FileSystemCalculator(dependencies[0], dependencies[1])
      },
      fileSystemManipulator: () => {
        const { FileSystemManipulator } = require("../services/business/FileSystemManipulator")
        return new FileSystemManipulator(dependencies[0], dependencies[1])
      },
    }

    const factory = serviceMap[serviceName]
    if (!factory) {
      throw new Error(`Unknown service: ${serviceName}`)
    }

    return factory()
  }
}
