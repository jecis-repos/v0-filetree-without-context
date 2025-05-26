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

  // Get the base URL for internal API calls
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_API_BASE_URL
      ? process.env.NEXT_PUBLIC_API_BASE_URL.startsWith("http")
        ? process.env.NEXT_PUBLIC_API_BASE_URL
        : `http://localhost:3000${process.env.NEXT_PUBLIC_API_BASE_URL}`
      : "http://localhost:3000"

  console.log("Using base URL for health checks:", baseUrl)

  try {
    // Check basic API health with proper URL construction
    const healthUrl = `${baseUrl}/api/health`
    console.log("Checking health endpoint:", healthUrl)

    const healthResponse = await fetch(healthUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Internal-Health-Check",
      },
    })
    checks.api.health = healthResponse.ok
    console.log("Health check result:", healthResponse.status, healthResponse.ok)
  } catch (error) {
    console.error("Health API check failed:", error)
    checks.api.health = false
  }

  try {
    // Check filesystem API health with proper URL construction
    const fsUrl = `${baseUrl}/api/filesystem/health`
    console.log("Checking filesystem endpoint:", fsUrl)

    const fsResponse = await fetch(fsUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Internal-Health-Check",
      },
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
