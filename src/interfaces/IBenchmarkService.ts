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

export interface IBenchmarkService {
  runBenchmark(provider: any, options: BenchmarkOptions): Promise<BenchmarkResult>
}
