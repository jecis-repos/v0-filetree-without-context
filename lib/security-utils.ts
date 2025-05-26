/**
 * Security Utilities
 * Helpers to prevent common security issues with environment variables and sensitive data
 */

/**
 * Check if an environment variable name suggests it contains sensitive data
 */
export function isSensitiveEnvVar(varName: string): boolean {
  const sensitivePatterns = [
    "API_KEY",
    "SECRET",
    "PASSWORD",
    "TOKEN",
    "CREDENTIAL",
    "PRIVATE_KEY",
    "AUTH",
    "DATABASE_URL",
    "CONNECTION_STRING",
  ]

  const upperVarName = varName.toUpperCase()
  return sensitivePatterns.some((pattern) => upperVarName.includes(pattern))
}

/**
 * Validate that no sensitive environment variables are exposed to client
 */
export function validateClientEnvSecurity(): string[] {
  const violations: string[] = []

  // Check all environment variables that start with NEXT_PUBLIC_
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith("NEXT_PUBLIC_") && isSensitiveEnvVar(key)) {
      violations.push(`${key} appears to contain sensitive data but is exposed to client`)
    }
  })

  return violations
}

/**
 * Sanitize sensitive data from logs and error messages
 */
export function sanitizeForLogging(data: any): any {
  if (typeof data === "string") {
    // Remove potential API keys, tokens, etc.
    return data.replace(
      /([a-zA-Z0-9_-]*(?:key|token|secret|password)[a-zA-Z0-9_-]*[=:]\s*)([^\s,}]+)/gi,
      "$1[REDACTED]",
    )
  }

  if (typeof data === "object" && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {}

    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveEnvVar(key)) {
        sanitized[key] = "[REDACTED]"
      } else {
        sanitized[key] = sanitizeForLogging(value)
      }
    }

    return sanitized
  }

  return data
}

/**
 * Create a secure configuration object that only exposes safe values to client
 */
export function createSecureClientConfig(serverConfig: Record<string, any>): Record<string, any> {
  const clientConfig: Record<string, any> = {}

  for (const [key, value] of Object.entries(serverConfig)) {
    if (!isSensitiveEnvVar(key)) {
      clientConfig[key] = value
    }
  }

  return clientConfig
}

/**
 * Mask sensitive values in objects for safe display
 */
export function maskSensitiveData(obj: any, maskChar = "*"): any {
  if (typeof obj === "string") {
    if (obj.length <= 4) return maskChar.repeat(obj.length)
    return obj.substring(0, 2) + maskChar.repeat(obj.length - 4) + obj.substring(obj.length - 2)
  }

  if (typeof obj === "object" && obj !== null) {
    const masked: any = Array.isArray(obj) ? [] : {}

    for (const [key, value] of Object.entries(obj)) {
      if (isSensitiveEnvVar(key)) {
        masked[key] = typeof value === "string" ? maskSensitiveData(value, maskChar) : "[MASKED]"
      } else {
        masked[key] = maskSensitiveData(value, maskChar)
      }
    }

    return masked
  }

  return obj
}
