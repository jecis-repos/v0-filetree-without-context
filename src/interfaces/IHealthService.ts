export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: Date
  checks: HealthCheck[]
  metadata?: Record<string, any>
}

export interface HealthCheck {
  name: string
  status: "pass" | "fail" | "warn"
  message?: string
  duration?: number
  metadata?: Record<string, any>
}

export interface IHealthService {
  checkHealth(): Promise<HealthStatus>
  checkComponent(componentName: string): Promise<HealthCheck>
  registerHealthCheck(name: string, check: () => Promise<HealthCheck>): void
  getHealthHistory(): HealthStatus[]
}
