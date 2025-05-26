import type { IFileSystemCalculator } from "../interfaces/IFileSystemCalculator"
import type { FileNode, FileSystemStats } from "../interfaces/IFileSystemProvider"
import type { ICacheService } from "../interfaces/ICacheService"

export class FileSystemCalculator implements IFileSystemCalculator {
  constructor(private cacheService?: ICacheService) {}

  calculateStats(nodes: FileNode[]): FileSystemStats {
    const cacheKey = `stats_${this.generateNodesHash(nodes)}`

    if (this.cacheService) {
      const cached = this.cacheService.get<FileSystemStats>(cacheKey)
      if (cached) return cached
    }

    const stats: FileSystemStats = {
      totalFiles: 0,
      totalDirectories: 0,
      totalSize: 0,
      maxDepth: 0,
      largestFile: undefined,
    }

    const traverse = (node: FileNode, depth = 0) => {
      stats.maxDepth = Math.max(stats.maxDepth, depth)

      if (node.type === "file") {
        stats.totalFiles++
        const size = node.size || 0
        stats.totalSize += size

        if (!stats.largestFile || size > (stats.largestFile.size || 0)) {
          stats.largestFile = node
        }
      } else {
        stats.totalDirectories++
      }

      if (node.children) {
        node.children.forEach((child) => traverse(child, depth + 1))
      }
    }

    nodes.forEach((node) => traverse(node))

    if (this.cacheService) {
      this.cacheService.set(cacheKey, stats, 60000) // Cache for 1 minute
    }

    return stats
  }

  calculateDirectorySize(node: FileNode): number {
    if (node.type === "file") {
      return node.size || 0
    }

    let totalSize = 0
    if (node.children) {
      for (const child of node.children) {
        totalSize += this.calculateDirectorySize(child)
      }
    }

    return totalSize
  }

  findLargestFiles(nodes: FileNode[], count: number): FileNode[] {
    const allFiles: FileNode[] = []

    const collectFiles = (node: FileNode) => {
      if (node.type === "file") {
        allFiles.push(node)
      }
      if (node.children) {
        node.children.forEach(collectFiles)
      }
    }

    nodes.forEach(collectFiles)

    return allFiles.sort((a, b) => (b.size || 0) - (a.size || 0)).slice(0, count)
  }

  calculateDepth(nodes: FileNode[]): number {
    let maxDepth = 0

    const traverse = (node: FileNode, depth = 0) => {
      maxDepth = Math.max(maxDepth, depth)
      if (node.children) {
        node.children.forEach((child) => traverse(child, depth + 1))
      }
    }

    nodes.forEach((node) => traverse(node))
    return maxDepth
  }

  filterByType(nodes: FileNode[], type: "file" | "directory"): FileNode[] {
    const result: FileNode[] = []

    const traverse = (node: FileNode) => {
      if (node.type === type) {
        result.push(node)
      }
      if (node.children) {
        node.children.forEach(traverse)
      }
    }

    nodes.forEach(traverse)
    return result
  }

  searchNodes(nodes: FileNode[], query: string): FileNode[] {
    const result: FileNode[] = []
    const lowerQuery = query.toLowerCase()

    const traverse = (node: FileNode) => {
      if (node.name.toLowerCase().includes(lowerQuery)) {
        result.push(node)
      }
      if (node.children) {
        node.children.forEach(traverse)
      }
    }

    nodes.forEach(traverse)
    return result
  }

  private generateNodesHash(nodes: FileNode[]): string {
    // Simple hash generation for caching
    return btoa(JSON.stringify(nodes.map((n) => ({ id: n.id, name: n.name, type: n.type })))).slice(0, 16)
  }
}
