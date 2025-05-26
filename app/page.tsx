"use client"

import { useState, useEffect } from "react"
import { FileTreeExplorer } from "@/src/components/FileTreeExplorer"
import { FilePreview } from "@/src/components/FilePreview"
import { BenchmarkPanel } from "@/src/components/BenchmarkPanel"
import { ImageExportPanel } from "@/src/components/ImageExportPanel"
import { MetricsDashboard } from "@/src/components/MetricsDashboard"
import { ErrorDashboard } from "@/src/components/ErrorDashboard"
import { ErrorBoundary } from "@/src/components/ErrorBoundary"
import { DIContainer } from "@/src/container/DIContainer"
import { WasmFileSystemProvider } from "@/src/providers/WasmFileSystemProvider"
import { MemoryFileSystemProvider } from "@/src/providers/MemoryFileSystemProvider"
import { CacheService } from "@/src/services/CacheService"
import { FileSystemCalculator } from "@/src/services/FileSystemCalculator"
import { PerformanceMonitor } from "@/src/services/PerformanceMonitor"
import { ImageExportService } from "@/src/services/ImageExportService"
import { LoggingService } from "@/src/services/LoggingService"
import { errorTracker } from "@/src/services/ErrorTrackingService"
import type { FileNode } from "@/src/interfaces/IFileSystemProvider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { safeString, isNullOrUndefined } from "@/src/utils/type-guards"

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)
  const [container, setContainer] = useState<DIContainer | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeContainer = async () => {
      try {
        const diContainer = new DIContainer()

        // Register services with error tracking
        try {
          diContainer.registerInstance("LoggingService", new LoggingService())
          diContainer.registerInstance("CacheService", new CacheService())
          diContainer.registerInstance("PerformanceMonitor", new PerformanceMonitor())
          diContainer.registerInstance("FileSystemCalculator", new FileSystemCalculator())
          diContainer.registerInstance("ImageExportService", new ImageExportService())

          // Register file system providers
          diContainer.registerInstance("WasmFileSystemProvider", new WasmFileSystemProvider())
          diContainer.registerInstance("MemoryFileSystemProvider", new MemoryFileSystemProvider())

          // Set default provider
          diContainer.registerInstance("IFileSystemProvider", diContainer.resolve("MemoryFileSystemProvider"))

          setContainer(diContainer)
          setIsInitialized(true)

          errorTracker.captureError("Application initialized successfully", {
            type: "system",
            severity: "low",
            component: "App",
            action: "initialization",
          })
        } catch (serviceError) {
          errorTracker.captureError(serviceError, {
            type: "system",
            severity: "critical",
            component: "App",
            action: "service_registration",
            shouldDelegate: true,
            delegationReason: "Critical failure during service registration",
          })
          throw serviceError
        }
      } catch (error) {
        errorTracker.captureError(error, {
          type: "system",
          severity: "critical",
          component: "App",
          action: "container_initialization",
          shouldDelegate: true,
          delegationReason: "Application failed to initialize",
        })
        console.error("Failed to initialize DI container:", error)
      }
    }

    initializeContainer()
  }, [])

  const handleFileSelect = (file: FileNode | null) => {
    try {
      setSelectedFile(file)

      if (file) {
        errorTracker.captureError(`File selected: ${safeString(file.name)}`, {
          type: "user",
          severity: "low",
          component: "App",
          action: "file_selection",
          metadata: {
            fileName: safeString(file.name),
            fileType: safeString(file.type),
            filePath: safeString(file.path),
          },
        })
      }
    } catch (error) {
      errorTracker.captureError(error, {
        type: "runtime",
        severity: "medium",
        component: "App",
        action: "file_selection",
      })
    }
  }

  if (!isInitialized || isNullOrUndefined(container)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary component="App">
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">File Tree Explorer</h1>
            <p className="text-gray-600">
              Enterprise-level file system explorer with advanced visualization and error tracking
            </p>
          </div>

          <Tabs defaultValue="explorer" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="explorer">Explorer</TabsTrigger>
              <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="errors">Errors</TabsTrigger>
            </TabsList>

            <TabsContent value="explorer" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
                <ErrorBoundary component="FileTreeExplorer">
                  <FileTreeExplorer container={container} onFileSelect={handleFileSelect} selectedFile={selectedFile} />
                </ErrorBoundary>

                <ErrorBoundary component="FilePreview">
                  <FilePreview file={selectedFile} container={container} />
                </ErrorBoundary>
              </div>
            </TabsContent>

            <TabsContent value="benchmark">
              <ErrorBoundary component="BenchmarkPanel">
                <BenchmarkPanel container={container} />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="export">
              <ErrorBoundary component="ImageExportPanel">
                <ImageExportPanel container={container} />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="metrics">
              <ErrorBoundary component="MetricsDashboard">
                <MetricsDashboard container={container} />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="errors">
              <ErrorBoundary component="ErrorDashboard">
                <ErrorDashboard />
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ErrorBoundary>
  )
}
