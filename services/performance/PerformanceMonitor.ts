import type { IPerformanceMonitor, PerformanceMetrics } from "../../types/interfaces"

export class PerformanceMonitor implements IPerformanceMonitor {
  private timers = new Map<string, number>()
  private metrics: Record<string, number[]> = {}

  startTimer(operation: string): string {
    const timerId = `${operation}_${Date.now()}_${Math.random()}`
    this.timers.set(timerId, performance.now())
    return timerId
  }

  endTimer(timerId: string): number {
    const startTime = this.timers.get(timerId)
    if (!startTime) {
      throw new Error(`Timer ${timerId} not found`)
    }

    const duration = performance.now() - startTime
    this.timers.delete(timerId)

    // Extract operation name from timer ID
    const operation = timerId.split("_")[0]
    this.recordMetric(operation, duration)

    return duration
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics[name]) {
      this.metrics[name] = []
    }
    this.metrics[name].push(value)

    // Keep only last 100 measurements to prevent memory bloat
    if (this.metrics[name].length > 100) {
      this.metrics[name] = this.metrics[name].slice(-100)
    }
  }

  getMetrics(): PerformanceMetrics {
    const averages: Record<string, number> = {}
    let totalOperations = 0

    for (const [name, values] of Object.entries(this.metrics)) {
      averages[name] = values.reduce((sum, val) => sum + val, 0) / values.length
      totalOperations += values.length
    }

    return {
      operations: { ...this.metrics },
      averages,
      totalOperations,
    }
  }

  reset(): void {
    this.timers.clear()
    this.metrics = {}
  }
}
