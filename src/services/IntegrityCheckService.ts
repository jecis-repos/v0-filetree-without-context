import type { ILoggingService } from "./LoggingService"

export interface IntegrityCheckResult {
  passed: boolean
  issues: IntegrityIssue[]
  timestamp: string
}

export interface IntegrityIssue {
  component: string
  severity: "low" | "medium" | "high" | "critical"
  message: string
  details?: any
}

export class IntegrityCheckService {
  private logger: ILoggingService

  constructor(logger: ILoggingService) {
    this.logger = logger
  }

  /**
   * Run all integrity checks
   */
  async checkSystemIntegrity(): Promise<IntegrityCheckResult> {
    this.logger.info("Integrity", "Starting system integrity check")

    const issues: IntegrityIssue[] = []

    try {
      // Check API endpoints
      const apiIssues = await this.checkApiEndpoints()
      issues.push(...apiIssues)

      // Check routes
      const routeIssues = await this.checkRoutes()
      issues.push(...routeIssues)

      // Check file system
      const fsIssues = await this.checkFileSystem()
      issues.push(...fsIssues)

      // Check environment variables (client-safe checks only)
      const envIssues = this.checkEnvironmentVariables()
      issues.push(...envIssues)

      // Check security (client-safe checks only)
      const securityIssues = this.checkSecurity()
      issues.push(...securityIssues)

      const passed = issues.every((issue) => issue.severity !== "critical")

      this.logger.info("Integrity", "System integrity check completed", {
        passed,
        issueCount: issues.length,
        criticalIssues: issues.filter((i) => i.severity === "critical").length,
      })

      return {
        passed,
        issues,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      this.logger.error("Integrity", "System integrity check failed", { error })

      return {
        passed: false,
        issues: [
          {
            component: "IntegrityCheckService",
            severity: "critical",
            message: "Failed to complete integrity check",
            details: error instanceof Error ? error.message : String(error),
          },
        ],
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Check API endpoints
   */
  private async checkApiEndpoints(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = []

    try {
      // Check health endpoint
      const healthResponse = await fetch("/api/health")
      if (!healthResponse.ok) {
        issues.push({
          component: "API",
          severity: "critical",
          message: "Health API endpoint is not responding correctly",
          details: { status: healthResponse.status },
        })
      }

      // Check filesystem health endpoint
      const fsHealthResponse = await fetch("/api/filesystem/health")
      if (!fsHealthResponse.ok) {
        issues.push({
          component: "API",
          severity: "high",
          message: "Filesystem health API endpoint is not responding correctly",
          details: { status: fsHealthResponse.status },
        })
      }

      // Check export health endpoint
      const exportHealthResponse = await fetch("/api/export/health")
      if (!exportHealthResponse.ok) {
        issues.push({
          component: "API",
          severity: "medium",
          message: "Export health API endpoint is not responding correctly",
          details: { status: exportHealthResponse.status },
        })
      }
    } catch (error) {
      issues.push({
        component: "API",
        severity: "critical",
        message: "Failed to check API endpoints",
        details: error instanceof Error ? error.message : String(error),
      })
    }

    return issues
  }

  /**
   * Check routes
   */
  private async checkRoutes(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = []

    // List of critical routes to check
    const criticalRoutes = ["/", "/api/health", "/api/filesystem/health", "/api/export/health"]

    for (const route of criticalRoutes) {
      try {
        const response = await fetch(route)
        if (!response.ok) {
          issues.push({
            component: "Routing",
            severity: "high",
            message: `Route ${route} is not responding correctly`,
            details: { status: response.status },
          })
        }
      } catch (error) {
        issues.push({
          component: "Routing",
          severity: "high",
          message: `Failed to access route ${route}`,
          details: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return issues
  }

  /**
   * Check file system
   */
  private async checkFileSystem(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = []

    try {
      // Check if file system API is working
      const response = await fetch("/api/filesystem/health")
      const data = await response.json()

      if (!data.status || data.status !== "healthy") {
        issues.push({
          component: "FileSystem",
          severity: "critical",
          message: "File system is not healthy",
          details: data,
        })
      }

      // Check providers
      if (!data.providers) {
        issues.push({
          component: "FileSystem",
          severity: "high",
          message: "File system providers information is missing",
          details: data,
        })
      } else {
        // Check memory provider
        if (!data.providers.memory) {
          issues.push({
            component: "FileSystem",
            severity: "high",
            message: "Memory file system provider is not available",
            details: data.providers,
          })
        }

        // Check indexedDB provider
        if (typeof window !== "undefined" && !data.providers.indexedDB) {
          issues.push({
            component: "FileSystem",
            severity: "medium",
            message: "IndexedDB file system provider is not available",
            details: data.providers,
          })
        }
      }
    } catch (error) {
      issues.push({
        component: "FileSystem",
        severity: "critical",
        message: "Failed to check file system",
        details: error instanceof Error ? error.message : String(error),
      })
    }

    return issues
  }

  /**
   * Check environment variables (client-safe checks only)
   */
  private checkEnvironmentVariables(): IntegrityIssue[] {
    const issues: IntegrityIssue[] = []

    // Only check for non-sensitive client-side environment variables
    const requiredClientEnvVars = [
      { name: "NEXT_PUBLIC_API_BASE_URL", severity: "medium" as const },
      { name: "NEXT_PUBLIC_ENVIRONMENT", severity: "low" as const },
      { name: "NEXT_PUBLIC_WASM_BASE_URL", severity: "medium" as const },
    ]

    // Check for required client-side environment variables
    for (const envVar of requiredClientEnvVars) {
      if (!process.env[envVar.name]) {
        issues.push({
          component: "Environment",
          severity: envVar.severity,
          message: `Required environment variable ${envVar.name} is missing`,
        })
      }
    }

    // Note: Server-side environment checks should be done on the server only
    // We don't check for sensitive variables here to avoid security issues

    return issues
  }

  /**
   * Check security (client-safe checks only)
   */
  private checkSecurity(): IntegrityIssue[] {
    const issues: IntegrityIssue[] = []

    // Check for secure context
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      issues.push({
        component: "Security",
        severity: "high",
        message: "Application is not running in a secure context",
      })
    }

    // Check for proper Content Security Policy
    if (typeof window !== "undefined") {
      const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
      if (!metaCSP) {
        issues.push({
          component: "Security",
          severity: "medium",
          message: "Content Security Policy meta tag is missing",
        })
      }
    }

    // Note: Sensitive environment variable checks are done server-side only
    // to avoid exposing sensitive patterns in client code

    return issues
  }

  /**
   * Run a quick integrity check
   */
  async quickCheck(): Promise<boolean> {
    try {
      // Check health endpoint
      const healthResponse = await fetch("/api/health")
      if (!healthResponse.ok) {
        return false
      }

      // Check filesystem health endpoint
      const fsHealthResponse = await fetch("/api/filesystem/health")
      if (!fsHealthResponse.ok) {
        return false
      }

      return true
    } catch (error) {
      this.logger.error("Integrity", "Quick integrity check failed", { error })
      return false
    }
  }
}
