import type { ILoggingService } from "./LoggingService"

export interface ApiEndpointTest {
  endpoint: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  expectedStatus: number
  testData?: any
  headers?: Record<string, string>
  description: string
  category: string
}

export interface ApiTestResult {
  endpoint: string
  method: string
  status: "pass" | "fail" | "error" | "timeout"
  actualStatus?: number
  expectedStatus: number
  responseTime: number
  error?: string
  response?: any
  timestamp: number
  description: string
  category: string
}

export interface ApiVerificationReport {
  summary: {
    total: number
    passed: number
    failed: number
    errors: number
    timeouts: number
    averageResponseTime: number
  }
  categories: Record<
    string,
    {
      total: number
      passed: number
      failed: number
    }
  >
  results: ApiTestResult[]
  recommendations: string[]
  timestamp: number
}

export class ApiVerificationService {
  private logger: ILoggingService
  private baseUrl: string
  private timeout: number

  constructor(logger: ILoggingService, baseUrl?: string, timeout = 15000) {
    this.logger = logger
    this.baseUrl = baseUrl || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
    this.timeout = timeout
  }

  async verifyAllEndpoints(): Promise<ApiVerificationReport> {
    this.logger.info("ApiVerificationService", "Starting comprehensive API verification")

    const tests: ApiEndpointTest[] = [
      // Health Endpoints
      {
        endpoint: "/api/health",
        method: "GET",
        expectedStatus: 200,
        description: "Basic Node.js health check",
        category: "Health",
      },
      {
        endpoint: "/api/v1/health",
        method: "GET",
        expectedStatus: 200,
        description: "Advanced health monitoring with service details",
        category: "Health",
      },
      {
        endpoint: "/api/filesystem/health",
        method: "GET",
        expectedStatus: 200,
        description: "File system provider health check",
        category: "Health",
      },
      {
        endpoint: "/api/export/health",
        method: "GET",
        expectedStatus: 200,
        description: "Export service health check",
        category: "Health",
      },
      {
        endpoint: "/api/php/health",
        method: "GET",
        expectedStatus: 200,
        description: "PHP WASM service health check",
        category: "Health",
      },

      // Deployment Endpoints
      {
        endpoint: "/api/deployment/check",
        method: "GET",
        expectedStatus: 200,
        description: "Basic deployment health check",
        category: "Deployment",
      },
      {
        endpoint: "/api/deployment/readiness",
        method: "GET",
        expectedStatus: 200,
        description: "Comprehensive deployment readiness check",
        category: "Deployment",
      },

      // API v1 Endpoints
      {
        endpoint: "/api/v1/scenarios",
        method: "GET",
        expectedStatus: 200,
        description: "Get test scenarios",
        category: "API v1",
      },
      {
        endpoint: "/api/v1/scenarios",
        method: "POST",
        expectedStatus: 200,
        testData: {
          name: "Test Scenario",
          description: "API verification test scenario",
        },
        headers: {
          "Content-Type": "application/json",
        },
        description: "Create new test scenario",
        category: "API v1",
      },

      // Error Handling
      {
        endpoint: "/api/errors/delegate",
        method: "GET",
        expectedStatus: 200,
        description: "Error delegation endpoint",
        category: "Error Handling",
      },

      // File System Operations (these might return 404 for non-existent files, which is expected)
      {
        endpoint: "/api/filesystem/download/test-file",
        method: "GET",
        expectedStatus: 404, // Expected for non-existent file
        description: "File download endpoint (testing with non-existent file)",
        category: "File System",
      },

      // Invalid endpoints (should return 404)
      {
        endpoint: "/api/nonexistent",
        method: "GET",
        expectedStatus: 404,
        description: "Non-existent endpoint (should return 404)",
        category: "Error Handling",
      },
    ]

    const results: ApiTestResult[] = []

    for (const test of tests) {
      try {
        const result = await this.runTest(test)
        results.push(result)

        this.logger.info("ApiVerificationService", `Test completed: ${test.endpoint}`, {
          status: result.status,
          responseTime: result.responseTime,
          actualStatus: result.actualStatus,
        })
      } catch (error) {
        const errorResult: ApiTestResult = {
          endpoint: test.endpoint,
          method: test.method,
          status: "error",
          expectedStatus: test.expectedStatus,
          responseTime: 0,
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
          description: test.description,
          category: test.category,
        }
        results.push(errorResult)

        this.logger.error("ApiVerificationService", `Test failed: ${test.endpoint}`, { error })
      }
    }

    return this.generateReport(results)
  }

  private async runTest(test: ApiEndpointTest): Promise<ApiTestResult> {
    const startTime = performance.now()
    const url = new URL(test.endpoint, this.baseUrl).toString()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const requestOptions: RequestInit = {
        method: test.method,
        headers: {
          Accept: "application/json, text/html, */*",
          "User-Agent": "ApiVerificationService/1.0",
          ...test.headers,
        },
        signal: controller.signal,
      }

      if (test.testData && (test.method === "POST" || test.method === "PUT")) {
        requestOptions.body = JSON.stringify(test.testData)
        requestOptions.headers = {
          ...requestOptions.headers,
          "Content-Type": "application/json",
        }
      }

      const response = await fetch(url, requestOptions)
      clearTimeout(timeoutId)

      const responseTime = performance.now() - startTime
      let responseData: any

      try {
        const contentType = response.headers.get("content-type")
        if (contentType?.includes("application/json")) {
          responseData = await response.json()
        } else {
          responseData = await response.text()
        }
      } catch {
        responseData = null
      }

      const status = response.status === test.expectedStatus ? "pass" : "fail"

      return {
        endpoint: test.endpoint,
        method: test.method,
        status,
        actualStatus: response.status,
        expectedStatus: test.expectedStatus,
        responseTime: Math.round(responseTime),
        response: responseData,
        timestamp: Date.now(),
        description: test.description,
        category: test.category,
      }
    } catch (error) {
      const responseTime = performance.now() - startTime

      if (error instanceof Error && error.name === "AbortError") {
        return {
          endpoint: test.endpoint,
          method: test.method,
          status: "timeout",
          expectedStatus: test.expectedStatus,
          responseTime: Math.round(responseTime),
          error: "Request timed out",
          timestamp: Date.now(),
          description: test.description,
          category: test.category,
        }
      }

      return {
        endpoint: test.endpoint,
        method: test.method,
        status: "error",
        expectedStatus: test.expectedStatus,
        responseTime: Math.round(responseTime),
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        description: test.description,
        category: test.category,
      }
    }
  }

  private generateReport(results: ApiTestResult[]): ApiVerificationReport {
    const summary = {
      total: results.length,
      passed: results.filter((r) => r.status === "pass").length,
      failed: results.filter((r) => r.status === "fail").length,
      errors: results.filter((r) => r.status === "error").length,
      timeouts: results.filter((r) => r.status === "timeout").length,
      averageResponseTime: Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length),
    }

    const categories: Record<string, { total: number; passed: number; failed: number }> = {}

    results.forEach((result) => {
      if (!categories[result.category]) {
        categories[result.category] = { total: 0, passed: 0, failed: 0 }
      }
      categories[result.category].total++
      if (result.status === "pass") {
        categories[result.category].passed++
      } else {
        categories[result.category].failed++
      }
    })

    const recommendations: string[] = []

    if (summary.failed > 0) {
      recommendations.push(`${summary.failed} endpoints returned unexpected status codes`)
    }
    if (summary.errors > 0) {
      recommendations.push(`${summary.errors} endpoints encountered errors`)
    }
    if (summary.timeouts > 0) {
      recommendations.push(
        `${summary.timeouts} endpoints timed out - consider increasing timeout or optimizing performance`,
      )
    }
    if (summary.averageResponseTime > 1000) {
      recommendations.push("Average response time is high - consider performance optimization")
    }
    if (summary.passed === summary.total) {
      recommendations.push("All endpoints are functioning correctly!")
    }

    this.logger.info("ApiVerificationService", "API verification completed", {
      summary,
      categories,
      recommendations: recommendations.length,
    })

    return {
      summary,
      categories,
      results,
      recommendations,
      timestamp: Date.now(),
    }
  }
}
