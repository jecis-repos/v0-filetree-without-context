import type { IPerformanceMonitor, PerformanceMetric } from "../interfaces/IPerformanceMonitor"

export class PerformanceMonitor implements IPerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private activeTimers = new Map<string, { operation: string; startTime: number }>()
  private maxMetrics: number

  constructor(maxMetrics = 1000) {
    this.maxMetrics = maxMetrics
  }

  startTimer(operation: string): string {
    const timerId = `${operation}_${Date.now()}_${Math.random()}`
    this.activeTimers.set(timerId, {
      operation,
      startTime: performance.now(),
    })
    return timerId
  }

  endTimer(timerId: string, success = true, metadata?: Record<string, any>): void {
    const timer = this.activeTimers.get(timerId)
    if (!timer) {
      console.warn(`Timer not found: ${timerId}`)
      return
    }

    const duration = performance.now() - timer.startTime
    const metric: PerformanceMetric = {
      operation: timer.operation,
      duration,
      timestamp: Date.now(),
      success,
      metadata,
    }

    this.metrics.push(metric)
    this.activeTimers.delete(timerId)

    // Maintain max metrics limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  getAverageTime(operation: string): number {
    const operationMetrics = this.metrics.filter((m) => m.operation === operation && m.success)
    if (operationMetrics.length === 0) return 0

    const totalTime = operationMetrics.reduce((sum, metric) => sum + metric.duration, 0)
    return totalTime / operationMetrics.length
  }

  clearMetrics(): void {
    this.metrics = []
    this.activeTimers.clear()
  }

  getOperationStats(operation: string) {
    const operationMetrics = this.metrics.filter((m) => m.operation === operation)
    const successfulMetrics = operationMetrics.filter((m) => m.success)

    if (operationMetrics.length === 0) {
      return {
        count: 0,
        successRate: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
      }
    }

    const times = successfulMetrics.map((m) => m.duration)

    return {
      count: operationMetrics.length,
      successRate: successfulMetrics.length / operationMetrics.length,
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
    }
  }
}
