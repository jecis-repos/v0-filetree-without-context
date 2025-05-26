import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { routes } from "@/src/config/routes"

export const metadata: Metadata = {
  title: "Enterprise File Explorer",
  description: "Advanced file system explorer with visualization capabilities",
  generator: "v0.dev",
  // Add security meta tags
  other: {
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.vercel.app; worker-src 'self' blob:;",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Add preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

        {/* Add favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        <div className="flex min-h-screen flex-col">
          <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <a href={routes.home} className="font-bold text-xl">
                  Enterprise File Explorer
                </a>
                <nav className="hidden md:flex space-x-4">
                  <a
                    href={routes.home}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  >
                    Home
                  </a>
                  <a
                    href={routes.explorer}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  >
                    Explorer
                  </a>
                  <a
                    href="/health"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  >
                    Health
                  </a>
                  <a
                    href="/settings"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  >
                    Settings
                  </a>
                </nav>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href="/api/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full"
                >
                  API Status
                </a>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 py-4">
            <div className="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
              <p>© {new Date().getFullYear()} Enterprise File Explorer. All rights reserved.</p>
              <div className="mt-2 flex justify-center space-x-4">
                <a href="/health" className="hover:text-gray-900 dark:hover:text-gray-100">
                  Health Status
                </a>
                <a href="/api/v1/health" className="hover:text-gray-900 dark:hover:text-gray-100">
                  API Status
                </a>
                <a href="/api/deployment/check" className="hover:text-gray-900 dark:hover:text-gray-100">
                  Deployment Check
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
