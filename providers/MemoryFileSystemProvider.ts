import type { IFileSystemProvider, FileEntry, FileStats } from "../types/interfaces"

export class MemoryFileSystemProvider implements IFileSystemProvider {
  name = "Memory"
  private fileSystem = new Map<string, { content: Uint8Array; stats: FileStats }>()
  private directories = new Set<string>()

  async initialize(): Promise<void> {
    // Initialize with some default structure
    this.directories.add("/")
    this.directories.add("/temp")
    this.directories.add("/cache")

    // Add some sample files
    this.fileSystem.set("/sample.txt", {
      content: new TextEncoder().encode("Sample file content"),
      stats: {
        size: 19,
        isDirectory: false,
        lastModified: new Date(),
        permissions: "rw-r--r--",
      },
    })
  }

  async readDirectory(path: string): Promise<FileEntry[]> {
    const entries: FileEntry[] = []
    const normalizedPath = path === "/" ? "" : path

    // Add directories
    for (const dir of this.directories) {
      if (dir !== path && dir.startsWith(normalizedPath + "/")) {
        const relativePath = dir.substring(normalizedPath.length + 1)
        if (!relativePath.includes("/")) {
          entries.push({
            name: relativePath || dir,
            path: dir,
            type: "directory",
            size: 0,
            lastModified: new Date(),
          })
        }
      }
    }

    // Add files
    for (const [filePath, data] of this.fileSystem) {
      if (filePath.startsWith(normalizedPath + "/")) {
        const relativePath = filePath.substring(normalizedPath.length + 1)
        if (!relativePath.includes("/")) {
          entries.push({
            name: relativePath,
            path: filePath,
            type: "file",
            size: data.stats.size,
            lastModified: data.stats.lastModified,
          })
        }
      }
    }

    return entries
  }

  async readFile(path: string): Promise<Uint8Array> {
    const file = this.fileSystem.get(path)
    if (!file) {
      throw new Error(`File not found: ${path}`)
    }
    return file.content
  }

  async writeFile(path: string, content: Uint8Array): Promise<void> {
    this.fileSystem.set(path, {
      content,
      stats: {
        size: content.length,
        isDirectory: false,
        lastModified: new Date(),
        permissions: "rw-r--r--",
      },
    })
  }

  async createDirectory(path: string): Promise<void> {
    this.directories.add(path)
  }

  async deleteEntry(path: string): Promise<void> {
    this.fileSystem.delete(path)
    this.directories.delete(path)
  }

  async getStats(path: string): Promise<FileStats> {
    const file = this.fileSystem.get(path)
    if (file) {
      return file.stats
    }

    if (this.directories.has(path)) {
      return {
        size: 0,
        isDirectory: true,
        lastModified: new Date(),
        permissions: "rwxr-xr-x",
      }
    }

    throw new Error(`Path not found: ${path}`)
  }
}
