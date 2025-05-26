import type { IFileSystemProvider, FileNode } from "../interfaces/IFileSystemProvider"
import type { IPerformanceMonitor } from "../interfaces/IPerformanceMonitor"

export interface BenchmarkOptions {
  breadth: number
  depth: number
  fileSize: number
  operations: ("read" | "write" | "delete" | "search")[]
  iterations: number
}

export interface BenchmarkResult {
  providerName: string
  totalTime: number
  operationResults: {
    operation: string
    averageTime: number
    minTime: number
    maxTime: number
    successRate: number
  }[]
  treeStats: {
    totalNodes: number
    totalFiles: number
    totalDirectories: number
    maxDepth: number
    totalSize: number
  }
}

export class BenchmarkService {
  constructor(private performanceMonitor: IPerformanceMonitor) {}

  async runBenchmark(provider: IFileSystemProvider, options: BenchmarkOptions): Promise<BenchmarkResult> {
    const startTime = performance.now()

    // Initialize provider
    await provider.initialize()

    // Generate test file tree
    const testTree = this.generateTestFileTree(options.breadth, options.depth, options.fileSize)
    await provider.importFileTree(testTree)

    // Run benchmark operations
    const operationResults: BenchmarkResult["operationResults"] = []

    for (const operation of options.operations) {
      const opResult = await this.runOperation(provider, operation, options.iterations)
      operationResults.push(opResult)
    }

    const endTime = performance.now()

    // Get tree stats
    const stats = await provider.getStats()

    return {
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
    }
  }

  private async runOperation(
    provider: IFileSystemProvider,
    operation: string,
    iterations: number,
  ): Promise<BenchmarkResult["operationResults"][0]> {
    const times: number[] = []
    let successCount = 0

    for (let i = 0; i < iterations; i++) {
      const timerId = this.performanceMonitor.startTimer(`benchmark_${operation}`)

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
    const metrics = this.performanceMonitor.getMetrics().filter((m) => m.operation === `benchmark_${operation}`)

    // Calculate stats
    const opTimes = metrics.map((m) => m.duration)
    const averageTime = opTimes.reduce((sum, time) => sum + time, 0) / opTimes.length
    const minTime = Math.min(...opTimes)
    const maxTime = Math.max(...opTimes)
    const successRate = successCount / iterations

    return {
      operation,
      averageTime,
      minTime,
      maxTime,
      successRate,
    }
  }

  private async benchmarkRead(provider: IFileSystemProvider): Promise<void> {
    // Get random paths to read
    const tree = await provider.getFileTree()
    const paths = this.collectRandomPaths(tree, 10)

    // Read nodes
    for (const path of paths) {
      await provider.getNode(path)
    }

    // Get stats
    await provider.getStats()
  }

  private async benchmarkWrite(provider: IFileSystemProvider, iteration: number): Promise<void> {
    // Create directories
    const dirPath = `/benchmark/iteration-${iteration}/dir-${Date.now()}`
    await provider.createDirectory(dirPath)

    // Create files
    for (let i = 0; i < 5; i++) {
      const filePath = `${dirPath}/file-${i}.txt`
      const content = `Benchmark test file ${i} content ${Date.now()}`
      await provider.createFile(filePath, content)
    }
  }

  private async benchmarkDelete(provider: IFileSystemProvider, iteration: number): Promise<void> {
    // Create a directory to delete
    const dirPath = `/benchmark/delete-test-${iteration}`
    await provider.createDirectory(dirPath)

    // Create some files
    for (let i = 0; i < 3; i++) {
      const filePath = `${dirPath}/delete-file-${i}.txt`
      await provider.createFile(filePath, "Test content for deletion")
    }

    // Delete the directory
    await provider.deleteNode(dirPath)
  }

  private async benchmarkSearch(provider: IFileSystemProvider): Promise<void> {
    // Search for files
    await provider.searchFiles({
      query: "file",
      matchCase: false,
      includeContent: true,
      maxResults: 50,
    })
  }

  private generateTestFileTree(breadth: number, depth: number, fileSize: number): FileNode[] {
    const root: FileNode[] = []

    // Generate tree recursively
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

    // Select random paths
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
}
