import { NextResponse } from "next/server"

// Simple health check function that doesn't rely on external services
async function performBasicHealthCheck() {
  const checks = {
    api: {
      health: false,
      filesystem: false,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || "unknown",
      hasRequiredVars: Boolean(process.env.NEXT_PUBLIC_API_BASE_URL && process.env.DATABASE_URL),
    },
    timestamp: new Date().toISOString(),
  }

  try {
    // Check basic API health
    const healthResponse = await fetch(
      new URL("/api/health", process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"),
    )
    checks.api.health = healthResponse.ok
  } catch (error) {
    console.error("Health API check failed:", error)
  }

  try {
    // Check filesystem API health
    const fsResponse = await fetch(
      new URL("/api/filesystem/health", process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"),
    )
    checks.api.filesystem = fsResponse.ok
  } catch (error) {
    console.error("Filesystem API check failed:", error)
  }

  return checks
}

export async function GET() {
  try {
    console.log("Deployment check API called")

    // Perform basic health checks without relying on complex services
    const healthChecks = await performBasicHealthCheck()

    // Determine if the deployment is healthy based on basic checks
    const isHealthy = healthChecks.api.health && healthChecks.api.filesystem

    console.log("Deployment check completed:", { isHealthy, checks: healthChecks })

    return NextResponse.json(
      {
        status: isHealthy ? "healthy" : "unhealthy",
        checks: healthChecks,
      },
      {
        status: isHealthy ? 200 : 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    )
  } catch (error) {
    // Log the full error for debugging
    console.error("Deployment check failed with error:", error)

    // Return a simplified error response
    return NextResponse.json(
      {
        status: "error",
        message: "Deployment check failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    )
  }
}
