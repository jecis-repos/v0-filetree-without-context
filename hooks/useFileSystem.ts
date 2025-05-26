"use client"

import { useState, useEffect, useCallback } from "react"
import type {
  FileEntry,
  IFileSystemProvider,
  IFileSystemCalculator,
  ICacheService,
  IPerformanceMonitor,
} from "../types/interfaces"
import { DependencyContainer } from "../container/DependencyContainer"
import { WasmFileSystemProvider } from "../providers/WasmFileSystemProvider"
import { MemoryFileSystemProvider } from "../providers/MemoryFileSystemProvider"
import { CacheService } from "../services/cache/CacheService"
import { PerformanceMonitor } from "../services/performance/PerformanceMonitor"
import { FileSystemCalculator } from "../services/business/FileSystemCalculator"
import { FileSystemManipulator } from "../services/business/FileSystemManipulator"

export function useFileSystem() {
  const [container] = useState(() => new DependencyContainer())
  const [currentPath, setCurrentPath] = useState("/")
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentProvider, setCurrentProvider] = useState("wasmProvider")

  // Initialize container
  useEffect(() => {
    const initializeContainer = async () => {
      try {
        // Register providers
        container.register("wasmProvider", () => new WasmFileSystemProvider(), true)
        container.register("memoryProvider", () => new MemoryFileSystemProvider(), true)
        container.register("cacheService", () => new CacheService(1000, "LRU"), true)
        container.register("performanceMonitor", () => new PerformanceMonitor(), true)

        // Register current provider as the active one
        container.registerInstance("fileSystemProvider", container.resolve(currentProvider))

        // Register business services
        container.register(
          "fileSystemCalculator",
          () => {
            return new FileSystemCalculator(container.resolve("fileSystemProvider"), container.resolve("cacheService"))
          },
          true,
        )

        container.register(
          "fileSystemManipulator",
          () => {
            return new FileSystemManipulator(container.resolve("fileSystemProvider"), container.resolve("cacheService"))
          },
          true,
        )

        // Initialize the current provider
        const provider = container.resolve<IFileSystemProvider>("fileSystemProvider")
        await provider.initialize()

        loadDirectory("/")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize file system")
      }
    }

    initializeContainer()
  }, [container, currentProvider])

  const loadDirectory = useCallback(
    async (path: string) => {
      setLoading(true)
      setError(null)

      try {
        const performanceMonitor = container.resolve<IPerformanceMonitor>("performanceMonitor")
        const provider = container.resolve<IFileSystemProvider>("fileSystemProvider")

        const timerId = performanceMonitor.startTimer("loadDirectory")
        const entries = await provider.readDirectory(path)
        performanceMonitor.endTimer(timerId)

        setFiles(entries)
        setCurrentPath(path)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load directory")
      } finally {
        setLoading(false)
      }
    },
    [container],
  )

  const switchProvider = useCallback(
    async (providerName: string) => {
      try {
        setLoading(true)

        // Switch provider in container
        const newProvider = container.resolve<IFileSystemProvider>(providerName)
        container.registerInstance("fileSystemProvider", newProvider)

        // Re-register dependent services
        container.register(
          "fileSystemCalculator",
          () => {
            return new FileSystemCalculator(container.resolve("fileSystemProvider"), container.resolve("cacheService"))
          },
          true,
        )

        container.register(
          "fileSystemManipulator",
          () => {
            return new FileSystemManipulator(container.resolve("fileSystemProvider"), container.resolve("cacheService"))
          },
          true,
        )

        await newProvider.initialize()
        setCurrentProvider(providerName)
        await loadDirectory("/")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to switch provider")
      } finally {
        setLoading(false)
      }
    },
    [container, loadDirectory],
  )

  const calculateDirectorySize = useCallback(
    async (path: string) => {
      const calculator = container.resolve<IFileSystemCalculator>("fileSystemCalculator")
      return await calculator.calculateDirectorySize(path)
    },
    [container],
  )

  const getPerformanceMetrics = useCallback(() => {
    const monitor = container.resolve<IPerformanceMonitor>("performanceMonitor")
    return monitor.getMetrics()
  }, [container])

  const getCacheStats = useCallback(() => {
    const cache = container.resolve<ICacheService>("cacheService")
    return cache.getStats()
  }, [container])

  return {
    files,
    currentPath,
    loading,
    error,
    currentProvider,
    loadDirectory,
    switchProvider,
    calculateDirectorySize,
    getPerformanceMetrics,
    getCacheStats,
    container,
  }
}
