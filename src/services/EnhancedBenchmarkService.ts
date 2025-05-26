import type { IFileSystemProvider } from "../interfaces/IFileSystemProvider"

export interface BenchmarkOptions {
  breadth: number
  depth: number
  fileSize: number
  operations: string[]
  iterations: number
  useOptimizedProviders?: boolean
  compareProviders?: boolean
}

export interface BenchmarkResult {
  totalTime: number
  treeStats: {
    totalFiles: number
    totalDirectories: number
  }
  operationResults: Array<{
    operation: string
    averageTime: number
    successRate: number
  }>
  memoryUsage?: {
    peak: number
  }
}

export class EnhancedBenchmarkService {
  async runEnhancedBenchmark(provider: IFileSystemProvider, options: BenchmarkOptions): Promise<BenchmarkResult> {
    const startTime = performance.now()

    // Initialize provider
    await provider.initialize()

    // Generate test data
    const testNodes = this.generateTestNodes(options.breadth, options.depth, options.fileSize)

    // Import test data
    await provider.importFileTree(testNodes)

    // Run operations
    const operationResults = []

    for (const operation of options.operations) {
      const opStartTime = performance.now()
      let successCount = 0

      for (let i = 0; i < options.iterations; i++) {
        try {
          switch (operation) {
            case "read":
              await provider.getFileTree()
              successCount++
              break
            case "write":
              await provider.createFile(`/test_${i}.txt`, `Test content ${i}`)
              successCount++
              break
            case "search":
              await provider.searchFiles({ query: "test", matchCase: false })
              successCount++
              break
            case "delete":
              try {
                await provider.deleteFile(`/test_${i}.txt`)
                successCount++
              } catch {
                // File might not exist, that's ok
                successCount++
              }
              break
          }
        } catch (error) {
          console.warn(`Operation ${operation} failed:`, error)
        }
      }

      const opEndTime = performance.now()
      operationResults.push({
        operation,
        averageTime: (opEndTime - opStartTime) / options.iterations,
        successRate: successCount / options.iterations,
      })
    }

    const endTime = performance.now()
    const stats = await provider.getStats()

    return {
      totalTime: endTime - startTime,
      treeStats: {
        totalFiles: stats.totalFiles,
        totalDirectories: stats.totalDirectories,
      },
      operationResults,
      memoryUsage: {
        peak: (performance as any).memory?.usedJSHeapSize || 0,
      },
    }
  }

  private generateTestNodes(breadth: number, depth: number, fileSize: number) {
    const nodes = []

    for (let i = 0; i < breadth; i++) {
      if (depth > 0) {
        nodes.push({
          id: `dir_${i}`,
          name: `directory_${i}`,
          type: "directory" as const,
          path: `/directory_${i}`,
          lastModified: new Date(),
          children: this.generateTestNodes(Math.max(1, breadth - 1), depth - 1, fileSize),
        })
      } else {
        nodes.push({
          id: `file_${i}`,
          name: `file_${i}.txt`,
          type: "file" as const,
          path: `/file_${i}.txt`,
          size: fileSize,
          lastModified: new Date(),
          content: "x".repeat(fileSize),
        })
      }
    }

    return nodes
  }
}
