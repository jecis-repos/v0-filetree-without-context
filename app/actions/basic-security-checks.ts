"use server"

/**
 * Simple server-side security check that doesn't rely on external services
 */
export async function performBasicSecurityCheck() {
  try {
    // Check for secure environment
    const isProduction = process.env.NODE_ENV === "production"

    // Check for required server environment variables
    const hasRequiredServerVars = Boolean(
      process.env.DATABASE_URL && process.env.PHP_API_KEY && process.env.PHP_ENDPOINT,
    )

    // Check for potentially exposed sensitive variables
    const exposedSensitiveVars = Object.keys(process.env)
      .filter((key) => key.startsWith("NEXT_PUBLIC_"))
      .filter((key) => {
        const upperKey = key.toUpperCase()
        return (
          upperKey.includes("KEY") ||
          upperKey.includes("SECRET") ||
          upperKey.includes("PASSWORD") ||
          upperKey.includes("TOKEN")
        )
      })

    return {
      passed: hasRequiredServerVars && exposedSensitiveVars.length === 0,
      environment: {
        isProduction,
        hasRequiredServerVars,
      },
      security: {
        hasSensitiveExposure: exposedSensitiveVars.length > 0,
        sensitiveVarCount: exposedSensitiveVars.length,
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Security check failed:", error)

    return {
      passed: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }
  }
}
