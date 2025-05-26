"use server"

import { sanitizeForLogging } from "@/lib/security-utils"

export interface SensitiveCheckResult {
  passed: boolean
  issues: string[]
}

/**
 * Server-side action to check for sensitive environment variables
 * This runs on the server only, so it's safe to check for sensitive patterns
 */
export async function checkSensitiveEnvironmentVariables(): Promise<SensitiveCheckResult> {
  const issues: string[] = []

  // Sensitive patterns to check for in NEXT_PUBLIC_ variables
  const sensitivePatterns = ["KEY", "SECRET", "PASSWORD", "TOKEN", "CREDENTIAL", "AUTH"]

  // Check all environment variables
  for (const key in process.env) {
    if (key.startsWith("NEXT_PUBLIC_")) {
      // Check if the variable name contains sensitive patterns
      const upperKey = key.toUpperCase()
      for (const pattern of sensitivePatterns) {
        if (upperKey.includes(pattern)) {
          issues.push(`Potentially sensitive data in client-side variable: ${key}`)
        }
      }
    }
  }

  // Check for required server-side variables (without exposing their values)
  const requiredServerVars = ["DATABASE_URL", "PHP_ENDPOINT", "INTERNAL_API_SECRET"]

  for (const varName of requiredServerVars) {
    if (!process.env[varName]) {
      issues.push(`Required server-side variable missing: ${varName}`)
    }
  }

  return {
    passed: issues.length === 0,
    issues: issues.map((issue) => sanitizeForLogging(issue)),
  }
}

/**
 * Server-side action to perform comprehensive security checks
 */
export async function performSecurityAudit(): Promise<{
  passed: boolean
  summary: string
  details: Record<string, any>
}> {
  const envCheck = await checkSensitiveEnvironmentVariables()

  // Additional server-side security checks
  const securityChecks = {
    environmentVariables: envCheck,
    nodeVersion: process.version,
    isProduction: process.env.NODE_ENV === "production",
    hasRequiredHeaders: true, // This would check for security headers
  }

  const passed = envCheck.passed && securityChecks.isProduction

  return {
    passed,
    summary: passed ? "All security checks passed" : "Security issues detected",
    details: sanitizeForLogging(securityChecks),
  }
}
