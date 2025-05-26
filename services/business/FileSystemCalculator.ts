import type { IFileSystemCalculator, IFileSystemProvider, FileEntry, ICacheService } from "../../types/interfaces"

export class FileSystemCalculator implements IFileSystemCalculator {
  constructor(
    private provider: IFileSystemProvider,
    private cache: ICacheService,
  ) {}

  async calculateDirectorySize(path: string): Promise<number> {
    const cacheKey = `dir_size_${path}`
    const cached = this.cache.get<number>(cacheKey)
    if (cached !== null) return cached

    let totalSize = 0
    const entries = await this.provider.readDirectory(path)

    for (const entry of entries) {
      if (entry.type === "directory") {
        totalSize += await this.calculateDirectorySize(entry.path)
      } else {
        totalSize += entry.size
      }
    }

    this.cache.set(cacheKey, totalSize, 30000) // Cache for 30 seconds
    return totalSize
  }

  async calculateFileCount(path: string): Promise<number> {
    const cacheKey = `file_count_${path}`
    const cached = this.cache.get<number>(cacheKey)
    if (cached !== null) return cached

    let count = 0
    const entries = await this.provider.readDirectory(path)

    for (const entry of entries) {
      if (entry.type === "file") {
        count++
      } else {
        count += await this.calculateFileCount(entry.path)
      }
    }

    this.cache.set(cacheKey, count, 30000)
    return count
  }

  async calculateDepth(path: string): Promise<number> {
    const cacheKey = `depth_${path}`
    const cached = this.cache.get<number>(cacheKey)
    if (cached !== null) return cached

    let maxDepth = 0
    const entries = await this.provider.readDirectory(path)

    for (const entry of entries) {
      if (entry.type === "directory") {
        const depth = await this.calculateDepth(entry.path)
        maxDepth = Math.max(maxDepth, depth + 1)
      }
    }

    this.cache.set(cacheKey, maxDepth, 30000)
    return maxDepth
  }

  async findLargestFiles(path: string, limit: number): Promise<FileEntry[]> {
    const cacheKey = `largest_files_${path}_${limit}`
    const cached = this.cache.get<FileEntry[]>(cacheKey)
    if (cached !== null) return cached

    const allFiles: FileEntry[] = []
    await this.collectAllFiles(path, allFiles)

    const largest = allFiles.sort((a, b) => b.size - a.size).slice(0, limit)

    this.cache.set(cacheKey, largest, 60000) // Cache for 1 minute
    return largest
  }

  private async collectAllFiles(path: string, files: FileEntry[]): Promise<void> {
    const entries = await this.provider.readDirectory(path)

    for (const entry of entries) {
      if (entry.type === "file") {
        files.push(entry)
      } else {
        await this.collectAllFiles(entry.path, files)
      }
    }
  }
}
