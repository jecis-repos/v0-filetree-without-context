import type { IFileSystemProvider, FileNode, FileSystemStats } from "../interfaces/IFileSystemProvider"
import type { IPerformanceMonitor } from "../interfaces/IPerformanceMonitor"

export class MemoryFileSystemProvider implements IFileSystemProvider {
  readonly name = "Memory"
  private fileTree: FileNode[] = []
  private initialized = false

  constructor(
    private performanceMonitor?: IPerformanceMonitor,
    private config?: { initialData?: FileNode[] },
  ) {
    if (config?.initialData) {
      this.fileTree = [...config.initialData]
    }
  }

  async initialize(): Promise<void> {
    const timerId = this.performanceMonitor?.startTimer("memory_initialize")

    try {
      if (this.fileTree.length === 0) {
        this.fileTree = this.generateDefaultFileTree()
      }
      this.initialized = true
      this.performanceMonitor?.endTimer(timerId!, true)
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      throw error
    }
  }

  async getFileTree(): Promise<FileNode[]> {
    if (!this.initialized) {
      throw new Error("Provider not initialized")
    }

    const timerId = this.performanceMonitor?.startTimer("memory_get_file_tree")

    try {
      // Deep clone to prevent external modifications
      const result = JSON.parse(JSON.stringify(this.fileTree))
      this.performanceMonitor?.endTimer(timerId!, true)
      return result
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      throw error
    }
  }

  async getNode(path: string): Promise<FileNode | null> {
    const timerId = this.performanceMonitor?.startTimer("memory_get_node")

    try {
      const node = this.findNodeByPath(this.fileTree, path)
      this.performanceMonitor?.endTimer(timerId!, true)
      return node ? JSON.parse(JSON.stringify(node)) : null
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      throw error
    }
  }

  async createDirectory(path: string): Promise<void> {
    const timerId = this.performanceMonitor?.startTimer("memory_create_directory")

    try {
      const pathParts = path.split("/").filter(Boolean)
      const name = pathParts[pathParts.length - 1]
      const parentPath = "/" + pathParts.slice(0, -1).join("/")

      const parent = parentPath === "/" ? null : this.findNodeByPath(this.fileTree, parentPath)
      const newNode: FileNode = {
        id: Date.now().toString(),
        name,
        type: "directory",
        path,
        children: [],
        lastModified: new Date(),
      }

      if (parent) {
        parent.children = parent.children || []
        parent.children.push(newNode)
      } else {
        this.fileTree.push(newNode)
      }

      this.performanceMonitor?.endTimer(timerId!, true)
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      throw error
    }
  }

  async deleteNode(path: string): Promise<void> {
    const timerId = this.performanceMonitor?.startTimer("memory_delete_node")

    try {
      const pathParts = path.split("/").filter(Boolean)
      const parentPath = "/" + pathParts.slice(0, -1).join("/")

      if (parentPath === "/") {
        this.fileTree = this.fileTree.filter((node) => node.path !== path)
      } else {
        const parent = this.findNodeByPath(this.fileTree, parentPath)
        if (parent && parent.children) {
          parent.children = parent.children.filter((node) => node.path !== path)
        }
      }

      this.performanceMonitor?.endTimer(timerId!, true)
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      throw error
    }
  }

  async moveNode(fromPath: string, toPath: string): Promise<void> {
    const timerId = this.performanceMonitor?.startTimer("memory_move_node")

    try {
      const node = this.findNodeByPath(this.fileTree, fromPath)
      if (!node) {
        throw new Error(`Node not found: ${fromPath}`)
      }

      await this.deleteNode(fromPath)

      // Update node path and add to new location
      node.path = toPath
      const pathParts = toPath.split("/").filter(Boolean)
      const parentPath = "/" + pathParts.slice(0, -1).join("/")

      if (parentPath === "/") {
        this.fileTree.push(node)
      } else {
        const parent = this.findNodeByPath(this.fileTree, parentPath)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(node)
        }
      }

      this.performanceMonitor?.endTimer(timerId!, true)
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      throw error
    }
  }

  async copyNode(fromPath: string, toPath: string): Promise<void> {
    const timerId = this.performanceMonitor?.startTimer("memory_copy_node")

    try {
      const node = this.findNodeByPath(this.fileTree, fromPath)
      if (!node) {
        throw new Error(`Node not found: ${fromPath}`)
      }

      const copy = JSON.parse(JSON.stringify(node))
      copy.id = Date.now().toString()
      copy.path = toPath
      copy.lastModified = new Date()

      const pathParts = toPath.split("/").filter(Boolean)
      const parentPath = "/" + pathParts.slice(0, -1).join("/")

      if (parentPath === "/") {
        this.fileTree.push(copy)
      } else {
        const parent = this.findNodeByPath(this.fileTree, parentPath)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(copy)
        }
      }

      this.performanceMonitor?.endTimer(timerId!, true)
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      throw error
    }
  }

  async getStats(): Promise<FileSystemStats> {
    const timerId = this.performanceMonitor?.startTimer("memory_get_stats")

    try {
      const stats: FileSystemStats = {
        totalFiles: 0,
        totalDirectories: 0,
        totalSize: 0,
        maxDepth: 0,
      }

      const traverse = (node: FileNode, depth = 0) => {
        stats.maxDepth = Math.max(stats.maxDepth, depth)

        if (node.type === "file") {
          stats.totalFiles++
          stats.totalSize += node.size || 0

          if (!stats.largestFile || (node.size || 0) > (stats.largestFile.size || 0)) {
            stats.largestFile = node
          }
        } else {
          stats.totalDirectories++
        }

        if (node.children) {
          node.children.forEach((child) => traverse(child, depth + 1))
        }
      }

      this.fileTree.forEach((node) => traverse(node))

      this.performanceMonitor?.endTimer(timerId!, true)
      return stats
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      throw error
    }
  }

  async dispose(): Promise<void> {
    this.fileTree = []
    this.initialized = false
  }

  private findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
    for (const node of nodes) {
      if (node.path === path) {
        return node
      }
      if (node.children) {
        const found = this.findNodeByPath(node.children, path)
        if (found) return found
      }
    }
    return null
  }

  private generateDefaultFileTree(): FileNode[] {
    return [
      {
        id: "1",
        name: "documents",
        type: "directory",
        path: "/documents",
        lastModified: new Date(),
        children: [
          {
            id: "2",
            name: "readme.txt",
            type: "file",
            path: "/documents/readme.txt",
            size: 1024,
            lastModified: new Date(),
          },
          {
            id: "3",
            name: "projects",
            type: "directory",
            path: "/documents/projects",
            lastModified: new Date(),
            children: [
              {
                id: "4",
                name: "project1.md",
                type: "file",
                path: "/documents/projects/project1.md",
                size: 2048,
                lastModified: new Date(),
              },
            ],
          },
        ],
      },
    ]
  }
}
