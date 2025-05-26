import { DIContainer, type ContainerConfiguration } from "../../container/DIContainer"
import { CacheService } from "../../services/CacheService"
import { PerformanceMonitor } from "../../services/PerformanceMonitor"

// Mock implementations for testing
class MockService {
  constructor(
    public dependency?: any,
    public config?: any,
  ) {}
}

class MockDependency {
  getValue() {
    return "dependency-value"
  }
}

describe("DIContainer", () => {
  let container: DIContainer

  beforeEach(() => {
    container = new DIContainer()
  })

  afterEach(() => {
    container.dispose()
  })

  describe("Service Registration", () => {
    test("should register and resolve factory services", () => {
      container.registerFactory("TestService", () => new MockService(), "singleton")

      const service = container.resolve<MockService>("TestService")
      expect(service).toBeInstanceOf(MockService)
    })

    test("should register and resolve instance services", () => {
      const instance = new MockService()
      container.registerInstance("TestService", instance)

      const resolved = container.resolve<MockService>("TestService")
      expect(resolved).toBe(instance)
    })

    test("should maintain singleton lifecycle", () => {
      container.registerFactory("TestService", () => new MockService(), "singleton")

      const service1 = container.resolve<MockService>("TestService")
      const service2 = container.resolve<MockService>("TestService")

      expect(service1).toBe(service2)
    })

    test("should create new instances for transient services", () => {
      container.registerFactory("TestService", () => new MockService(), "transient")

      const service1 = container.resolve<MockService>("TestService")
      const service2 = container.resolve<MockService>("TestService")

      expect(service1).not.toBe(service2)
    })
  })

  describe("Configuration Loading", () => {
    test("should load services from configuration", () => {
      const config: ContainerConfiguration = {
        services: [
          {
            name: "ICacheService",
            implementation: "CacheService",
            lifetime: "singleton",
            dependencies: [],
            configuration: { maxSize: 100 },
          },
        ],
      }

      // Mock the implementation class getter
      const originalGetImplementationClass = (container as any).getImplementationClass
      ;(container as any).getImplementationClass = jest.fn().mockReturnValue(CacheService)

      container.loadConfiguration(config)

      expect(container.getRegisteredServices()).toContain("ICacheService")

      // Restore original method
      ;(container as any).getImplementationClass = originalGetImplementationClass
    })
  })

  describe("Dependency Resolution", () => {
    test("should resolve dependencies in correct order", () => {
      container.registerFactory("Dependency", () => new MockDependency())
      container.registerFactory("Service", () => {
        const dep = container.resolve<MockDependency>("Dependency")
        return new MockService(dep)
      })

      const service = container.resolve<MockService>("Service")
      expect(service.dependency).toBeInstanceOf(MockDependency)
      expect(service.dependency.getValue()).toBe("dependency-value")
    })

    test("should detect circular dependencies", () => {
      container.registerFactory("ServiceA", () => {
        const serviceB = container.resolve("ServiceB")
        return { serviceB }
      })

      container.registerFactory("ServiceB", () => {
        const serviceA = container.resolve("ServiceA")
        return { serviceA }
      })

      expect(() => container.resolve("ServiceA")).toThrow("Circular dependency detected")
    })
  })

  describe("Error Handling", () => {
    test("should throw error for unregistered service", () => {
      expect(() => container.resolve("UnregisteredService")).toThrow("Service not registered")
    })

    test("should handle resolution errors gracefully", () => {
      container.registerFactory("FailingService", () => {
        throw new Error("Service creation failed")
      })

      expect(() => container.resolve("FailingService")).toThrow("Service creation failed")
    })
  })

  describe("Container Management", () => {
    test("should list registered services", () => {
      container.registerFactory("Service1", () => new MockService())
      container.registerFactory("Service2", () => new MockService())

      const services = container.getRegisteredServices()
      expect(services).toContain("Service1")
      expect(services).toContain("Service2")
      expect(services).toContain("DIContainer") // Self-registered
    })

    test("should dispose all services on container disposal", () => {
      const mockDispose = jest.fn()
      const serviceWithDispose = { dispose: mockDispose }

      container.registerInstance("DisposableService", serviceWithDispose)
      container.dispose()

      expect(mockDispose).toHaveBeenCalled()
    })
  })

  describe("Real Service Integration", () => {
    test("should resolve CacheService with configuration", () => {
      container.registerFactory("CacheService", () => new CacheService(100, 5000, "LRU"), "singleton")

      const cache = container.resolve<CacheService>("CacheService")
      expect(cache).toBeInstanceOf(CacheService)

      cache.set("test", "value")
      expect(cache.get("test")).toBe("value")
    })

    test("should resolve PerformanceMonitor", () => {
      container.registerFactory("PerformanceMonitor", () => new PerformanceMonitor(500), "singleton")

      const monitor = container.resolve<PerformanceMonitor>("PerformanceMonitor")
      expect(monitor).toBeInstanceOf(PerformanceMonitor)

      const timerId = monitor.startTimer("test-operation")
      monitor.endTimer(timerId, true)

      expect(monitor.getMetrics()).toHaveLength(1)
    })
  })
})
