/**
 * Comprehensive Error Tracking Service
 * Handles all types of errors and provides delegation capabilities
 */

export interface ErrorContext {
  userId?: string
  sessionId?: string
  component?: string
  action?: string
  metadata?: Record<string, any>
  timestamp: Date
  userAgent?: string
  url?: string
  stackTrace?: string
}

export interface ErrorReport {
  id: string
  type: "runtime" | "validation" | "network" | "user" | "system"
  severity: "low" | "medium" | "high" | "critical"
  message: string
  error?: Error
  context: ErrorContext
  resolved: boolean
  delegated: boolean
  delegationReason?: string
}

export interface ErrorDelegationRequest {
  errorId: string
  reason: string
  expectedResolution?: string
  priority: "low" | "medium" | "high" | "urgent"
  userDescription?: string
}

export class ErrorTrackingService {
  private errors: Map<string, ErrorReport> = new Map()
  private errorListeners: ((error: ErrorReport) => void)[] = []
  private delegationQueue: ErrorDelegationRequest[] = []
  private sessionId: string
  private maxErrors = 1000

  constructor() {
    this.sessionId = this.generateSessionId()
    this.setupGlobalErrorHandlers()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", (event) => {
        this.captureError(event.reason, {
          type: "runtime",
          severity: "high",
          component: "global",
          action: "unhandled_promise_rejection",
        })
      })

      // Handle global errors
      window.addEventListener("error", (event) => {
        this.captureError(event.error || new Error(event.message), {
          type: "runtime",
          severity: "high",
          component: "global",
          action: "global_error",
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        })
      })
    }
  }

  captureError(
    error: Error | string | any,
    options: {
      type?: ErrorReport["type"]
      severity?: ErrorReport["severity"]
      component?: string
      action?: string
      metadata?: Record<string, any>
      shouldDelegate?: boolean
      delegationReason?: string
    } = {},
  ): string {
    const errorId = this.generateErrorId()

    let errorObj: Error
    let message: string

    if (error instanceof Error) {
      errorObj = error
      message = error.message
    } else if (typeof error === "string") {
      message = error
      errorObj = new Error(error)
    } else {
      message = "Unknown error occurred"
      errorObj = new Error(this.safeStringify(error))
    }

    const context: ErrorContext = {
      sessionId: this.sessionId,
      component: options.component,
      action: options.action,
      metadata: options.metadata,
      timestamp: new Date(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      stackTrace: errorObj.stack,
    }

    const errorReport: ErrorReport = {
      id: errorId,
      type: options.type || "runtime",
      severity: options.severity || "medium",
      message,
      error: errorObj,
      context,
      resolved: false,
      delegated: options.shouldDelegate || false,
      delegationReason: options.delegationReason,
    }

    this.errors.set(errorId, errorReport)

    // Maintain max errors limit
    if (this.errors.size > this.maxErrors) {
      const oldestKey = this.errors.keys().next().value
      this.errors.delete(oldestKey)
    }

    // Notify listeners
    this.errorListeners.forEach((listener) => {
      try {
        listener(errorReport)
      } catch (listenerError) {
        console.error("Error in error listener:", listenerError)
      }
    })

    // Auto-delegate critical errors
    if (errorReport.severity === "critical") {
      this.delegateError(errorId, "Critical error requires immediate attention")
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error(`[ErrorTracking] ${errorReport.type}:${errorReport.severity}`, {
        id: errorId,
        message,
        error: errorObj,
        context,
      })
    }

    return errorId
  }

  delegateError(errorId: string, reason: string, priority: ErrorDelegationRequest["priority"] = "medium"): boolean {
    const error = this.errors.get(errorId)
    if (!error) return false

    const delegationRequest: ErrorDelegationRequest = {
      errorId,
      reason,
      priority,
      userDescription: `Error in ${error.context.component || "unknown component"}: ${error.message}`,
    }

    this.delegationQueue.push(delegationRequest)
    error.delegated = true
    error.delegationReason = reason

    // In a real implementation, this would send to an external service
    this.sendDelegationRequest(delegationRequest)

    return true
  }

  private sendDelegationRequest(request: ErrorDelegationRequest): void {
    // This would integrate with external services like:
    // - Sentry
    // - LogRocket
    // - Custom error reporting service
    // - AI-powered error analysis service

    console.log("[ErrorDelegation] Delegating error to v0:", {
      errorId: request.errorId,
      reason: request.reason,
      priority: request.priority,
      description: request.userDescription,
    })

    // Simulate sending to external service
    if (typeof fetch !== "undefined") {
      fetch("/api/errors/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }).catch((err) => {
        console.error("Failed to send delegation request:", err)
      })
    }
  }

  getError(errorId: string): ErrorReport | undefined {
    return this.errors.get(errorId)
  }

  getErrors(filters?: {
    type?: ErrorReport["type"]
    severity?: ErrorReport["severity"]
    component?: string
    resolved?: boolean
    delegated?: boolean
  }): ErrorReport[] {
    let errors = Array.from(this.errors.values())

    if (filters) {
      if (filters.type) errors = errors.filter((e) => e.type === filters.type)
      if (filters.severity) errors = errors.filter((e) => e.severity === filters.severity)
      if (filters.component) errors = errors.filter((e) => e.context.component === filters.component)
      if (filters.resolved !== undefined) errors = errors.filter((e) => e.resolved === filters.resolved)
      if (filters.delegated !== undefined) errors = errors.filter((e) => e.delegated === filters.delegated)
    }

    return errors.sort((a, b) => b.context.timestamp.getTime() - a.context.timestamp.getTime())
  }

  resolveError(errorId: string): boolean {
    const error = this.errors.get(errorId)
    if (!error) return false

    error.resolved = true
    return true
  }

  clearErrors(): void {
    this.errors.clear()
    this.delegationQueue.length = 0
  }

  onError(listener: (error: ErrorReport) => void): () => void {
    this.errorListeners.push(listener)
    return () => {
      const index = this.errorListeners.indexOf(listener)
      if (index > -1) {
        this.errorListeners.splice(index, 1)
      }
    }
  }

  getStats(): {
    total: number
    byType: Record<string, number>
    bySeverity: Record<string, number>
    resolved: number
    delegated: number
  } {
    const errors = Array.from(this.errors.values())

    return {
      total: errors.length,
      byType: this.groupBy(errors, "type"),
      bySeverity: this.groupBy(errors, "severity"),
      resolved: errors.filter((e) => e.resolved).length,
      delegated: errors.filter((e) => e.delegated).length,
    }
  }

  private groupBy(items: ErrorReport[], key: keyof ErrorReport): Record<string, number> {
    return items.reduce(
      (acc, item) => {
        const value = String(item[key])
        acc[value] = (acc[value] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }

  private safeStringify(obj: any): string {
    try {
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (value instanceof Error) {
            return {
              name: value.name,
              message: value.message,
              stack: value.stack,
            }
          }
          if (value instanceof Date) {
            return value.toISOString()
          }
        }
        return value
      })
    } catch {
      return "[Object could not be serialized]"
    }
  }

  // Utility methods for common error scenarios
  captureValidationError(field: string, value: any, expectedType: string, component?: string): string {
    return this.captureError(`Validation failed for field '${field}': expected ${expectedType}, got ${typeof value}`, {
      type: "validation",
      severity: "medium",
      component,
      action: "validation",
      metadata: { field, value: this.safeStringify(value), expectedType },
    })
  }

  captureNetworkError(url: string, status?: number, response?: any, component?: string): string {
    return this.captureError(`Network request failed: ${url}`, {
      type: "network",
      severity: status && status >= 500 ? "high" : "medium",
      component,
      action: "network_request",
      metadata: { url, status, response: this.safeStringify(response) },
    })
  }

  captureUserError(action: string, details: any, component?: string): string {
    return this.captureError(`User action failed: ${action}`, {
      type: "user",
      severity: "low",
      component,
      action: "user_action",
      metadata: { action, details: this.safeStringify(details) },
    })
  }

  captureSystemError(operation: string, error: Error, component?: string): string {
    return this.captureError(error, {
      type: "system",
      severity: "high",
      component,
      action: operation,
      shouldDelegate: true,
      delegationReason: `System operation '${operation}' failed and requires investigation`,
    })
  }
}

// Global instance
export const errorTracker = new ErrorTrackingService()
