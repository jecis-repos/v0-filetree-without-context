export interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: number
  success: boolean
  metadata?: Record<string, any>
}

export interface IPerformanceMonitor {
  startTimer(operation: string): string
  endTimer(timerId: string, success?: boolean, metadata?: Record<string, any>): void
  getMetrics(): PerformanceMetric[]
  getAverageTime(operation: string): number
  clearMetrics(): void
}
