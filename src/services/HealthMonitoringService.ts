import { HealthCheckService } from "./HealthCheckService"

export class HealthMonitoringService extends HealthCheckService {
  constructor() {
    super()

    // Core API Health Checks
    this.addHealthCheck({
      name: "main-api",
      endpoint: "/api/health",
      timeout: 5000,
      interval: 30000,
      retries: 3,
    })

    // PHP-CGI WASM Health Check
    this.addHealthCheck({
      name: "php-cgi-wasm",
      endpoint: "/api/php/health",
      timeout: 5000,
      interval: 30000,
      retries: 3,
    })

    // File System Health Check
    this.addHealthCheck({
      name: "filesystem",
      endpoint: "/api/filesystem/health",
      timeout: 3000,
      interval: 60000,
      retries: 2,
    })

    // Image Export Service Health Check
    this.addHealthCheck({
      name: "image-export",
      endpoint: "/api/export/health",
      timeout: 3000,
      interval: 60000,
      retries: 2,
    })

    // Scenarios API Health Check
    this.addHealthCheck({
      name: "scenarios-api",
      endpoint: "/api/v1/scenarios",
      timeout: 5000,
      interval: 45000,
      retries: 3,
    })
  }

  // Get overall system health
  getSystemHealth(): {
    status: "healthy" | "degraded" | "unhealthy"
    services: number
    healthy: number
    unhealthy: number
    details: any[]
  } {
    const allStatuses = this.getAllHealthStatuses()
    const healthy = allStatuses.filter((s) => s.status === "healthy").length
    const unhealthy = allStatuses.filter((s) => s.status === "unhealthy").length

    let status: "healthy" | "degraded" | "unhealthy" = "healthy"

    if (unhealthy > 0) {
      status = unhealthy >= allStatuses.length / 2 ? "unhealthy" : "degraded"
    }

    return {
      status,
      services: allStatuses.length,
      healthy,
      unhealthy,
      details: allStatuses,
    }
  }
}
