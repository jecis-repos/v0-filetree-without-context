import { NextResponse } from "next/server"
import { DIContainer } from "@/src/container/DIContainer"
import { ServiceRegistry } from "@/src/services/ServiceRegistry"
import { SystemDiagnostics } from "@/src/services/SystemDiagnostics"

export async function GET() {
  try {
    console.log("Deployment readiness check initiated")

    // Initialize container and services
    const container = new DIContainer()
    const serviceRegistry = new ServiceRegistry(container)
    await serviceRegistry.registerAllServices()

    // Run diagnostics
    const systemDiagnostics = new SystemDiagnostics(container)
    const report = await systemDiagnostics.runFullDiagnostics()

    // Determine readiness
    const isReady =
      report.deployment.ready &&
      report.endpoints.healthy > 0 &&
      Object.values(report.services.tested).filter(Boolean).length > 0

    const response = {
      ready: isReady,
      timestamp: new Date().toISOString(),
      summary: {
        services: {
          registered: report.services.registered.length,
          healthy: Object.values(report.services.tested).filter(Boolean).length,
          issues: report.services.issues.length,
        },
        endpoints: {
          total: report.endpoints.total,
          healthy: report.endpoints.healthy,
          unhealthy: report.endpoints.unhealthy,
        },
        deployment: {
          environment: report.deployment.environment,
          ready: report.deployment.ready,
          issues: report.deployment.issues.length,
        },
      },
      recommendations: report.recommendations,
      fullReport: report,
    }

    console.log("Deployment readiness check completed", {
      ready: isReady,
      servicesHealthy: response.summary.services.healthy,
      endpointsHealthy: response.summary.endpoints.healthy,
    })

    return NextResponse.json(response, {
      status: isReady ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Deployment readiness check failed:", error)

    return NextResponse.json(
      {
        ready: false,
        error: "Failed to perform readiness check",
        message: error instanceof Error ? error.message : String(error),
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
