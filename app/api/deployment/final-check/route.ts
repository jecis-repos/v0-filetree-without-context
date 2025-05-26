import { NextResponse } from "next/server"
import { getBaseUrl, getApiBaseUrl, validateEnvironment } from "@/lib/env-config"
import { checkDeploymentSecurity } from "@/lib/security-utils"

interface DeploymentReadinessReport {
  timestamp: string
  deploymentReady: boolean
  overallStatus: "ready" | "warning" | "not-ready"
  checklist: {
    environmentVariables: {
      status: "pass" | "fail"
      details: string[]
    }
    urlConfiguration: {
      status: "pass" | "fail"
      baseUrl: string
      apiBaseUrl: string
      method: string
    }
    securityValidation: {
      status: "pass" | "fail"
      issues: string[]
      warnings: string[]
    }
    healthEndpoints: {
      status: "pass" | "fail"
      workingEndpoints: number
      totalEndpoints: number
    }
    performanceOptimization: {
      status: "pass" | "warning"
      recommendations: string[]
    }
  }
  deploymentInstructions: string[]
  postDeploymentSteps: string[]
  monitoringRecommendations: string[]
}

async function testCriticalEndpoints(baseUrl: string) {
  const criticalEndpoints = ["/api/health", "/api/health/simple", "/api/deployment/check", "/api/system/validate"]

  let workingCount = 0
  const results: Record<string, boolean> = {}

  for (const endpoint of criticalEndpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      })
      const isWorking = response.ok
      results[endpoint] = isWorking
      if (isWorking) workingCount++
    } catch {
      results[endpoint] = false
    }
  }

  return { workingCount, total: criticalEndpoints.length, results }
}

export async function GET() {
  try {
    console.log("=== Final Deployment Readiness Check ===")

    const report: DeploymentReadinessReport = {
      timestamp: new Date().toISOString(),
      deploymentReady: false,
      overallStatus: "not-ready",
      checklist: {
        environmentVariables: { status: "fail", details: [] },
        urlConfiguration: { status: "fail", baseUrl: "", apiBaseUrl: "", method: "" },
        securityValidation: { status: "fail", issues: [], warnings: [] },
        healthEndpoints: { status: "fail", workingEndpoints: 0, totalEndpoints: 0 },
        performanceOptimization: { status: "pass", recommendations: [] },
      },
      deploymentInstructions: [],
      postDeploymentSteps: [],
      monitoringRecommendations: [],
    }

    // 1. Environment Variables Check
    try {
      const envValidation = validateEnvironment()
      report.checklist.environmentVariables.status = envValidation.errors.length === 0 ? "pass" : "fail"
      report.checklist.environmentVariables.details = [
        ...envValidation.errors.map((e) => `❌ ${e}`),
        ...envValidation.warnings.map((w) => `⚠️ ${w}`),
      ]

      if (envValidation.errors.length === 0) {
        report.checklist.environmentVariables.details.push("✅ All required environment variables configured")
      }
    } catch (error) {
      report.checklist.environmentVariables.details = [`❌ Environment validation failed: ${error}`]
    }

    // 2. URL Configuration Check
    try {
      const baseUrl = getBaseUrl()
      const apiBaseUrl = getApiBaseUrl()

      report.checklist.urlConfiguration.baseUrl = baseUrl
      report.checklist.urlConfiguration.apiBaseUrl = apiBaseUrl
      report.checklist.urlConfiguration.status = baseUrl && apiBaseUrl ? "pass" : "fail"

      if (process.env.VERCEL_URL) {
        report.checklist.urlConfiguration.method = "Vercel URL (Automatic)"
      } else if (process.env.NEXT_PUBLIC_SITE_URL) {
        report.checklist.urlConfiguration.method = "Custom Site URL"
      } else {
        report.checklist.urlConfiguration.method = "Localhost Fallback"
      }
    } catch (error) {
      report.checklist.urlConfiguration.status = "fail"
    }

    // 3. Security Validation
    try {
      const securityCheck = checkDeploymentSecurity()
      report.checklist.securityValidation.status = securityCheck.isSecure ? "pass" : "fail"
      report.checklist.securityValidation.issues = securityCheck.issues
      report.checklist.securityValidation.warnings = securityCheck.warnings
    } catch (error) {
      report.checklist.securityValidation.issues = [`Security check failed: ${error}`]
    }

    // 4. Health Endpoints Check
    if (report.checklist.urlConfiguration.status === "pass") {
      const healthCheck = await testCriticalEndpoints(report.checklist.urlConfiguration.baseUrl)
      report.checklist.healthEndpoints.workingEndpoints = healthCheck.workingCount
      report.checklist.healthEndpoints.totalEndpoints = healthCheck.total
      report.checklist.healthEndpoints.status = healthCheck.workingCount >= 3 ? "pass" : "fail"
    }

    // 5. Performance Optimization
    const perfRecommendations: string[] = []
    if (process.env.NODE_ENV !== "production") {
      perfRecommendations.push("Set NODE_ENV=production for optimal performance")
    }
    if (!process.env.NEXT_PUBLIC_ENABLE_ANALYTICS) {
      perfRecommendations.push("Consider enabling analytics for monitoring")
    }

    report.checklist.performanceOptimization.recommendations = perfRecommendations
    report.checklist.performanceOptimization.status = perfRecommendations.length === 0 ? "pass" : "warning"

    // Determine Overall Status
    const criticalChecks = [
      report.checklist.environmentVariables.status === "pass",
      report.checklist.urlConfiguration.status === "pass",
      report.checklist.securityValidation.status === "pass",
      report.checklist.healthEndpoints.status === "pass",
    ]

    const allCriticalPass = criticalChecks.every(Boolean)
    const hasWarnings =
      report.checklist.environmentVariables.details.some((d) => d.includes("⚠️")) ||
      report.checklist.securityValidation.warnings.length > 0 ||
      report.checklist.performanceOptimization.status === "warning"

    if (allCriticalPass) {
      report.deploymentReady = true
      report.overallStatus = hasWarnings ? "warning" : "ready"
    } else {
      report.deploymentReady = false
      report.overallStatus = "not-ready"
    }

    // Generate Instructions
    if (report.deploymentReady) {
      report.deploymentInstructions = [
        "✅ Your application is ready for production deployment!",
        "🚀 Deploy using: `vercel --prod` or through Vercel Dashboard",
        "📊 Monitor deployment using the System Status dashboard",
        "🔍 Verify all endpoints work in production environment",
      ]

      report.postDeploymentSteps = [
        "Test all critical user flows in production",
        "Verify file system operations work correctly",
        "Check performance metrics and response times",
        "Set up monitoring alerts for health endpoints",
        "Review logs for any production-specific issues",
      ]

      report.monitoringRecommendations = [
        "Monitor /api/health endpoint for uptime",
        "Set up alerts for /api/deployment/check failures",
        "Track performance metrics via /api/system/validate",
        "Monitor error rates and response times",
        "Set up log aggregation for debugging",
      ]
    } else {
      report.deploymentInstructions = [
        "❌ Application is not ready for deployment",
        "🔧 Fix the failing checks listed above",
        "🔄 Re-run this check after making corrections",
        "📞 Contact support if issues persist",
      ]
    }

    console.log("=== Final Deployment Check Completed ===", {
      ready: report.deploymentReady,
      status: report.overallStatus,
      criticalPassing: criticalChecks.filter(Boolean).length,
      healthEndpoints: report.checklist.healthEndpoints.workingEndpoints,
    })

    return NextResponse.json(report, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Deployment-Ready": report.deploymentReady.toString(),
        "X-Overall-Status": report.overallStatus,
      },
    })
  } catch (error) {
    console.error("=== Final Deployment Check Failed ===", error)

    return NextResponse.json(
      {
        error: "Final deployment check failed",
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
