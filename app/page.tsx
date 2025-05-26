"use client"

import { useEffect, useState } from "react"
import { ThemeProvider } from "../src/styles/ThemeProvider"
import { FileTreeExplorer } from "../src/components/FileTreeExplorer"
import { MetricsDashboard } from "../src/components/MetricsDashboard"
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
import { HealthMonitoringService } from "../src/services/HealthMonitoringService"
import { ClientSideRenderingService } from "../src/services/ClientSideRenderingService"
import { PublicApiService } from "../src/services/PublicApiService"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function HomePage() {
  const [container, setContainer] = useState<DIContainer | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("explorer")

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

        // Register health monitoring service
        diContainer.registerFactory(
          "HealthMonitoringService",
          () => {
            const logger = diContainer.resolve("ILoggingService")
            const monitor = diContainer.resolve("IPerformanceMonitor")
            return new HealthMonitoringService(logger, monitor)
          },
          "singleton",
        )

        // Register client-side rendering service
        diContainer.registerFactory(
          "ClientSideRenderingService",
          () => {
            const logger = diContainer.resolve("ILoggingService")
            return new ClientSideRenderingService(logger)
          },
          "singleton",
        )

        // Register public API service
        diContainer.registerFactory(
          "PublicApiService",
          () => {
            const logger = diContainer.resolve("ILoggingService")
            return new PublicApiService(logger, "/api/v1")
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

        // Register image export service with fallback
        diContainer.registerFactory(
          "ImageExportService",
          () => {
            const phpProvider = diContainer.resolve("PhpImageProvider")
            const clientRenderer = diContainer.resolve("ClientSideRenderingService")
            const logger = diContainer.resolve("ILoggingService")
            const monitor = diContainer.resolve("IPerformanceMonitor")

            // Enhanced service with fallback capability
            const service = new ImageExportService(phpProvider, logger, monitor)

            // Add fallback method
            const originalExport = service.exportFileTreeAsImage.bind(service)
            service.exportFileTreeAsImage = async (fileTree, options) => {
              try {
                // Try primary export method
                const result = await originalExport(fileTree, options)
                if (result.success) {
                  return result
                }

                // Fallback to client-side rendering
                logger.warn("ImageExport", "Primary export failed, using client-side fallback", { error: result.error })

                const fallbackResult = await clientRenderer.renderFileTree(fileTree, {
                  width: options.width,
                  height: options.height,
                  format: options.format,
                  theme: options.theme
                    ? require("../src/utils/PreviewThemes").getTheme(options.theme)
                    : require("../src/utils/PreviewThemes").getTheme("modern"),
                  structure: options.structure || "hierarchical",
                  quality: options.quality,
                  scale: 1,
                })

                return fallbackResult
              } catch (error) {
                logger.error("ImageExport", "Both primary and fallback export failed", { error: error.message })
                return {
                  success: false,
                  error: error.message,
                }
              }
            }

            return service
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

        // Start health monitoring
        const healthService = diContainer.resolve("HealthMonitoringService")
        healthService.startMonitoring()

        setContainer(diContainer)

        // Log initialization success
        const logger = diContainer.resolve("ILoggingService")
        logger.info("App", "Application initialized successfully", {
          services: diContainer.getRegisteredServices().length,
          timestamp: new Date().toISOString(),
          features: [
            "Metrics Dashboard",
            "Health Monitoring",
            "Client-side Fallback",
            "Public API",
            "PHP-CGI WASM Integration",
            "WebAssembly Support",
          ],
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
        // Stop health monitoring
        try {
          const healthService = container.resolve("HealthMonitoringService")
          healthService.stopMonitoring()
        } catch (e) {
          // Service might not be available
        }
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
          <div className="text-sm text-gray-500 mt-2 space-y-1">
            <p>✓ Loading WASM modules</p>
            <p>✓ Initializing PHP-CGI integration</p>
            <p>✓ Setting up health monitoring</p>
            <p>✓ Configuring fallback systems</p>
            <p>✓ Starting public API</p>
          </div>
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
      <div className="min-h-screen bg-background">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b">
            <div className="container mx-auto">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="explorer">File Explorer</TabsTrigger>
                <TabsTrigger value="metrics">Metrics Dashboard</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="explorer" className="mt-0">
            <FileTreeExplorer container={container} />
          </TabsContent>

          <TabsContent value="metrics" className="mt-0">
            <div className="container mx-auto p-4">
              <MetricsDashboard container={container} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ThemeProvider>
  )
}
