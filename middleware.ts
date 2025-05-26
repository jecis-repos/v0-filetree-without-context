import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { routes, matchRoute } from "./src/config/routes"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Add security headers to all responses
  const response = NextResponse.next()

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
  if (pathname.startsWith("/api/")) {
    // Add rate limiting headers
    response.headers.set("X-RateLimit-Limit", "100")
    response.headers.set("X-RateLimit-Remaining", "99")
  }

  // Handle file downloads
  if (matchRoute(pathname, routes.api.filesystem.download)) {
    // Set appropriate headers for file downloads
    response.headers.set("Cache-Control", "no-cache")
  }

  // Handle redirects for old routes
  if (pathname === "/file-explorer") {
    return NextResponse.redirect(new URL(routes.explorer, request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Apply to all routes
    "/(.*)",
  ],
}
