/**
 * Client-side Configuration
 * Only includes public environment variables safe for client-side use
 */

// Type-safe environment variable access
function getEnvVar(key: string, defaultValue?: string): string {
  if (typeof window === "undefined") {
    // Server-side: access process.env
    return process.env[key] || defaultValue || ""
  } else {
    // Client-side: only access NEXT_PUBLIC_ variables
    if (key.startsWith("NEXT_PUBLIC_")) {
      return (window as any).__NEXT_DATA__?.env?.[key] || process.env[key] || defaultValue || ""
    }
    return defaultValue || ""
  }
}

function getBooleanEnv(key: string, defaultValue = false): boolean {
  const value = getEnvVar(key, String(defaultValue))
  return value.toLowerCase() === "true" || value === "1"
}

function getNumberEnv(key: string, defaultValue = 0): number {
  const value = getEnvVar(key, String(defaultValue))
  const parsed = Number.parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

// Client-safe configuration
export const clientConfig = {
  // Environment
  environment: getEnvVar("NEXT_PUBLIC_ENVIRONMENT", "development") as "development" | "production" | "staging",

  // API Configuration
  apiBaseUrl: getEnvVar("NEXT_PUBLIC_API_BASE_URL", "/api"),

  // CDN and Assets
  cdnUrl: getEnvVar("NEXT_PUBLIC_CDN_URL", ""),
  wasmBaseUrl: getEnvVar("NEXT_PUBLIC_WASM_BASE_URL", "/wasm"),

  // Feature Flags
  features: {
    analytics: getBooleanEnv("NEXT_PUBLIC_ENABLE_ANALYTICS", false),
    debug: getBooleanEnv("NEXT_PUBLIC_ENABLE_DEBUG", false),
    phpWasm: true, // Always enabled for client
    webAssembly: true,
    healthMonitoring: true,
  },

  // Performance Settings
  performance: {
    maxFileSize: getNumberEnv("NEXT_PUBLIC_MAX_FILE_SIZE", 10485760), // 10MB
    cacheTtl: getNumberEnv("NEXT_PUBLIC_CACHE_TTL", 300000), // 5 minutes
    healthCheckInterval: 10000, // 10 seconds
    requestTimeout: 30000, // 30 seconds
  },

  // UI Settings
  ui: {
    theme: "system" as "light" | "dark" | "system",
    animations: true,
    compactMode: false,
  },
} as const

// Validation function
export function validateClientConfig(): string[] {
  const errors: string[] = []

  try {
    // Validate required fields
    if (!clientConfig.apiBaseUrl) {
      errors.push("API base URL is required")
    }

    // Validate URLs
    if (clientConfig.cdnUrl && !isValidUrl(clientConfig.cdnUrl)) {
      errors.push("Invalid CDN URL")
    }

    // Validate numbers
    if (clientConfig.performance.maxFileSize <= 0) {
      errors.push("Max file size must be positive")
    }

    if (clientConfig.performance.cacheTtl <= 0) {
      errors.push("Cache TTL must be positive")
    }

    // Validate environment
    const validEnvironments = ["development", "production", "staging"]
    if (!validEnvironments.includes(clientConfig.environment)) {
      errors.push(`Invalid environment: ${clientConfig.environment}`)
    }
  } catch (error) {
    errors.push(`Configuration validation error: ${error instanceof Error ? error.message : "Unknown error"}`)
  }

  return errors
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

// Helper to check if we're in development
export const isDevelopment = clientConfig.environment === "development"
export const isProduction = clientConfig.environment === "production"
