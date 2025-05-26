/**
 * Environment Service
 * Handles environment variable access safely between client and server
 */

export interface EnvironmentInfo {
  isServer: boolean
  isClient: boolean
  isDevelopment: boolean
  isProduction: boolean
  baseUrl: string
  apiBaseUrl: string
  hasRequiredServerVars: boolean
  hasRequiredClientVars: boolean
  issues: string[]
}

export class EnvironmentService {
  private static instance: EnvironmentService
  private environmentInfo: EnvironmentInfo

  private constructor() {
    this.environmentInfo = this.analyzeEnvironment()
  }

  static getInstance(): EnvironmentService {
    if (!EnvironmentService.instance) {
      EnvironmentService.instance = new EnvironmentService()
    }
    return EnvironmentService.instance
  }

  getEnvironmentInfo(): EnvironmentInfo {
    return { ...this.environmentInfo }
  }

  private analyzeEnvironment(): EnvironmentInfo {
    const isServer = typeof window === "undefined"
    const isClient = !isServer
    const issues: string[] = []

    // Environment detection
    const nodeEnv = isServer ? process.env.NODE_ENV : "client"
    const isDevelopment = nodeEnv === "development"
    const isProduction = nodeEnv === "production"

    // Base URL determination
    let baseUrl = "http://localhost:3000"
    let apiBaseUrl = "/api"

    if (isClient && typeof window !== "undefined") {
      baseUrl = window.location.origin
      apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "/api"
    } else if (isServer) {
      // Server-side URL determination
      if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`
      } else if (process.env.NEXT_PUBLIC_API_BASE_URL?.startsWith("http")) {
        baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
      }
      apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "/api"
    }

    // Check required server variables (only on server)
    let hasRequiredServerVars = true
    if (isServer) {
      const requiredServerVars = ["DATABASE_URL"]
      for (const varName of requiredServerVars) {
        if (!process.env[varName]) {
          issues.push(`Missing server environment variable: ${varName}`)
          hasRequiredServerVars = false
        }
      }

      // Check for sensitive data exposure
      for (const key in process.env) {
        if (
          key.startsWith("NEXT_PUBLIC_") &&
          (key.includes("SECRET") || key.includes("PRIVATE")) &&
          !key.includes("PUBLISHABLE")
        ) {
          issues.push(`Potentially sensitive data exposed to client: ${key}`)
        }
      }
    }

    // Check required client variables
    let hasRequiredClientVars = true
    const requiredClientVars = ["NEXT_PUBLIC_API_BASE_URL"]
    for (const varName of requiredClientVars) {
      const value = isClient
        ? (window as any).__NEXT_DATA__?.env?.[varName] || process.env[varName]
        : process.env[varName]
      if (!value) {
        issues.push(`Missing client environment variable: ${varName}`)
        hasRequiredClientVars = false
      }
    }

    return {
      isServer,
      isClient,
      isDevelopment,
      isProduction,
      baseUrl,
      apiBaseUrl,
      hasRequiredServerVars,
      hasRequiredClientVars,
      issues,
    }
  }

  getBaseUrl(): string {
    return this.environmentInfo.baseUrl
  }

  getApiBaseUrl(): string {
    return this.environmentInfo.apiBaseUrl
  }

  isDeploymentReady(): boolean {
    return (
      this.environmentInfo.hasRequiredServerVars &&
      this.environmentInfo.hasRequiredClientVars &&
      this.environmentInfo.issues.length === 0
    )
  }

  getIssues(): string[] {
    return [...this.environmentInfo.issues]
  }
}
