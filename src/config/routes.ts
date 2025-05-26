/**
 * Application Routes Configuration
 * Centralized route definitions for consistent navigation
 */

export const routes = {
  // Main application routes
  home: "/",
  explorer: "/explorer",
  preview: "/preview/:fileId",
  settings: "/settings",
  health: "/health",

  // API routes
  api: {
    base: "/api",
    health: "/api/health",
    filesystem: {
      base: "/api/filesystem",
      health: "/api/filesystem/health",
      tree: "/api/filesystem/tree",
      content: "/api/filesystem/content/:fileId",
      download: "/api/filesystem/download/:fileId",
      upload: "/api/filesystem/upload",
      search: "/api/filesystem/search",
    },
    export: {
      base: "/api/export",
      health: "/api/export/health",
      image: "/api/export/image",
      pdf: "/api/export/pdf",
      csv: "/api/export/csv",
    },
    v1: {
      base: "/api/v1",
      health: "/api/v1/health",
      scenarios: "/api/v1/scenarios",
      results: "/api/v1/results",
    },
  },

  // Auth routes
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    callback: "/auth/callback",
  },
}

/**
 * Generate dynamic route with parameters
 */
export function createRoute(route: string, params: Record<string, string | number> = {}): string {
  let url = route

  // Replace route parameters
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`:${key}`, String(value))
  })

  return url
}

/**
 * Validate that a route exists in the routes configuration
 */
export function validateRoute(route: string): boolean {
  const allRoutes = getAllRoutes(routes)
  return allRoutes.includes(route)
}

/**
 * Get all defined routes as a flat array
 */
function getAllRoutes(routeObj: any, prefix = ""): string[] {
  let result: string[] = []

  for (const [key, value] of Object.entries(routeObj)) {
    if (typeof value === "string") {
      result.push(value)
    } else if (typeof value === "object" && value !== null) {
      result = result.concat(getAllRoutes(value, `${prefix}${key}.`))
    }
  }

  return result
}

/**
 * Check if current route matches a pattern
 */
export function matchRoute(currentPath: string, routePattern: string): boolean {
  // Convert route pattern with params to regex pattern
  const regexPattern = routePattern.replace(/:[a-zA-Z0-9_]+/g, "([^/]+)").replace(/\//g, "\\/")

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(currentPath)
}
