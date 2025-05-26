import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { routes, matchRoute } from "./src/config/routes"

export function middleware(request: NextRequest) {
  // Simple middleware that just adds basic headers
  const response = NextResponse.next()

  // Add basic CORS headers for public access
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")

  // Set security headers
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

  // Set Content Security Policy
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.vercel.app; worker-src 'self' blob:;",
  )

  // Handle API rate limiting
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Add rate limiting headers
    response.headers.set("X-RateLimit-Limit", "100")
    response.headers.set("X-RateLimit-Remaining", "99")
  }

  // Handle file downloads
  if (matchRoute(request.nextUrl.pathname, routes.api.filesystem.download)) {
    // Set appropriate headers for file downloads
    response.headers.set("Cache-Control", "no-cache")
  }

  // Handle redirects for old routes
  if (request.nextUrl.pathname === "/file-explorer") {
    return NextResponse.redirect(new URL(routes.explorer, request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Apply to API routes only
    "/api/:path*",
  ],
}
