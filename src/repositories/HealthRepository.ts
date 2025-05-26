import { BaseRepository } from "./BaseRepository"

export interface HealthStatus {
  service: string
  status: "healthy" | "degraded" | "unhealthy" | "unknown"
  lastCheck: string
  responseTime: number
  error?: string
  details?: Record<string, any>
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy"
  services: number
  healthy: number
  unhealthy: number
  details: HealthStatus[]
}

export class HealthRepository extends BaseRepository<HealthStatus> {
  constructor(baseUrl: string) {
    super(baseUrl, "/v1/health")
  }

  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    return this.request<SystemHealth>("")
  }

  async checkService(serviceName: string): Promise<ApiResponse<HealthStatus>> {
    return this.request<HealthStatus>(`/${serviceName}`)
  }

  async refreshAllChecks(): Promise<ApiResponse<SystemHealth>> {
    return this.request<SystemHealth>("/refresh", { method: "POST" })
  }
}
