"use client"

import { useEffect, useState } from "react"
import { ThemeProvider } from "../src/styles/ThemeProvider"
import { FileTreeExplorer } from "../src/components/FileTreeExplorer"
import { DIContainer } from "../src/container/DIContainer"
import { CacheService } from "../src/services/CacheService"
import { PerformanceMonitor } from "../src/services/PerformanceMonitor"
import { FileSystemCalculator } from "../src/services/FileSystemCalculator"
import { MemoryFileSystemProvider } from "../src/providers/MemoryFileSystemProvider"
import { WasmFileSystemProvider } from "../src/providers/WasmFileSystemProvider"
import { FileImporter } from "../src/services/FileImporter"
import { EnhancedBenchmarkService } from "../src/services/EnhancedBenchmarkService"
import { LoggingService } from "../src/services/LoggingService"
import { PhpImageProvider } from "../src/providers/PhpImageProvider"
import { ImageExportService } from "../src/services/ImageExportService"

export default function HomePage() {
  const [container, setContainer] = useState<DIContainer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeContainer = async () => {
      const diContainer = new DIContainer()

      try {
        // Register logging service first
        diContainer.registerFactory("ILoggingService", () => new LoggingService(2000), "singleton")

        // Register core services
        diContainer.registerFactory("ICacheService", () => new CacheService(1000, 300000, "LRU"), "singleton")

        diContainer.registerFactory("IPerformanceMonitor", () => new PerformanceMonitor(1000), "singleton")

        diContainer.registerFactory(
          "IFileSystemCalculator",
          () => {
            const cache = diContainer.resolve("ICacheService")
            return new FileSystemCalculator(cache)
          },
          "singleton",
        )

        // Register file importer
        diContainer.registerFactory(
          "IFileImporter",
          () => {
            const monitor = diContainer.resolve("IPerformanceMonitor")
            return new FileImporter(monitor)
          },
          "singleton",
        )

        // Register enhanced benchmark service
        diContainer.registerFactory(
          "EnhancedBenchmarkService",
          () => {
            const monitor = diContainer.resolve("IPerformanceMonitor")
            const logger = diContainer.resolve("ILoggingService")
            return new EnhancedBenchmarkService(monitor, logger)
          },
          "singleton",
        )

        // Register PHP image provider
        diContainer.registerFactory(
          "PhpImageProvider",
          () => {
            const logger = diContainer.resolve("ILoggingService")
            const monitor = diContainer.resolve("IPerformanceMonitor")
            return new PhpImageProvider(logger, monitor, {
              phpEndpoint: "/api/php/image-generator.php",
              apiKey: process.env.NEXT_PUBLIC_PHP_API_KEY,
            })
          },
          "singleton",
        )

        // Register image export service
        diContainer.registerFactory(
          "ImageExportService",
          () => {
            const phpProvider = diContainer.resolve("PhpImageProvider")
            const logger = diContainer.resolve("ILoggingService")
            const monitor = diContainer.resolve("IPerformanceMonitor")
            return new ImageExportService(phpProvider, logger, monitor)
          },
          "singleton",
        )

        // Register default provider (Memory)
        diContainer.registerFactory(
          "IFileSystemProvider",
          () => {
            const monitor = diContainer.resolve("IPerformanceMonitor")
            const logger = diContainer.resolve("ILoggingService")
            return new MemoryFileSystemProvider(monitor)
          },
          "singleton",
        )

        // Register WASM provider
        diContainer.registerFactory(
          "WasmFileSystemProvider",
          () => {
            const monitor = diContainer.resolve("IPerformanceMonitor")
            const logger = diContainer.resolve("ILoggingService")
            return new WasmFileSystemProvider(monitor, logger, {
              wasmPath: "/wasm/filesystem.wasm",
              enableOptimizations: true,
            })
          },
          "singleton",
        )

        setContainer(diContainer)

        // Log initialization success
        const logger = diContainer.resolve("ILoggingService")
        logger.info("App", "Application initialized successfully", {
          services: diContainer.getRegisteredServices().length,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error("Failed to initialize DI container:", error)
      } finally {
        setLoading(false)
      }
    }

    initializeContainer()

    return () => {
      if (container) {
        container.dispose()
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Enterprise File System...</p>
          <p className="text-sm text-gray-500 mt-2">Loading WASM modules and PHP integrations...</p>
        </div>
      </div>
    )
  }

  if (!container) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to initialize application</p>
          <p className="text-sm text-gray-500 mt-2">Check console for detailed error logs</p>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider>
      <FileTreeExplorer container={container} />
    </ThemeProvider>
  )
}
