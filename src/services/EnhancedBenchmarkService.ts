import type { IFileSystemProvider, FileNode } from "../interfaces/IFileSystemProvider"
import type { IPerformanceMonitor } from "../interfaces/IPerformanceMonitor"
import type { ILoggingService } from "./LoggingService"
import type { WasmFileSystemProvider } from "../providers/WasmFileSystemProvider"

export interface EnhancedBenchmarkOptions {
  breadth: number
  depth: number
  fileSize: number
  operations: ("read" | "write" | "delete" | "search")[]
  iterations: number
  useOptimizedProviders: boolean
  compareProviders: boolean
}

export interface EnhancedBenchmarkResult {
  providerName: string
  totalTime: number
  optimizedTime?: number
  operationResults: {
    operation: string
    averageTime: number
    optimizedAverageTime?: number
    minTime: number
    maxTime: number
    successRate: number
    improvement?: string
  }[]
  treeStats: {
    totalNodes: number
    totalFiles: number
    totalDirectories: number
    maxDepth: number
    totalSize: number
  }
  memoryUsage?: {
    initial: number
    peak: number
    final: number
  }
  wasmMetrics?: {
    moduleSize: number
    initTime: number
    memoryPages: number
  }
}

export class EnhancedBenchmarkService {
  constructor(
    private performanceMonitor: IPerformanceMonitor,
    private logger: ILoggingService,
  ) {
    this.logger.info("Benchmark", "EnhancedBenchmarkService initialized")
  }

  async runEnhancedBenchmark(
    provider: IFileSystemProvider,
    options: EnhancedBenchmarkOptions,
  ): Promise<EnhancedBenchmarkResult> {
    const startTime = performance.now()
    this.logger.info("Benchmark", "Starting enhanced benchmark", {
      provider: provider.name,
      options,
    })

    // Monitor memory usage
    const initialMemory = this.getMemoryUsage()

    // Initialize provider
    await provider.initialize()

    // Generate test file tree
    let testTree: FileNode[]

    if (options.useOptimizedProviders && this.isWasmProvider(provider)) {
      this.logger.info("Benchmark", "Using optimized WASM file tree generation")
      testTree = await provider.generateOptimizedFileTree(options.breadth, options.depth, options.fileSize)
    } else {
      this.logger.info("Benchmark", "Using standard file tree generation")
      testTree = this.generateTestFileTree(options.breadth, options.depth, options.fileSize)
    }

    await provider.importFileTree(testTree)

    const peakMemory = this.getMemoryUsage()

    // Run benchmark operations
    const operationResults: EnhancedBenchmarkResult["operationResults"] = []

    for (const operation of options.operations) {
      this.logger.info("Benchmark", "Running operation benchmark", { operation })

      let standardResult: any
      let optimizedResult: any

      // Run standard benchmark
      standardResult = await this.runStandardOperation(provider, operation, options.iterations)

      // Run optimized benchmark if available
      if (options.useOptimizedProviders && this.isWasmProvider(provider)) {
        this.logger.info("Benchmark", "Running optimized operation", { operation })
        optimizedResult = await this.runOptimizedOperation(provider, operation, options.iterations)
      }

      const opResult = {
        operation,
        averageTime: standardResult.averageTime,
        optimizedAverageTime: optimizedResult?.averageTime,
        minTime: standardResult.minTime,
        maxTime: standardResult.maxTime,
        successRate: standardResult.successRate,
        improvement: optimizedResult
          ? `${(((standardResult.averageTime - optimizedResult.averageTime) / standardResult.averageTime) * 100).toFixed(1)}%`
          : undefined,
      }

      operationResults.push(opResult)
    }

    const endTime = performance.now()
    const finalMemory = this.getMemoryUsage()

    // Get tree stats
    const stats = await provider.getStats()

    const result: EnhancedBenchmarkResult = {
      providerName: provider.name,
      totalTime: endTime - startTime,
      operationResults,
      treeStats: {
        totalNodes: stats.totalFiles + stats.totalDirectories,
        totalFiles: stats.totalFiles,
        totalDirectories: stats.totalDirectories,
        maxDepth: stats.maxDepth,
        totalSize: stats.totalSize,
      },
      memoryUsage: {
        initial: initialMemory,
        peak: peakMemory,
        final: finalMemory,
      },
    }

    // Add WASM-specific metrics
    if (this.isWasmProvider(provider)) {
      result.wasmMetrics = {
        moduleSize: 0, // Would be populated from actual WASM module
        initTime: 0, // Would be tracked during initialization
        memoryPages: 0, // Would be read from WASM memory
      }
    }

    this.logger.info("Benchmark", "Enhanced benchmark completed", {
      provider: provider.name,
      totalTime: result.totalTime,
      memoryUsage: result.memoryUsage,
    })

    return result
  }

  private async runStandardOperation(
    provider: IFileSystemProvider,
    operation: string,
    iterations: number,
  ): Promise<{ averageTime: number; minTime: number; maxTime: number; successRate: number }> {
    const times: number[] = []
    let successCount = 0

    for (let i = 0; i < iterations; i++) {
      const timerId = this.performanceMonitor.startTimer(`standard_${operation}`)

      try {
        switch (operation) {
          case "read":
            await this.benchmarkRead(provider)
            successCount++
            break
          case "write":
            await this.benchmarkWrite(provider, i)
            successCount++
            break
          case "delete":
            await this.benchmarkDelete(provider, i)
            successCount++
            break
          case "search":
            await this.benchmarkSearch(provider)
            successCount++
            break
        }

        this.performanceMonitor.endTimer(timerId, true)
      } catch (error) {
        this.performanceMonitor.endTimer(timerId, false, { error: error.message })
      }
    }

    // Get metrics for this operation
    const metrics = this.performanceMonitor.getMetrics().filter((m) => m.operation === `standard_${operation}`)
    const opTimes = metrics.map((m) => m.duration)

    return {
      averageTime: opTimes.reduce((sum, time) => sum + time, 0) / opTimes.length,
      minTime: Math.min(...opTimes),
      maxTime: Math.max(...opTimes),
      successRate: successCount / iterations,
    }
  }

  private async runOptimizedOperation(
    provider: WasmFileSystemProvider,
    operation: string,
    iterations: number,
  ): Promise<{ averageTime: number }> {
    const startTime = performance.now()
    const result = await provider.runOptimizedBenchmark(operation, iterations)
    const endTime = performance.now()

    return {
      averageTime: (endTime - startTime) / iterations,
    }
  }

  private async benchmarkRead(provider: IFileSystemProvider): Promise<void> {
    const tree = await provider.getFileTree()
    const paths = this.collectRandomPaths(tree, 10)

    for (const path of paths) {
      await provider.getNode(path)
    }

    await provider.getStats()
  }

  private async benchmarkWrite(provider: IFileSystemProvider, iteration: number): Promise<void> {
    const dirPath = `/benchmark/iteration-${iteration}/dir-${Date.now()}`
    await provider.createDirectory(dirPath)

    for (let i = 0; i < 5; i++) {
      const filePath = `${dirPath}/file-${i}.txt`
      const content = `Benchmark test file ${i} content ${Date.now()}`
      await provider.createFile(filePath, content)
    }
  }

  private async benchmarkDelete(provider: IFileSystemProvider, iteration: number): Promise<void> {
    const dirPath = `/benchmark/delete-test-${iteration}`
    await provider.createDirectory(dirPath)

    for (let i = 0; i < 3; i++) {
      const filePath = `${dirPath}/delete-file-${i}.txt`
      await provider.createFile(filePath, "Test content for deletion")
    }

    await provider.deleteNode(dirPath)
  }

  private async benchmarkSearch(provider: IFileSystemProvider): Promise<void> {
    await provider.searchFiles({
      query: "file",
      matchCase: false,
      includeContent: true,
      maxResults: 50,
    })
  }

  private generateTestFileTree(breadth: number, depth: number, fileSize: number): FileNode[] {
    this.logger.debug("Benchmark", "Generating test file tree", { breadth, depth, fileSize })

    const root: FileNode[] = []

    for (let i = 0; i < breadth; i++) {
      root.push(this.generateDirectory(`dir-${i}`, `/dir-${i}`, depth, breadth, fileSize))
    }

    return root
  }

  private generateDirectory(name: string, path: string, depth: number, breadth: number, fileSize: number): FileNode {
    const dir: FileNode = {
      id: `dir-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name,
      type: "directory",
      path,
      lastModified: new Date(),
      children: [],
    }

    // Add files
    for (let i = 0; i < breadth; i++) {
      const filePath = `${path}/file-${i}.txt`
      dir.children!.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: `file-${i}.txt`,
        type: "file",
        path: filePath,
        size: fileSize,
        lastModified: new Date(),
        mimeType: "text/plain",
      })
    }

    // Add subdirectories if depth > 1
    if (depth > 1) {
      for (let i = 0; i < breadth; i++) {
        const subDirName = `subdir-${i}`
        const subDirPath = `${path}/${subDirName}`
        dir.children!.push(this.generateDirectory(subDirName, subDirPath, depth - 1, breadth, fileSize))
      }
    }

    return dir
  }

  private collectRandomPaths(tree: FileNode[], count: number): string[] {
    const paths: string[] = []
    const allPaths = this.getAllPaths(tree)

    for (let i = 0; i < Math.min(count, allPaths.length); i++) {
      const randomIndex = Math.floor(Math.random() * allPaths.length)
      paths.push(allPaths[randomIndex])
    }

    return paths
  }

  private getAllPaths(tree: FileNode[]): string[] {
    const paths: string[] = []

    const traverse = (node: FileNode) => {
      paths.push(node.path)
      if (node.children) {
        node.children.forEach(traverse)
      }
    }

    tree.forEach(traverse)
    return paths
  }

  private isWasmProvider(provider: IFileSystemProvider): provider is WasmFileSystemProvider {
    return provider.name.includes("WASM")
  }

  private getMemoryUsage(): number {
    if ("memory" in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }
}
