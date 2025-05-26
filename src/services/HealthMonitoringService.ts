import type { ILoggingService } from "./LoggingService"
import type { IPerformanceMonitor } from "../interfaces/IPerformanceMonitor"

export interface HealthCheck {
  name: string
  endpoint?: string
  checkFunction?: () => Promise<HealthCheckResult>
  timeout: number
  interval: number
  retries: number
}

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy"
  responseTime: number
  details?: Record<string, any>
  error?: string
  timestamp: Date
}

export interface ServiceHealth {
  service: string
  status: "healthy" | "degraded" | "unhealthy" | "unknown"
  lastCheck: Date
  responseTime?: number
  uptime?: number
  error?: string
  details?: Record<string, any>
  history: HealthCheckResult[]
}

export class HealthMonitoringService {
  private healthChecks = new Map<string, HealthCheck>()
  private serviceHealth = new Map<string, ServiceHealth>()
  private intervals = new Map<string, NodeJS.Timeout>()

  constructor(
    private logger: ILoggingService,
    private performanceMonitor: IPerformanceMonitor,
  ) {
    this.logger.info("Health", "HealthMonitoringService initialized")
    this.setupDefaultHealthChecks()
  }

  private setupDefaultHealthChecks(): void {
    // PHP-CGI WASM Health Check
    this.addHealthCheck({
      name: "php-cgi-wasm",
      checkFunction: async () => {
        const startTime = performance.now()
        try {
          const response = await fetch("/api/php/health", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "health_check" }),
          })

          const endTime = performance.now()
          const responseTime = endTime - startTime

          if (response.ok) {
            const data = await response.json()
            return {
              status: data.status === "ok" ? "healthy" : "degraded",
              responseTime,
              details: {
                phpVersion: data.phpVersion,
                wasmSupport: data.wasmSupport,
                memoryUsage: data.memoryUsage,
                extensions: data.extensions,
              },
              timestamp: new Date(),
            }
          } else {
            return {
              status: "unhealthy",
              responseTime,
              error: `HTTP ${response.status}: ${response.statusText}`,
              timestamp: new Date(),
            }
          }
        } catch (error) {
          return {
            status: "unhealthy",
            responseTime: performance.now() - startTime,
            error: error.message,
            timestamp: new Date(),
          }
        }
      },
      timeout: 5000,
      interval: 30000,
      retries: 3,
    })

    // WebAssembly Health Check
    this.addHealthCheck({
      name: "webassembly",
      checkFunction: async () => {
        const startTime = performance.now()
        try {
          // Check WebAssembly support
          if (typeof WebAssembly === "undefined") {
            return {
              status: "unhealthy",
              responseTime: performance.now() - startTime,
              error: "WebAssembly not supported",
              timestamp: new Date(),
            }
          }

          // Test basic WASM functionality
          const wasmCode = new Uint8Array([
            0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f, 0x03,
            0x02, 0x01, 0x00, 0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00, 0x0a, 0x09, 0x01, 0x07, 0x00, 0x20,
            0x00, 0x20, 0x01, 0x6a, 0x0b,
          ])

          const wasmModule = await WebAssembly.instantiate(wasmCode)
          const addFunction = wasmModule.instance.exports.add as Function
          const result = addFunction(2, 3)

          const endTime = performance.now()

          return {
            status: result === 5 ? "healthy" : "degraded",
            responseTime: endTime - startTime,
            details: {
              wasmSupported: true,
              testResult: result,
              memoryPages: wasmModule.instance.exports.memory
                ? (wasmModule.instance.exports.memory as WebAssembly.Memory).buffer.byteLength / 65536
                : 0,
            },
            timestamp: new Date(),
          }
        } catch (error) {
          return {
            status: "unhealthy",
            responseTime: performance.now() - startTime,
            error: error.message,
            timestamp: new Date(),
          }
        }
      },
      timeout: 3000,
      interval: 60000,
      retries: 2,
    })

    // Node.js Backend Health Check
    this.addHealthCheck({
      name: "nodejs-backend",
      endpoint: "/api/health",
      timeout: 2000,
      interval: 15000,
      retries: 3,
    })

    // File System Provider Health Check
    this.addHealthCheck({
      name: "filesystem-provider",
      checkFunction: async () => {
        const startTime = performance.now()
        try {
          // This would be injected via DI in real implementation
          const provider = (window as any).__fileSystemProvider
          if (!provider) {
            return {
              status: "unhealthy",
              responseTime: performance.now() - startTime,
              error: "File system provider not available",
              timestamp: new Date(),
            }
          }

          await provider.getStats()
          const endTime = performance.now()

          return {
            status: "healthy",
            responseTime: endTime - startTime,
            details: {
              providerType: provider.name,
              initialized: true,
            },
            timestamp: new Date(),
          }
        } catch (error) {
          return {
            status: "unhealthy",
            responseTime: performance.now() - startTime,
            error: error.message,
            timestamp: new Date(),
          }
        }
      },
      timeout: 1000,
      interval: 20000,
      retries: 2,
    })

    // Image Export Service Health Check
    this.addHealthCheck({
      name: "image-export",
      checkFunction: async () => {
        const startTime = performance.now()
        try {
          const response = await fetch("/api/export/health", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          })

          const endTime = performance.now()
          const responseTime = endTime - startTime

          if (response.ok) {
            const data = await response.json()
            return {
              status: data.status === "healthy" ? "healthy" : "degraded",
              responseTime,
              details: data.details,
              timestamp: new Date(),
            }
          } else {
            return {
              status: "unhealthy",
              responseTime,
              error: `HTTP ${response.status}`,
              timestamp: new Date(),
            }
          }
        } catch (error) {
          return {
            status: "unhealthy",
            responseTime: performance.now() - startTime,
            error: error.message,
            timestamp: new Date(),
          }
        }
      },
      timeout: 3000,
      interval: 45000,
      retries: 2,
    })
  }

  addHealthCheck(check: HealthCheck): void {
    this.healthChecks.set(check.name, check)
    this.serviceHealth.set(check.name, {
      service: check.name,
      status: "unknown",
      lastCheck: new Date(),
      history: [],
    })

    this.logger.info("Health", "Health check added", { service: check.name })
  }

  removeHealthCheck(name: string): void {
    this.healthChecks.delete(name)
    this.serviceHealth.delete(name)

    const interval = this.intervals.get(name)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(name)
    }

    this.logger.info("Health", "Health check removed", { service: name })
  }

  async runHealthCheck(name: string): Promise<HealthCheckResult> {
    const check = this.healthChecks.get(name)
    if (!check) {
      throw new Error(`Health check not found: ${name}`)
    }

    const timerId = this.performanceMonitor.startTimer(`health_check_${name}`)

    try {
      let result: HealthCheckResult

      if (check.checkFunction) {
        result = await Promise.race([
          check.checkFunction(),
          new Promise<HealthCheckResult>((_, reject) =>
            setTimeout(() => reject(new Error("Health check timeout")), check.timeout),
          ),
        ])
      } else if (check.endpoint) {
        result = await this.runEndpointHealthCheck(check)
      } else {
        throw new Error("Health check must have either checkFunction or endpoint")
      }

      // Update service health
      const serviceHealth = this.serviceHealth.get(name)!
      serviceHealth.status = result.status
      serviceHealth.lastCheck = result.timestamp
      serviceHealth.responseTime = result.responseTime
      serviceHealth.error = result.error
      serviceHealth.details = result.details
      serviceHealth.history.push(result)

      // Keep only last 100 history entries
      if (serviceHealth.history.length > 100) {
        serviceHealth.history = serviceHealth.history.slice(-100)
      }

      this.performanceMonitor.endTimer(timerId, result.status === "healthy")
      this.logger.debug("Health", "Health check completed", {
        service: name,
        status: result.status,
        responseTime: result.responseTime,
      })

      return result
    } catch (error) {
      const result: HealthCheckResult = {
        status: "unhealthy",
        responseTime: 0,
        error: error.message,
        timestamp: new Date(),
      }

      const serviceHealth = this.serviceHealth.get(name)!
      serviceHealth.status = "unhealthy"
      serviceHealth.lastCheck = new Date()
      serviceHealth.error = error.message
      serviceHealth.history.push(result)

      this.performanceMonitor.endTimer(timerId, false, { error: error.message })
      this.logger.error("Health", "Health check failed", { service: name, error: error.message })

      return result
    }
  }

  private async runEndpointHealthCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const startTime = performance.now()

    try {
      const response = await fetch(check.endpoint!, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      const endTime = performance.now()
      const responseTime = endTime - startTime

      if (response.ok) {
        const data = await response.json()
        return {
          status: data.status === "healthy" || data.status === "ok" ? "healthy" : "degraded",
          responseTime,
          details: data,
          timestamp: new Date(),
        }
      } else {
        return {
          status: "unhealthy",
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
          timestamp: new Date(),
        }
      }
    } catch (error) {
      return {
        status: "unhealthy",
        responseTime: performance.now() - startTime,
        error: error.message,
        timestamp: new Date(),
      }
    }
  }

  startMonitoring(): void {
    for (const [name, check] of this.healthChecks) {
      // Run initial check
      this.runHealthCheck(name)

      // Set up interval
      const interval = setInterval(() => {
        this.runHealthCheck(name)
      }, check.interval)

      this.intervals.set(name, interval)
    }

    this.logger.info("Health", "Health monitoring started", {
      services: Array.from(this.healthChecks.keys()),
    })
  }

  stopMonitoring(): void {
    for (const [name, interval] of this.intervals) {
      clearInterval(interval)
    }
    this.intervals.clear()

    this.logger.info("Health", "Health monitoring stopped")
  }

  getServiceHealth(name: string): ServiceHealth | undefined {
    return this.serviceHealth.get(name)
  }

  getAllServiceHealth(): ServiceHealth[] {
    return Array.from(this.serviceHealth.values())
  }

  getOverallHealth(): "healthy" | "degraded" | "unhealthy" {
    const services = Array.from(this.serviceHealth.values())

    if (services.length === 0) return "unknown" as any

    const unhealthyCount = services.filter((s) => s.status === "unhealthy").length
    const degradedCount = services.filter((s) => s.status === "degraded").length

    if (unhealthyCount > 0) return "unhealthy"
    if (degradedCount > 0) return "degraded"
    return "healthy"
  }

  exportHealthData(): string {
    const data = {
      timestamp: new Date().toISOString(),
      overallHealth: this.getOverallHealth(),
      services: this.getAllServiceHealth(),
      summary: {
        totalServices: this.serviceHealth.size,
        healthyServices: Array.from(this.serviceHealth.values()).filter((s) => s.status === "healthy").length,
        degradedServices: Array.from(this.serviceHealth.values()).filter((s) => s.status === "degraded").length,
        unhealthyServices: Array.from(this.serviceHealth.values()).filter((s) => s.status === "unhealthy").length,
      },
    }

    return JSON.stringify(data, null, 2)
  }
}
