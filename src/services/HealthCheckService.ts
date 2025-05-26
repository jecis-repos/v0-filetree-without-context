export interface HealthCheckConfig {
  name: string
  endpoint: string
  timeout: number
  interval: number
  retries: number
}

export interface HealthCheckResult {
  name: string
  status: "healthy" | "unhealthy" | "unknown"
  responseTime: number
  error?: string
  timestamp: number
}

export class HealthCheckService {
  private healthChecks: Map<string, HealthCheckConfig> = new Map()
  private results: Map<string, HealthCheckResult> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    // Initialize with basic health checks
  }

  addHealthCheck(config: HealthCheckConfig): void {
    this.healthChecks.set(config.name, config)
    this.startHealthCheck(config)
  }

  removeHealthCheck(name: string): void {
    const interval = this.intervals.get(name)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(name)
    }
    this.healthChecks.delete(name)
    this.results.delete(name)
  }

  getHealthStatus(name: string): HealthCheckResult | undefined {
    return this.results.get(name)
  }

  getAllHealthStatuses(): HealthCheckResult[] {
    return Array.from(this.results.values())
  }

  private startHealthCheck(config: HealthCheckConfig): void {
    // Clear existing interval if any
    const existingInterval = this.intervals.get(config.name)
    if (existingInterval) {
      clearInterval(existingInterval)
    }

    // Perform initial check
    this.performHealthCheck(config)

    // Set up recurring checks
    const interval = setInterval(() => {
      this.performHealthCheck(config)
    }, config.interval)

    this.intervals.set(config.name, interval)
  }

  private async performHealthCheck(config: HealthCheckConfig): Promise<void> {
    const startTime = Date.now()
    let attempt = 0

    while (attempt < config.retries) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), config.timeout)

        const response = await fetch(config.endpoint, {
          signal: controller.signal,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        clearTimeout(timeoutId)

        const responseTime = Date.now() - startTime

        if (response.ok) {
          this.results.set(config.name, {
            name: config.name,
            status: "healthy",
            responseTime,
            timestamp: Date.now(),
          })
          return
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (error) {
        attempt++

        if (attempt >= config.retries) {
          const responseTime = Date.now() - startTime
          this.results.set(config.name, {
            name: config.name,
            status: "unhealthy",
            responseTime,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: Date.now(),
          })
        } else {
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    }
  }

  destroy(): void {
    // Clean up all intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval)
    }
    this.intervals.clear()
    this.healthChecks.clear()
    this.results.clear()
  }
}
