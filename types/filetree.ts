export interface FileNode {
  name: string
  type: "file" | "directory"
  path: string
  size?: number
  modified?: Date
  children?: FileNode[]
  expanded?: boolean
}

export interface FileTreeConfig {
  showHidden: boolean
  sortBy: "name" | "size" | "modified"
  sortOrder: "asc" | "desc"
  maxDepth: number
  renderEngine: "html" | "canvas" | "ascii" | "wasm" | "php-wasm"
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface PerformanceMetrics {
  renderTime: number
  cacheHits: number
  cacheMisses: number
  wasmLoadTime?: number
}
