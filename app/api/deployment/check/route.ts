import { NextResponse } from "next/server"
import { getBaseUrl, validateEnvironment } from "@/lib/env-config"

// Simple health check function with robust error handling
async function performBasicHealthCheck() {
  const checks = {
    api: {
      health: false,
      filesystem: false,
      simple: false,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || "development",
      hasRequiredVars: Boolean(process.env.DATABASE_URL),
      baseUrl: "",
    },
    timestamp: new Date().toISOString(),
  }

  // Get the base URL safely
  let baseUrl: string
  try {
    baseUrl = getBaseUrl()
    checks.environment.baseUrl = baseUrl
    console.log("Deployment check using base URL:", baseUrl)
  } catch (error) {
    console.error("Failed to determine base URL:", error)
    baseUrl = "http://localhost:3000" // Fallback
    checks.environment.baseUrl = baseUrl
  }

  // Test simple health endpoint first
  try {
    const simpleHealthUrl = `${baseUrl}/api/health/simple`
    console.log("Checking simple health endpoint:", simpleHealthUrl)

    const simpleResponse = await fetch(simpleHealthUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Internal-Health-Check",
      },
      // Add timeout
      signal: AbortSignal.timeout(5000),
    })

    checks.api.simple = simpleResponse.ok
    console.log("Simple health check result:", simpleResponse.status, simpleResponse.ok)
  } catch (error) {
    console.error("Simple health API check failed:", error)
    checks.api.simple = false
  }

  // Test main health endpoint
  try {
    const healthUrl = `${baseUrl}/api/health`
    console.log("Checking main health endpoint:", healthUrl)

    const healthResponse = await fetch(healthUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Internal-Health-Check",
      },
      signal: AbortSignal.timeout(5000),
    })

    checks.api.health = healthResponse.ok
    console.log("Main health check result:", healthResponse.status, healthResponse.ok)
  } catch (error) {
    console.error("Main health API check failed:", error)
    checks.api.health = false
  }

  // Test filesystem health endpoint
  try {
    const fsUrl = `${baseUrl}/api/filesystem/health`
    console.log("Checking filesystem endpoint:", fsUrl)

    const fsResponse = await fetch(fsUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Internal-Health-Check",
      },
      signal: AbortSignal.timeout(5000),
    })

    checks.api.filesystem = fsResponse.ok
    console.log("Filesystem check result:", fsResponse.status, fsResponse.ok)
  } catch (error) {
    console.error("Filesystem API check failed:", error)
    checks.api.filesystem = false
  }

  return checks
}

export async function GET() {
  try {
    console.log("=== Deployment Check API Called ===")

    // Validate environment first
    let envValidation
    try {
      envValidation = validateEnvironment()
      console.log("Environment validation passed")
    } catch (error) {
      console.error("Environment validation failed:", error)
      envValidation = { errors: [error instanceof Error ? error.message : String(error)], warnings: [] }
    }

    // Perform health checks
    const healthChecks = await performBasicHealthCheck()

    // Determine if the deployment is healthy
    const isHealthy =
      (healthChecks.api.health || healthChecks.api.simple) && // At least one health endpoint works
      healthChecks.api.filesystem && // Filesystem must work
      envValidation.errors.length === 0 // No environment errors

    const result = {
      status: isHealthy ? "healthy" : "unhealthy",
      checks: healthChecks,
      environment: {
        validation: envValidation,
        nodeEnv: process.env.NODE_ENV,
        isProduction: process.env.NODE_ENV === "production",
      },
      timestamp: new Date().toISOString(),
    }

    console.log("=== Deployment Check Completed ===", {
      isHealthy,
      apiHealth: healthChecks.api.health,
      apiSimple: healthChecks.api.simple,
      filesystem: healthChecks.api.filesystem,
      envErrors: envValidation.errors.length,
    })

    return NextResponse.json(result, {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Deployment-Status": isHealthy ? "healthy" : "unhealthy",
      },
    })
  } catch (error) {
    console.error("=== Deployment Check Failed ===", error)

    // Return a safe error response
    return NextResponse.json(
      {
        status: "error",
        message: "Deployment check failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        debug: {
          nodeEnv: process.env.NODE_ENV,
          hasVercelUrl: Boolean(process.env.VERCEL_URL),
          hasApiBaseUrl: Boolean(process.env.NEXT_PUBLIC_API_BASE_URL),
        },
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Deployment-Status": "error",
        },
      },
    )
  }
}
