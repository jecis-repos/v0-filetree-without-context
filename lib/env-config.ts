/**
 * Environment Configuration
 * Following Vercel best practices for environment variable management
 *
 * SECURITY WARNING: Never use NEXT_PUBLIC_ prefix for sensitive data!
 * - API keys, secrets, and credentials must be server-side only
 * - Only use NEXT_PUBLIC_ for non-sensitive configuration values
 *
 * References:
 * - https://vercel.com/docs/projects/environment-variables
 * - https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
 */

// Server-side only environment variables (secure)
function getServerEnv() {
  return {
    // PHP-WASM Configuration
    PHP_API_KEY: process.env.PHP_API_KEY || "",
    PHP_ENDPOINT: process.env.PHP_ENDPOINT || "http://localhost:8080",

    // Database Configuration
    DATABASE_URL: process.env.DATABASE_URL || "",

    // External API Keys (server-side only)
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",

    // Internal API Configuration
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET || "",

    // Monitoring and Analytics
    SENTRY_DSN: process.env.SENTRY_DSN || "",
    ANALYTICS_SECRET: process.env.ANALYTICS_SECRET || "",

    // Vercel-specific
    VERCEL_URL: process.env.VERCEL_URL || "",
  }
}

// Client-side environment variables (public - prefixed with NEXT_PUBLIC_)
function getClientEnv() {
  return {
    // API Base URLs - with proper fallbacks
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "/api",

    // Environment Information
    ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || "development",

    // Feature Flags
    ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
    ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true",

    // CDN and Asset URLs
    CDN_URL: process.env.NEXT_PUBLIC_CDN_URL || "",
    WASM_BASE_URL: process.env.NEXT_PUBLIC_WASM_BASE_URL || "/wasm",

    // Performance Configuration
    MAX_FILE_SIZE: Number.parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || "10485760"), // 10MB
    CACHE_TTL: Number.parseInt(process.env.NEXT_PUBLIC_CACHE_TTL || "300000"), // 5 minutes

    // Stack Auth (publishable keys are safe to expose)
    STACK_PROJECT_ID: process.env.NEXT_PUBLIC_STACK_PROJECT_ID || "",
    STACK_PUBLISHABLE_CLIENT_KEY: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY || "",
  }
}

// Type-safe environment access
export const serverEnv = getServerEnv()
export const clientEnv = getClientEnv()

// Get base URL for API calls
export function getBaseUrl(): string {
  // Server-side URL determination
  if (typeof window === "undefined") {
    // Vercel deployment
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
    // Custom domain
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL
    }
    // Development fallback
    return "http://localhost:3000"
  }

  // Client-side - use current origin
  return window.location.origin
}

// Get API base URL
export function getApiBaseUrl(): string {
  const baseUrl = getBaseUrl()
  const apiPath = clientEnv.API_BASE_URL.startsWith("/") ? clientEnv.API_BASE_URL : `/${clientEnv.API_BASE_URL}`
  return `${baseUrl}${apiPath}`
}

// Validation function for required environment variables
export function validateEnvironment() {
  const errors: string[] = []
  const warnings: string[] = []

  // Security check: Ensure no sensitive data in client environment (excluding publishable keys)
  const sensitiveKeys = ["SECRET", "PRIVATE_KEY", "PASSWORD", "TOKEN", "CREDENTIAL"]
  const allowedPublicKeys = ["PUBLISHABLE", "PUBLIC"]

  Object.keys(process.env).forEach((key) => {
    if (key.startsWith("NEXT_PUBLIC_")) {
      const hasAllowedPattern = allowedPublicKeys.some((allowed) => key.includes(allowed))
      const hasSensitivePattern = sensitiveKeys.some((sensitive) => key.includes(sensitive))

      if (hasSensitivePattern && !hasAllowedPattern) {
        errors.push(`Security violation: ${key} should not be prefixed with NEXT_PUBLIC_`)
      }
    }
  })

  // Validate server environment in server context only
  if (typeof window === "undefined") {
    // Only require DATABASE_URL in production
    if (clientEnv.ENVIRONMENT === "production" && !serverEnv.DATABASE_URL) {
      errors.push("DATABASE_URL is required in production")
    }

    // PHP configuration warnings (not errors since it's optional)
    if (!serverEnv.PHP_API_KEY) {
      warnings.push("PHP_API_KEY not set - PHP functionality will be limited")
    }

    if (!serverEnv.PHP_ENDPOINT || serverEnv.PHP_ENDPOINT === "http://localhost:8080") {
      warnings.push("PHP_ENDPOINT using default value - configure for production")
    }
  }

  // Log warnings but don't throw errors for them
  if (warnings.length > 0) {
    console.warn("Environment warnings:", warnings)
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join("\n")}`)
  }

  return { errors, warnings }
}

// Environment-specific configuration
export const config = {
  isDevelopment: clientEnv.ENVIRONMENT === "development",
  isProduction: clientEnv.ENVIRONMENT === "production",
  isTest: clientEnv.ENVIRONMENT === "test",

  // URLs
  baseUrl: getBaseUrl(),
  apiBaseUrl: getApiBaseUrl(),

  // Feature flags
  features: {
    analytics: clientEnv.ENABLE_ANALYTICS,
    debug: clientEnv.ENABLE_DEBUG,
    phpWasm: Boolean(serverEnv.PHP_API_KEY), // Only enable if API key is available
  },

  // Performance settings
  performance: {
    maxFileSize: clientEnv.MAX_FILE_SIZE,
    cacheTtl: clientEnv.CACHE_TTL,
    enableServiceWorker: clientEnv.ENVIRONMENT === "production",
  },

  // API endpoints
  api: {
    base: clientEnv.API_BASE_URL,
    timeout: 30000, // 30 seconds
    retries: 3,
  },

  // WASM configuration
  wasm: {
    baseUrl: clientEnv.WASM_BASE_URL,
    enableOptimizations: clientEnv.ENVIRONMENT === "production",
    memoryLimit: "256MB",
  },
}
