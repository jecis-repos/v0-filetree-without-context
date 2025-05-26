import { type NextRequest, NextResponse } from "next/server"
import { HealthMonitoringService } from "@/src/services/HealthMonitoringService"

// Create a singleton instance
let healthService: HealthMonitoringService | null = null

function getHealthService() {
  if (!healthService) {
    healthService = new HealthMonitoringService()
  }
  return healthService
}

export async function GET(request: NextRequest) {
  try {
    const service = getHealthService()
    const systemHealth = service.getSystemHealth()

    // Determine HTTP status based on system health
    let statusCode = 200
    if (systemHealth.status === "degraded") {
      statusCode = 207 // Multi-Status
    } else if (systemHealth.status === "unhealthy") {
      statusCode = 503 // Service Unavailable
    }

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: systemHealth.status,
        services: {
          total: systemHealth.services,
          healthy: systemHealth.healthy,
          unhealthy: systemHealth.unhealthy,
        },
        details: systemHealth.details.map((service) => ({
          name: service.name,
          status: service.status,
          responseTime: service.responseTime,
          lastCheck: new Date(service.timestamp).toISOString(),
          ...(service.error && { error: service.error }),
        })),
        environment: process.env.NEXT_PUBLIC_ENVIRONMENT || "development",
        version: process.env.npm_package_version || "1.0.0",
      },
      { status: statusCode },
    )
  } catch (error) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
