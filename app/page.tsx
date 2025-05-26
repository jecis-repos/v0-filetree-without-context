"use client"

import { useEffect, useState } from "react"
import { FileTreeExplorer } from "../src/components/FileTreeExplorer"
import { ThemeProvider } from "../src/styles/ThemeProvider"
import { ErrorBoundary } from "../src/components/ErrorBoundary"
import { DIContainer } from "../src/container/DIContainer"
import { LoggingService } from "../src/services/LoggingService"
import { MemoryFileSystemProvider } from "../src/providers/MemoryFileSystemProvider"
import { PerformanceMonitor } from "../src/services/PerformanceMonitor"
import { CacheService } from "../src/services/CacheService"
import { FileSystemCalculator } from "../src/services/FileSystemCalculator"
import diConfig from "../src/config/di-config.json"

export default function Home() {
  const [container, setContainer] = useState<DIContainer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeContainer = async () => {
      try {
        setIsLoading(true)
        const newContainer = new DIContainer()

        // Register concrete implementations first
        const loggingService = new LoggingService(1000)
        const performanceMonitor = new PerformanceMonitor()
        const cacheService = new CacheService()
        const fileSystemCalculator = new FileSystemCalculator(cacheService)
        const memoryProvider = new MemoryFileSystemProvider(performanceMonitor)

        // Register services in container
        newContainer.registerInstance("ILoggingService", loggingService)
        newContainer.registerInstance("IPerformanceMonitor", performanceMonitor)
        newContainer.registerInstance("ICacheService", cacheService)
        newContainer.registerInstance("IFileSystemCalculator", fileSystemCalculator)
        newContainer.registerInstance("IFileSystemProvider", memoryProvider)

        // Try to register WASM provider if available
        try {
          const { WasmFileSystemProvider } = require("../src/providers/WasmFileSystemProvider")
          newContainer.registerInstance("WasmFileSystemProvider", new WasmFileSystemProvider(performanceMonitor))
        } catch (error) {
          console.warn("WASM provider not available:", error)
        }

        // Load configuration for any additional services
        newContainer.loadConfiguration(diConfig)

        // Log successful initialization
        loggingService.info("System", "DI Container initialized successfully")

        setContainer(newContainer)
        setError(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
        console.error("Failed to initialize DI container:", err)
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    initializeContainer()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-red-800 mb-2">Initialization Failed</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!container) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Container not available</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <main className="min-h-screen bg-background">
          <FileTreeExplorer container={container} />
        </main>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
