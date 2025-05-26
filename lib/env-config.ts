/**
 * Environment Configuration
 * Following Vercel best practices for environment variable management
 *
 * References:
 * - https://vercel.com/docs/projects/environment-variables
 * - https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
 */

// Server-side only environment variables (secure)
function getServerEnv() {
  return {
    // PHP-WASM Configuration
    PHP_API_KEY: process.env.PHP_API_KEY,
    PHP_ENDPOINT: process.env.PHP_ENDPOINT || "http://localhost:8080",

    // Database Configuration
    DATABASE_URL: process.env.DATABASE_URL,

    // External API Keys (server-side only)
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,

    // Internal API Configuration
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,

    // Monitoring and Analytics
    SENTRY_DSN: process.env.SENTRY_DSN,
    ANALYTICS_SECRET: process.env.ANALYTICS_SECRET,
  }
}

// Client-side environment variables (public - prefixed with NEXT_PUBLIC_)
function getClientEnv() {
  return {
    // API Base URLs
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "/api",

    // Environment Information
    ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || "development",

    // Feature Flags
    ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
    ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true",

    // CDN and Asset URLs
    CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
    WASM_BASE_URL: process.env.NEXT_PUBLIC_WASM_BASE_URL || "/wasm",

    // Performance Configuration
    MAX_FILE_SIZE: Number.parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || "10485760"), // 10MB
    CACHE_TTL: Number.parseInt(process.env.NEXT_PUBLIC_CACHE_TTL || "300000"), // 5 minutes
  }
}

// Type-safe environment access
export const serverEnv = getServerEnv()
export const clientEnv = getClientEnv()

// Validation function for required environment variables
export function validateEnvironment() {
  const errors: string[] = []

  // Validate server environment in server context only
  if (typeof window === "undefined") {
    if (!serverEnv.PHP_ENDPOINT) {
      errors.push("PHP_ENDPOINT is required")
    }

    if (serverEnv.ENVIRONMENT === "production" && !serverEnv.PHP_API_KEY) {
      errors.push("PHP_API_KEY is required in production")
    }
  }

  // Validate client environment
  if (!clientEnv.API_BASE_URL) {
    errors.push("NEXT_PUBLIC_API_BASE_URL is required")
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join("\n")}`)
  }
}

// Environment-specific configuration
export const config = {
  isDevelopment: clientEnv.ENVIRONMENT === "development",
  isProduction: clientEnv.ENVIRONMENT === "production",
  isTest: clientEnv.ENVIRONMENT === "test",

  // Feature flags
  features: {
    analytics: clientEnv.ENABLE_ANALYTICS,
    debug: clientEnv.ENABLE_DEBUG,
    phpWasm: true, // Always enabled for this project
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
