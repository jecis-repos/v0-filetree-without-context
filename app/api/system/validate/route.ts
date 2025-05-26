import { NextResponse } from "next/server"
import { getBaseUrl, getApiBaseUrl, validateEnvironment } from "@/lib/env-config"
import { checkDeploymentSecurity } from "@/lib/security-utils"

interface SystemValidationResult {
  timestamp: string
  status: "healthy" | "warning" | "error"
  summary: {
    urlConstruction: boolean
    environmentValidation: boolean
    securityCheck: boolean
    healthEndpoints: boolean
    deploymentReady: boolean
  }
  details: {
    urls: {
      baseUrl: string
      apiBaseUrl: string
      constructionMethod: string
    }
    environment: {
      nodeEnv: string
      hasRequiredVars: boolean
      errors: string[]
      warnings: string[]
    }
    security: {
      isSecure: boolean
      issues: string[]
      warnings: string[]
    }
    healthChecks: {
      simple: boolean
      main: boolean
      filesystem: boolean
      deployment: boolean
    }
  }
  recommendations: string[]
}

async function testHealthEndpoints(baseUrl: string) {
  const endpoints = [
    { name: "simple", path: "/api/health/simple" },
    { name: "main", path: "/api/health" },
    { name: "filesystem", path: "/api/filesystem/health" },
    { name: "deployment", path: "/api/deployment/check" },
  ]

  const results: Record<string, boolean> = {}

  for (const endpoint of endpoints) {
    try {
      const url = `${baseUrl}${endpoint.path}`
      console.log(`Testing health endpoint: ${endpoint.name} -> ${url}`)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "System-Validation",
        },
        signal: AbortSignal.timeout(5000),
      })

      results[endpoint.name] = response.ok
      console.log(`Health endpoint ${endpoint.name}: ${response.status} ${response.ok ? "OK" : "FAIL"}`)
    } catch (error) {
      console.error(`Health endpoint ${endpoint.name} failed:`, error)
      results[endpoint.name] = false
    }
  }

  return results
}

export async function GET() {
  try {
    console.log("=== System Validation Started ===")

    const result: SystemValidationResult = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      summary: {
        urlConstruction: false,
        environmentValidation: false,
        securityCheck: false,
        healthEndpoints: false,
        deploymentReady: false,
      },
      details: {
        urls: {
          baseUrl: "",
          apiBaseUrl: "",
          constructionMethod: "",
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || "unknown",
          hasRequiredVars: false,
          errors: [],
          warnings: [],
        },
        security: {
          isSecure: false,
          issues: [],
          warnings: [],
        },
        healthChecks: {
          simple: false,
          main: false,
          filesystem: false,
          deployment: false,
        },
      },
      recommendations: [],
    }

    // Test URL Construction
    try {
      const baseUrl = getBaseUrl()
      const apiBaseUrl = getApiBaseUrl()

      result.details.urls.baseUrl = baseUrl
      result.details.urls.apiBaseUrl = apiBaseUrl

      // Determine construction method
      if (process.env.VERCEL_URL) {
        result.details.urls.constructionMethod = "Vercel URL"
      } else if (process.env.NEXT_PUBLIC_SITE_URL) {
        result.details.urls.constructionMethod = "Custom Site URL"
      } else {
        result.details.urls.constructionMethod = "Localhost Fallback"
      }

      result.summary.urlConstruction = Boolean(baseUrl && apiBaseUrl)
      console.log("URL Construction:", { baseUrl, apiBaseUrl, method: result.details.urls.constructionMethod })
    } catch (error) {
      console.error("URL Construction failed:", error)
      result.summary.urlConstruction = false
    }

    // Test Environment Validation
    try {
      const envValidation = validateEnvironment()
      result.details.environment.errors = envValidation.errors
      result.details.environment.warnings = envValidation.warnings
      result.details.environment.hasRequiredVars = envValidation.errors.length === 0
      result.summary.environmentValidation = envValidation.errors.length === 0

      console.log("Environment Validation:", {
        errors: envValidation.errors.length,
        warnings: envValidation.warnings.length,
      })
    } catch (error) {
      console.error("Environment validation failed:", error)
      result.details.environment.errors = [error instanceof Error ? error.message : String(error)]
      result.summary.environmentValidation = false
    }

    // Test Security Check
    try {
      const securityCheck = checkDeploymentSecurity()
      result.details.security = securityCheck
      result.summary.securityCheck = securityCheck.isSecure

      console.log("Security Check:", {
        isSecure: securityCheck.isSecure,
        issues: securityCheck.issues.length,
        warnings: securityCheck.warnings.length,
      })
    } catch (error) {
      console.error("Security check failed:", error)
      result.details.security.issues = [error instanceof Error ? error.message : String(error)]
      result.summary.securityCheck = false
    }

    // Test Health Endpoints
    if (result.summary.urlConstruction) {
      try {
        const healthResults = await testHealthEndpoints(result.details.urls.baseUrl)
        result.details.healthChecks = healthResults as any

        const healthyCount = Object.values(healthResults).filter(Boolean).length
        result.summary.healthEndpoints = healthyCount >= 2 // At least 2 endpoints should work

        console.log("Health Endpoints:", {
          total: Object.keys(healthResults).length,
          healthy: healthyCount,
          results: healthResults,
        })
      } catch (error) {
        console.error("Health endpoint testing failed:", error)
        result.summary.healthEndpoints = false
      }
    }

    // Determine Overall Status
    const criticalChecks = [
      result.summary.urlConstruction,
      result.summary.environmentValidation,
      result.summary.securityCheck,
    ]

    const allCriticalPass = criticalChecks.every(Boolean)
    const hasWarnings = result.details.environment.warnings.length > 0 || result.details.security.warnings.length > 0

    if (allCriticalPass && result.summary.healthEndpoints) {
      result.status = hasWarnings ? "warning" : "healthy"
      result.summary.deploymentReady = true
    } else if (allCriticalPass) {
      result.status = "warning"
      result.summary.deploymentReady = false
    } else {
      result.status = "error"
      result.summary.deploymentReady = false
    }

    // Generate Recommendations
    if (!result.summary.urlConstruction) {
      result.recommendations.push("Fix URL construction - check NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_API_BASE_URL")
    }
    if (!result.summary.environmentValidation) {
      result.recommendations.push("Resolve environment validation errors")
    }
    if (!result.summary.securityCheck) {
      result.recommendations.push("Address security issues before deployment")
    }
    if (!result.summary.healthEndpoints) {
      result.recommendations.push("Fix failing health endpoints")
    }
    if (hasWarnings) {
      result.recommendations.push("Review warnings for optimization opportunities")
    }
    if (result.summary.deploymentReady) {
      result.recommendations.push("System is ready for deployment!")
    }

    console.log("=== System Validation Completed ===", {
      status: result.status,
      deploymentReady: result.summary.deploymentReady,
      criticalChecks: criticalChecks.filter(Boolean).length,
      healthEndpoints: Object.values(result.details.healthChecks).filter(Boolean).length,
    })

    return NextResponse.json(result, {
      status: result.status === "error" ? 500 : 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-System-Status": result.status,
        "X-Deployment-Ready": result.summary.deploymentReady.toString(),
      },
    })
  } catch (error) {
    console.error("=== System Validation Failed ===", error)

    return NextResponse.json(
      {
        status: "error",
        message: "System validation failed",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-System-Status": "error",
        },
      },
    )
  }
}
