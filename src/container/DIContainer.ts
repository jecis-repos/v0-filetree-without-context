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
    // In a real implementation, this would use dynamic imports
    // For demo purposes, we'll use a simple mapping
    const implementations: Record<string, any> = {
      WasmFileSystemProvider: WasmFileSystemProvider,
      MemoryFileSystemProvider: MemoryFileSystemProvider,
      CacheService: CacheService,
      FileSystemCalculator: FileSystemCalculator,
      PerformanceMonitor: PerformanceMonitor,
    }

    return implementations[implementation]
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

// Import implementations (these would be actual imports in real code)
declare const WasmFileSystemProvider: any
declare const MemoryFileSystemProvider: any
declare const CacheService: any
declare const FileSystemCalculator: any
declare const PerformanceMonitor: any
