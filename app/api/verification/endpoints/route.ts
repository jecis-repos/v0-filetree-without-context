import { NextResponse } from "next/server"
import { DIContainer } from "@/src/container/DIContainer"
import { ApiVerificationService } from "@/src/services/ApiVerificationService"
import { LoggingService } from "@/src/services/LoggingService"

export async function GET() {
  try {
    console.log("API endpoint verification initiated")

    // Initialize services
    const container = new DIContainer()
    const logger = new LoggingService()

    // Create verification service
    const verificationService = new ApiVerificationService(logger)

    // Run comprehensive verification
    const report = await verificationService.verifyAllEndpoints()

    console.log("API verification completed", {
      total: report.summary.total,
      passed: report.summary.passed,
      failed: report.summary.failed,
      errors: report.summary.errors,
    })

    return NextResponse.json(
      {
        success: true,
        report,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    )
  } catch (error) {
    console.error("API verification failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify API endpoints",
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
