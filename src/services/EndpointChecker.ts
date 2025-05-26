import type { ILoggingService } from "./LoggingService"

export interface EndpointCheckResult {
  endpoint: string
  status: "healthy" | "unhealthy" | "timeout" | "error"
  responseTime: number
  statusCode?: number
  error?: string
  timestamp: number
}

export class EndpointChecker {
  private logger: ILoggingService
  private baseUrl: string

  constructor(logger: ILoggingService, baseUrl?: string) {
    this.logger = logger
    this.baseUrl = baseUrl || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
  }

  async checkAllEndpoints(): Promise<EndpointCheckResult[]> {
    this.logger.info("EndpointChecker", "Starting comprehensive endpoint check")

    const endpoints = [
      // Health endpoints
      "/api/health",
      "/api/v1/health",
      "/api/filesystem/health",
      "/api/export/health",
      "/api/php/health",

      // Main API endpoints
      "/api/v1/scenarios",
      "/api/deployment/check",

      // Error handling endpoints
      "/api/errors/delegate",

      // Page routes
      "/",
      "/health",
    ]

    const results: EndpointCheckResult[] = []

    for (const endpoint of endpoints) {
      try {
        const result = await this.checkEndpoint(endpoint)
        results.push(result)
        this.logger.info("EndpointChecker", `Endpoint ${endpoint} checked`, {
          status: result.status,
          responseTime: result.responseTime,
        })
      } catch (error) {
        const errorResult: EndpointCheckResult = {
          endpoint,
          status: "error",
          responseTime: 0,
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
        }
        results.push(errorResult)
        this.logger.error("EndpointChecker", `Endpoint ${endpoint} check failed`, { error })
      }
    }

    this.logger.info("EndpointChecker", "Endpoint check completed", {
      total: results.length,
      healthy: results.filter((r) => r.status === "healthy").length,
      unhealthy: results.filter((r) => r.status === "unhealthy").length,
      errors: results.filter((r) => r.status === "error").length,
    })

    return results
  }

  private async checkEndpoint(endpoint: string, timeout = 10000): Promise<EndpointCheckResult> {
    const startTime = performance.now()
    const url = new URL(endpoint, this.baseUrl).toString()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json, text/html, */*",
          "User-Agent": "EndpointChecker/1.0",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const responseTime = performance.now() - startTime

      return {
        endpoint,
        status: response.ok ? "healthy" : "unhealthy",
        responseTime: Math.round(responseTime),
        statusCode: response.status,
        timestamp: Date.now(),
      }
    } catch (error) {
      const responseTime = performance.now() - startTime

      if (error instanceof Error && error.name === "AbortError") {
        return {
          endpoint,
          status: "timeout",
          responseTime: Math.round(responseTime),
          error: "Request timed out",
          timestamp: Date.now(),
        }
      }

      return {
        endpoint,
        status: "error",
        responseTime: Math.round(responseTime),
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      }
    }
  }
}
