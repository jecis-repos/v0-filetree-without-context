import type { BenchmarkScenario, BenchmarkResult, HealthStatus } from "../components/MetricsDashboard"
import type { ILoggingService } from "./LoggingService"

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
  version: string
}

export interface ApiDocumentation {
  openapi: string
  info: {
    title: string
    version: string
    description: string
  }
  paths: Record<string, any>
  components: Record<string, any>
}

export class PublicApiService {
  private baseUrl: string
  private version = "1.0.0"

  constructor(
    private logger: ILoggingService,
    baseUrl = "/api/v1",
  ) {
    this.baseUrl = baseUrl
    this.logger.info("PublicAPI", "Public API service initialized", { baseUrl, version: this.version })
  }

  // Health endpoints
  async getHealth(): Promise<ApiResponse<HealthStatus[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      const data = await response.json()

      return {
        success: true,
        data: data.services,
        timestamp: new Date().toISOString(),
        version: this.version,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        version: this.version,
      }
    }
  }

  // Scenarios endpoints
  async getScenarios(): Promise<ApiResponse<BenchmarkScenario[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/scenarios`)
      const data = await response.json()

      return {
        success: true,
        data: data.scenarios,
        timestamp: new Date().toISOString(),
        version: this.version,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        version: this.version,
      }
    }
  }

  async runScenario(scenarioId: string, options?: any): Promise<ApiResponse<BenchmarkResult>> {
    try {
      const response = await fetch(`${this.baseUrl}/scenarios/${scenarioId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options || {}),
      })
      const data = await response.json()

      return {
        success: true,
        data: data.result,
        timestamp: new Date().toISOString(),
        version: this.version,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        version: this.version,
      }
    }
  }

  // Results endpoints
  async getResults(filters?: { scenarioId?: string; provider?: string; limit?: number }): Promise<
    ApiResponse<BenchmarkResult[]>
  > {
    try {
      const params = new URLSearchParams()
      if (filters?.scenarioId) params.append("scenarioId", filters.scenarioId)
      if (filters?.provider) params.append("provider", filters.provider)
      if (filters?.limit) params.append("limit", filters.limit.toString())

      const response = await fetch(`${this.baseUrl}/results?${params}`)
      const data = await response.json()

      return {
        success: true,
        data: data.results,
        timestamp: new Date().toISOString(),
        version: this.version,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        version: this.version,
      }
    }
  }

  // Export endpoints
  async exportData(format: "json" | "csv" | "xml" = "json"): Promise<ApiResponse<string>> {
    try {
      const response = await fetch(`${this.baseUrl}/export?format=${format}`)
      const data = await response.text()

      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
        version: this.version,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        version: this.version,
      }
    }
  }

  // Documentation endpoints
  async getDocumentation(): Promise<ApiResponse<ApiDocumentation>> {
    const documentation: ApiDocumentation = {
      openapi: "3.0.0",
      info: {
        title: "File Explorer Metrics API",
        version: this.version,
        description: "REST API for file explorer benchmarking and health monitoring",
      },
      paths: {
        "/health": {
          get: {
            summary: "Get health status of all services",
            responses: {
              "200": {
                description: "Health status retrieved successfully",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/HealthStatus" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/scenarios": {
          get: {
            summary: "Get all benchmark scenarios",
            responses: {
              "200": {
                description: "Scenarios retrieved successfully",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/BenchmarkScenario" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/scenarios/{scenarioId}/run": {
          post: {
            summary: "Run a specific benchmark scenario",
            parameters: [
              {
                name: "scenarioId",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      iterations: { type: "number" },
                      providers: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Scenario executed successfully",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: { $ref: "#/components/schemas/BenchmarkResult" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/results": {
          get: {
            summary: "Get benchmark results",
            parameters: [
              {
                name: "scenarioId",
                in: "query",
                schema: { type: "string" },
              },
              {
                name: "provider",
                in: "query",
                schema: { type: "string" },
              },
              {
                name: "limit",
                in: "query",
                schema: { type: "number" },
              },
            ],
            responses: {
              "200": {
                description: "Results retrieved successfully",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/BenchmarkResult" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/export": {
          get: {
            summary: "Export all data",
            parameters: [
              {
                name: "format",
                in: "query",
                schema: { type: "string", enum: ["json", "csv", "xml"] },
              },
            ],
            responses: {
              "200": {
                description: "Data exported successfully",
              },
            },
          },
        },
      },
      components: {
        schemas: {
          HealthStatus: {
            type: "object",
            properties: {
              service: { type: "string" },
              status: { type: "string", enum: ["healthy", "degraded", "unhealthy", "unknown"] },
              lastCheck: { type: "string", format: "date-time" },
              responseTime: { type: "number" },
              error: { type: "string" },
              details: { type: "object" },
            },
          },
          BenchmarkScenario: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              config: {
                type: "object",
                properties: {
                  outputPaths: { type: "array", items: { type: "string" } },
                  depth: { type: "number" },
                  breadth: { type: "number" },
                  fileTypes: { type: "array", items: { type: "string" } },
                  operations: { type: "array", items: { type: "string" } },
                  iterations: { type: "number" },
                  providers: { type: "array", items: { type: "string" } },
                },
              },
              enabled: { type: "boolean" },
              lastRun: { type: "string", format: "date-time" },
            },
          },
          BenchmarkResult: {
            type: "object",
            properties: {
              scenarioId: { type: "string" },
              provider: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
              duration: { type: "number" },
              success: { type: "boolean" },
              metrics: {
                type: "object",
                properties: {
                  totalFiles: { type: "number" },
                  totalDirectories: { type: "number" },
                  averageResponseTime: { type: "number" },
                  memoryUsage: { type: "number" },
                  errorRate: { type: "number" },
                },
              },
            },
          },
        },
      },
    }

    return {
      success: true,
      data: documentation,
      timestamp: new Date().toISOString(),
      version: this.version,
    }
  }

  async generateExamples(): Promise<ApiResponse<Record<string, any>>> {
    const examples = {
      healthCheck: {
        description: "Check health status of all services",
        request: {
          method: "GET",
          url: `${this.baseUrl}/health`,
          headers: {
            "Content-Type": "application/json",
          },
        },
        response: {
          success: true,
          data: [
            {
              service: "php-cgi-wasm",
              status: "healthy",
              lastCheck: "2024-01-15T10:30:00Z",
              responseTime: 45.2,
              details: {
                phpVersion: "8.2.0",
                wasmSupport: true,
                memoryUsage: "12MB",
              },
            },
          ],
          timestamp: "2024-01-15T10:30:00Z",
          version: this.version,
        },
      },
      runScenario: {
        description: "Run a benchmark scenario",
        request: {
          method: "POST",
          url: `${this.baseUrl}/scenarios/small-project/run`,
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            iterations: 10,
            providers: ["Memory", "WASM"],
          },
        },
        response: {
          success: true,
          data: {
            scenarioId: "small-project",
            provider: "Memory",
            timestamp: "2024-01-15T10:35:00Z",
            duration: 1250.5,
            success: true,
            metrics: {
              totalFiles: 45,
              totalDirectories: 12,
              averageResponseTime: 25.3,
              memoryUsage: 8192000,
              errorRate: 0.02,
            },
          },
          timestamp: "2024-01-15T10:35:00Z",
          version: this.version,
        },
      },
      exportData: {
        description: "Export benchmark data",
        request: {
          method: "GET",
          url: `${this.baseUrl}/export?format=json`,
          headers: {
            "Content-Type": "application/json",
          },
        },
        response: {
          success: true,
          data: '{ "scenarios": [...], "results": [...] }',
          timestamp: "2024-01-15T10:40:00Z",
          version: this.version,
        },
      },
    }

    return {
      success: true,
      data: examples,
      timestamp: new Date().toISOString(),
      version: this.version,
    }
  }
}
