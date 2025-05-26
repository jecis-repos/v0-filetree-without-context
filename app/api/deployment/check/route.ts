import { type NextRequest, NextResponse } from "next/server"
import { DIContainer } from "@/src/container/DIContainer"
import { LoggingService } from "@/src/services/LoggingService"
import { IntegrityCheckService } from "@/src/services/IntegrityCheckService"
import { sanitizeForLogging } from "@/lib/security-utils"

// Initialize services
const logger = new LoggingService()
const container = new DIContainer()
let integrityService: IntegrityCheckService

// Initialize container with required services
try {
  // Register logger first for error tracking
  container.registerInstance("ILoggingService", logger)

  // Create integrity service
  integrityService = new IntegrityCheckService(logger)

  logger.info("API", "Deployment check route initialized")
} catch (error) {
  logger.error("API", "Failed to initialize deployment check route", {
    error: sanitizeForLogging(error),
  })
}

export async function GET(request: NextRequest) {
  try {
    logger.info("API", "Deployment integrity check requested")

    // Run integrity check
    const result = await integrityService.checkSystemIntegrity()

    // Determine HTTP status based on check results
    const status = result.passed
      ? 200
      : result.issues.some((i) => i.severity === "critical")
        ? 500
        : result.issues.some((i) => i.severity === "high")
          ? 503
          : 200

    logger.info("API", "Deployment integrity check completed", {
      passed: result.passed,
      issueCount: result.issues.length,
      status,
    })

    return NextResponse.json(result, { status })
  } catch (error) {
    logger.error("API", "Deployment integrity check failed", {
      error: sanitizeForLogging(error),
    })

    return NextResponse.json(
      {
        passed: false,
        issues: [
          {
            component: "DeploymentCheck",
            severity: "critical",
            message: "Failed to complete deployment check",
            details: error instanceof Error ? error.message : String(error),
          },
        ],
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
