import { NextResponse } from "next/server"
import { getBaseUrl, getApiBaseUrl, validateEnvironment, config } from "@/lib/env-config"
import { checkDeploymentSecurity } from "@/lib/security-utils"

export async function GET() {
  try {
    console.log("=== Environment Test API Called ===")

    // Test URL construction
    const baseUrl = getBaseUrl()
    const apiBaseUrl = getApiBaseUrl()

    console.log("URL Construction Test:", { baseUrl, apiBaseUrl })

    // Test environment validation
    let envValidation
    try {
      envValidation = validateEnvironment()
      console.log("Environment validation passed")
    } catch (error) {
      console.error("Environment validation failed:", error)
      envValidation = {
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
      }
    }

    // Test security validation
    const securityCheck = checkDeploymentSecurity()
    console.log("Security check:", securityCheck)

    // Test configuration
    const configTest = {
      isDevelopment: config.isDevelopment,
      isProduction: config.isProduction,
      baseUrl: config.baseUrl,
      apiBaseUrl: config.apiBaseUrl,
      features: config.features,
    }

    // Test environment variables (safe ones only)
    const envTest = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL ? "SET" : "NOT_SET",
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ? "SET" : "NOT_SET",
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "DEFAULT",
      DATABASE_URL: process.env.DATABASE_URL ? "SET" : "NOT_SET",
      PHP_API_KEY: process.env.PHP_API_KEY ? "SET" : "NOT_SET",
    }

    const result = {
      status: "success",
      timestamp: new Date().toISOString(),
      urls: {
        baseUrl,
        apiBaseUrl,
        constructionSuccess: Boolean(baseUrl && apiBaseUrl),
      },
      environment: {
        validation: envValidation,
        variables: envTest,
        config: configTest,
      },
      security: securityCheck,
      deployment: {
        ready: envValidation.errors.length === 0 && securityCheck.isSecure,
        issues: [...envValidation.errors, ...securityCheck.issues],
        warnings: [...(envValidation.warnings || []), ...securityCheck.warnings],
      },
    }

    console.log("=== Environment Test Completed ===", {
      urlsOk: result.urls.constructionSuccess,
      envErrors: envValidation.errors.length,
      securityIssues: securityCheck.issues.length,
      deploymentReady: result.deployment.ready,
    })

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Environment-Status": result.deployment.ready ? "ready" : "not-ready",
      },
    })
  } catch (error) {
    console.error("=== Environment Test Failed ===", error)

    return NextResponse.json(
      {
        status: "error",
        message: "Environment test failed",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Environment-Status": "error",
        },
      },
    )
  }
}
