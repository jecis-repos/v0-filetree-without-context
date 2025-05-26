// Core interfaces for the enterprise architecture
export interface IFileSystemProvider {
  name: string
  initialize(): Promise<void>
  readDirectory(path: string): Promise<FileEntry[]>
  readFile(path: string): Promise<Uint8Array>
  writeFile(path: string, content: Uint8Array): Promise<void>
  createDirectory(path: string): Promise<void>
  deleteEntry(path: string): Promise<void>
  getStats(path: string): Promise<FileStats>
}

export interface IFileSystemCalculator {
  calculateDirectorySize(path: string): Promise<number>
  calculateFileCount(path: string): Promise<number>
  calculateDepth(path: string): Promise<number>
  findLargestFiles(path: string, limit: number): Promise<FileEntry[]>
}

export interface IFileSystemManipulator {
  copyEntry(source: string, destination: string): Promise<void>
  moveEntry(source: string, destination: string): Promise<void>
  renameEntry(oldPath: string, newPath: string): Promise<void>
  duplicateEntry(path: string): Promise<string>
}

export interface ICacheService {
  get<T>(key: string): T | null
  set<T>(key: string, value: T, ttl?: number): void
  delete(key: string): void
  clear(): void
  getStats(): CacheStats
  setEvictionStrategy(strategy: EvictionStrategy): void
}

export interface IPerformanceMonitor {
  startTimer(operation: string): string
  endTimer(timerId: string): number
  recordMetric(name: string, value: number): void
  getMetrics(): PerformanceMetrics
  reset(): void
}

export interface IDependencyContainer {
  register<T>(name: string, factory: () => T, singleton?: boolean): void
  registerInstance<T>(name: string, instance: T): void
  resolve<T>(name: string): T
  configure(config: DIConfiguration): void
  switchProvider(providerType: string, providerName: string): void
}

// Data types
export interface FileEntry {
  name: string
  path: string
  type: "file" | "directory"
  size: number
  lastModified: Date
  children?: FileEntry[]
}

export interface FileStats {
  size: number
  isDirectory: boolean
  lastModified: Date
  permissions: string
}

export interface CacheStats {
  hits: number
  misses: number
  size: number
  maxSize: number
  evictions: number
}

export interface PerformanceMetrics {
  operations: Record<string, number[]>
  averages: Record<string, number>
  totalOperations: number
}

export type EvictionStrategy = "LRU" | "LFU" | "FIFO" | "TTL"

export interface DIConfiguration {
  providers: Record<string, ProviderConfig>
  services: Record<string, ServiceConfig>
  defaultProvider: string
}

export interface ProviderConfig {
  class: string
  singleton: boolean
  dependencies?: string[]
}

export interface ServiceConfig {
  class: string
  singleton: boolean
  dependencies?: string[]
}
