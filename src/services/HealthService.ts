import { HealthRepository } from "../repositories/HealthRepository"
import { healthActions } from "../store/healthStore"
import { clientConfig } from "../config/client-config"

export class HealthService {
  private repository: HealthRepository
  private refreshInterval: NodeJS.Timeout | null = null

  constructor() {
    // Use the correct configuration structure
    this.repository = new HealthRepository(clientConfig.apiBaseUrl)
  }

  async refreshSystemHealth(): Promise<void> {
    try {
      healthActions.setLoading(true)

      const response = await this.repository.getSystemHealth()

      if (response.success && response.data) {
        healthActions.setSystemHealth(response.data)
      } else {
        healthActions.setError(response.error || "Failed to fetch health status")
      }
    } catch (error) {
      healthActions.setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      healthActions.setLoading(false)
    }
  }

  async checkSpecificService(serviceName: string): Promise<void> {
    try {
      const response = await this.repository.checkService(serviceName)

      if (response.success) {
        // Update specific service in the store
        await this.refreshSystemHealth()
      } else {
        healthActions.setError(response.error || `Failed to check ${serviceName}`)
      }
    } catch (error) {
      healthActions.setError(error instanceof Error ? error.message : "Unknown error")
    }
  }

  startAutoRefresh(): void {
    this.stopAutoRefresh()

    // Initial load
    this.refreshSystemHealth()

    // Set up interval
    this.refreshInterval = setInterval(() => {
      this.refreshSystemHealth()
    }, clientConfig.performance.healthCheckInterval)
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
  }

  dispose(): void {
    this.stopAutoRefresh()
  }
}
