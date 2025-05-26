"use client"

import { useEffect, useState } from "react"
import { FileTreeExplorer } from "../src/components/FileTreeExplorer"
import { DIContainer } from "../src/container/DIContainer"
import { CacheService } from "../src/services/CacheService"
import { PerformanceMonitor } from "../src/services/PerformanceMonitor"
import { FileSystemCalculator } from "../src/services/FileSystemCalculator"
import { MemoryFileSystemProvider } from "../src/providers/MemoryFileSystemProvider"

export default function HomePage() {
  const [container, setContainer] = useState<DIContainer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeContainer = async () => {
      const diContainer = new DIContainer()

      try {
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

        // Register default provider (Memory)
        diContainer.registerFactory(
          "IFileSystemProvider",
          () => {
            const monitor = diContainer.resolve("IPerformanceMonitor")
            return new MemoryFileSystemProvider(monitor)
          },
          "singleton",
        )

        setContainer(diContainer)
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
        </div>
      </div>
    )
  }

  if (!container) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to initialize application</p>
        </div>
      </div>
    )
  }

  return <FileTreeExplorer container={container} />
}
