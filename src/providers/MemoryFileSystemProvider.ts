import type {
  IFileSystemProvider,
  FileNode,
  FileSystemStats,
  FileOperationResult,
  FileSearchOptions,
} from "../interfaces/IFileSystemProvider"
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

  async createDirectory(path: string): Promise<FileOperationResult> {
    const timerId = this.performanceMonitor?.startTimer("memory_create_directory")

    try {
      const pathParts = path.split("/").filter(Boolean)
      const name = pathParts[pathParts.length - 1]
      const parentPath = "/" + pathParts.slice(0, -1).join("/")

      // Check if directory already exists
      const existingNode = this.findNodeByPath(this.fileTree, path)
      if (existingNode) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "Directory already exists" })
        return { success: false, error: "Directory already exists" }
      }

      const parent = parentPath === "/" ? null : this.findNodeByPath(this.fileTree, parentPath)

      // Check if parent exists
      if (parentPath !== "/" && !parent) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "Parent directory not found" })
        return { success: false, error: "Parent directory not found" }
      }

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
      return { success: true }
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return { success: false, error: error.message }
    }
  }

  async createFile(path: string, content?: string | ArrayBuffer): Promise<FileOperationResult> {
    const timerId = this.performanceMonitor?.startTimer("memory_create_file")

    try {
      const pathParts = path.split("/").filter(Boolean)
      const name = pathParts[pathParts.length - 1]
      const parentPath = "/" + pathParts.slice(0, -1).join("/")

      // Check if file already exists
      const existingNode = this.findNodeByPath(this.fileTree, path)
      if (existingNode) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "File already exists" })
        return { success: false, error: "File already exists" }
      }

      const parent = parentPath === "/" ? null : this.findNodeByPath(this.fileTree, parentPath)

      // Check if parent exists
      if (parentPath !== "/" && !parent) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "Parent directory not found" })
        return { success: false, error: "Parent directory not found" }
      }

      // Determine file size and mime type
      let size = 0
      let mimeType = "application/octet-stream"

      if (content) {
        size = content instanceof ArrayBuffer ? content.byteLength : content.length
        mimeType = this.getMimeTypeFromFileName(name)
      }

      const newNode: FileNode = {
        id: Date.now().toString(),
        name,
        type: "file",
        path,
        size,
        lastModified: new Date(),
        mimeType,
      }

      // Generate thumbnail for images
      if (mimeType.startsWith("image/")) {
        newNode.thumbnailUrl = this.generatePlaceholderThumbnail(name)
        newNode.previewUrl = newNode.thumbnailUrl
      }

      if (parent) {
        parent.children = parent.children || []
        parent.children.push(newNode)
      } else {
        this.fileTree.push(newNode)
      }

      // Store content in metadata for retrieval
      if (content) {
        newNode.metadata = newNode.metadata || {}
        newNode.metadata._content =
          content instanceof ArrayBuffer ? btoa(String.fromCharCode(...new Uint8Array(content))) : btoa(content)
      }

      this.performanceMonitor?.endTimer(timerId!, true)
      return { success: true }
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return { success: false, error: error.message }
    }
  }

  async deleteNode(path: string): Promise<FileOperationResult> {
    const timerId = this.performanceMonitor?.startTimer("memory_delete_node")

    try {
      const node = this.findNodeByPath(this.fileTree, path)
      if (!node) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "Node not found" })
        return { success: false, error: "Node not found" }
      }

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
      return { success: true }
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return { success: false, error: error.message }
    }
  }

  async moveNode(fromPath: string, toPath: string): Promise<FileOperationResult> {
    const timerId = this.performanceMonitor?.startTimer("memory_move_node")

    try {
      const node = this.findNodeByPath(this.fileTree, fromPath)
      if (!node) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "Source node not found" })
        return { success: false, error: "Source node not found" }
      }

      // Check if destination already exists
      const existingDestination = this.findNodeByPath(this.fileTree, toPath)
      if (existingDestination) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "Destination already exists" })
        return { success: false, error: "Destination already exists" }
      }

      // Get destination parent path
      const toPathParts = toPath.split("/").filter(Boolean)
      const toParentPath = "/" + toPathParts.slice(0, -1).join("/")

      // Check if destination parent exists
      if (toParentPath !== "/") {
        const toParent = this.findNodeByPath(this.fileTree, toParentPath)
        if (!toParent || toParent.type !== "directory") {
          this.performanceMonitor?.endTimer(timerId!, false, { error: "Destination parent not found" })
          return { success: false, error: "Destination parent not found" }
        }
      }

      // Remove from source
      const result = await this.deleteNode(fromPath)
      if (!result.success) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: result.error })
        return result
      }

      // Update node path and add to new location
      const nodeCopy = JSON.parse(JSON.stringify(node))
      nodeCopy.path = toPath
      nodeCopy.name = toPathParts[toPathParts.length - 1]
      nodeCopy.lastModified = new Date()

      // Update children paths if it's a directory
      if (nodeCopy.type === "directory" && nodeCopy.children) {
        this.updateChildrenPaths(nodeCopy, fromPath, toPath)
      }

      // Add to destination
      const toParentPath2 = "/" + toPathParts.slice(0, -1).join("/")
      if (toParentPath2 === "/") {
        this.fileTree.push(nodeCopy)
      } else {
        const toParent = this.findNodeByPath(this.fileTree, toParentPath2)
        if (toParent) {
          toParent.children = toParent.children || []
          toParent.children.push(nodeCopy)
        }
      }

      this.performanceMonitor?.endTimer(timerId!, true)
      return { success: true }
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return { success: false, error: error.message }
    }
  }

  async copyNode(fromPath: string, toPath: string): Promise<FileOperationResult> {
    const timerId = this.performanceMonitor?.startTimer("memory_copy_node")

    try {
      const node = this.findNodeByPath(this.fileTree, fromPath)
      if (!node) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "Source node not found" })
        return { success: false, error: "Source node not found" }
      }

      // Check if destination already exists
      const existingDestination = this.findNodeByPath(this.fileTree, toPath)
      if (existingDestination) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "Destination already exists" })
        return { success: false, error: "Destination already exists" }
      }

      // Get destination parent path
      const toPathParts = toPath.split("/").filter(Boolean)
      const toParentPath = "/" + toPathParts.slice(0, -1).join("/")

      // Check if destination parent exists
      if (toParentPath !== "/") {
        const toParent = this.findNodeByPath(this.fileTree, toParentPath)
        if (!toParent || toParent.type !== "directory") {
          this.performanceMonitor?.endTimer(timerId!, false, { error: "Destination parent not found" })
          return { success: false, error: "Destination parent not found" }
        }
      }

      // Create a deep copy of the node
      const nodeCopy = JSON.parse(JSON.stringify(node))
      nodeCopy.id = Date.now().toString()
      nodeCopy.path = toPath
      nodeCopy.name = toPathParts[toPathParts.length - 1]
      nodeCopy.lastModified = new Date()

      // Update children paths and IDs if it's a directory
      if (nodeCopy.type === "directory" && nodeCopy.children) {
        this.updateChildrenPaths(nodeCopy, fromPath, toPath, true)
      }

      // Add to destination
      if (toParentPath === "/") {
        this.fileTree.push(nodeCopy)
      } else {
        const toParent = this.findNodeByPath(this.fileTree, toParentPath)
        if (toParent) {
          toParent.children = toParent.children || []
          toParent.children.push(nodeCopy)
        }
      }

      this.performanceMonitor?.endTimer(timerId!, true)
      return { success: true }
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return { success: false, error: error.message }
    }
  }

  async renameNode(path: string, newName: string): Promise<FileOperationResult> {
    const timerId = this.performanceMonitor?.startTimer("memory_rename_node")

    try {
      const node = this.findNodeByPath(this.fileTree, path)
      if (!node) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "Node not found" })
        return { success: false, error: "Node not found" }
      }

      // Validate new name
      if (!newName || newName.trim() === "" || newName.includes("/")) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "Invalid name" })
        return { success: false, error: "Invalid name" }
      }

      // Generate new path
      const pathParts = path.split("/").filter(Boolean)
      pathParts.pop()
      const newPath = "/" + [...pathParts, newName].join("/")

      // Check if new path already exists
      const existingNode = this.findNodeByPath(this.fileTree, newPath)
      if (existingNode) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "A node with this name already exists" })
        return { success: false, error: "A node with this name already exists" }
      }

      // Update node
      node.name = newName
      node.path = newPath
      node.lastModified = new Date()

      // Update children paths if it's a directory
      if (node.type === "directory" && node.children) {
        this.updateChildrenPaths(node, path, newPath)
      }

      this.performanceMonitor?.endTimer(timerId!, true)
      return { success: true }
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return { success: false, error: error.message }
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
        fileTypes: {},
        averageFileSize: 0,
        creationDate: undefined,
        lastModifiedDate: undefined,
      }

      let totalFileSize = 0
      let fileCount = 0
      let oldestDate: Date | undefined
      let newestDate: Date | undefined

      const traverse = (node: FileNode, depth = 0) => {
        stats.maxDepth = Math.max(stats.maxDepth, depth)

        // Update creation/modification dates
        if (node.lastModified) {
          if (!oldestDate || node.lastModified < oldestDate) {
            oldestDate = node.lastModified
          }
          if (!newestDate || node.lastModified > newestDate) {
            newestDate = node.lastModified
          }
        }

        if (node.type === "file") {
          stats.totalFiles++
          const size = node.size || 0
          stats.totalSize += size
          totalFileSize += size
          fileCount++

          // Track file types
          const extension = this.getFileExtension(node.name)
          if (extension) {
            stats.fileTypes![extension] = (stats.fileTypes![extension] || 0) + 1
          }

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

      this.fileTree.forEach((node) => traverse(node))

      // Calculate average file size
      stats.averageFileSize = fileCount > 0 ? totalFileSize / fileCount : 0
      stats.creationDate = oldestDate
      stats.lastModifiedDate = newestDate

      this.performanceMonitor?.endTimer(timerId!, true)
      return stats
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      throw error
    }
  }

  async searchFiles(options: FileSearchOptions): Promise<FileNode[]> {
    const timerId = this.performanceMonitor?.startTimer("memory_search_files")

    try {
      const results: FileNode[] = []
      const query = options.matchCase ? options.query : options.query.toLowerCase()
      const maxResults = options.maxResults || Number.MAX_SAFE_INTEGER

      const traverse = (node: FileNode) => {
        if (results.length >= maxResults) return

        let match = false
        const nodeName = options.matchCase ? node.name : node.name.toLowerCase()

        // Match by name
        if (options.matchWholeWord) {
          match = nodeName === query
        } else {
          match = nodeName.includes(query)
        }

        // Match by file type if specified
        if (!match && options.fileTypes && options.fileTypes.length > 0) {
          const extension = this.getFileExtension(node.name)
          if (extension && options.fileTypes.includes(extension)) {
            match = true
          }
        }

        // Match by content if requested and available
        if (!match && options.includeContent && node.type === "file" && node.metadata?._content) {
          try {
            const content = atob(node.metadata._content)
            const contentStr = options.matchCase ? content : content.toLowerCase()
            match = contentStr.includes(query)
          } catch (e) {
            // Ignore content search errors
          }
        }

        if (match) {
          results.push(JSON.parse(JSON.stringify(node)))
        }

        if (node.children) {
          node.children.forEach(traverse)
        }
      }

      this.fileTree.forEach(traverse)

      this.performanceMonitor?.endTimer(timerId!, true)
      return results
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      throw error
    }
  }

  async getFileContent(path: string): Promise<string | ArrayBuffer | null> {
    const timerId = this.performanceMonitor?.startTimer("memory_get_file_content")

    try {
      const node = this.findNodeByPath(this.fileTree, path)
      if (!node || node.type !== "file") {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "File not found" })
        return null
      }

      if (!node.metadata?._content) {
        this.performanceMonitor?.endTimer(timerId!, true)
        return null
      }

      try {
        const content = atob(node.metadata._content)
        this.performanceMonitor?.endTimer(timerId!, true)
        return content
      } catch (e) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "Failed to decode content" })
        return null
      }
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      throw error
    }
  }

  async setFileContent(path: string, content: string | ArrayBuffer): Promise<FileOperationResult> {
    const timerId = this.performanceMonitor?.startTimer("memory_set_file_content")

    try {
      const node = this.findNodeByPath(this.fileTree, path)
      if (!node || node.type !== "file") {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "File not found" })
        return { success: false, error: "File not found" }
      }

      // Update size
      node.size = content instanceof ArrayBuffer ? content.byteLength : content.length
      node.lastModified = new Date()

      // Store content
      node.metadata = node.metadata || {}
      node.metadata._content =
        content instanceof ArrayBuffer ? btoa(String.fromCharCode(...new Uint8Array(content))) : btoa(content)

      this.performanceMonitor?.endTimer(timerId!, true)
      return { success: true }
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return { success: false, error: error.message }
    }
  }

  async importFileTree(nodes: FileNode[]): Promise<FileOperationResult> {
    const timerId = this.performanceMonitor?.startTimer("memory_import_file_tree")

    try {
      // Validate nodes
      if (!Array.isArray(nodes) || nodes.length === 0) {
        this.performanceMonitor?.endTimer(timerId!, false, { error: "Invalid file tree data" })
        return { success: false, error: "Invalid file tree data" }
      }

      // Replace current file tree
      this.fileTree = JSON.parse(JSON.stringify(nodes))

      this.performanceMonitor?.endTimer(timerId!, true)
      return { success: true }
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return { success: false, error: error.message }
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

  private updateChildrenPaths(node: FileNode, oldBasePath: string, newBasePath: string, generateNewIds = false): void {
    if (!node.children) return

    for (const child of node.children) {
      // Update child path
      child.path = child.path.replace(oldBasePath, newBasePath)

      // Generate new ID if needed
      if (generateNewIds) {
        child.id = Date.now().toString() + Math.random().toString(36).substring(2, 9)
      }

      // Recursively update grandchildren
      if (child.type === "directory" && child.children) {
        this.updateChildrenPaths(child, oldBasePath, newBasePath, generateNewIds)
      }
    }
  }

  private getFileExtension(filename: string): string | null {
    const parts = filename.split(".")
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null
  }

  private getMimeTypeFromFileName(filename: string): string {
    const extension = this.getFileExtension(filename)
    if (!extension) return "application/octet-stream"

    const mimeTypes: Record<string, string> = {
      // Images
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      // Documents
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      // Spreadsheets
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // Presentations
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      // Text
      txt: "text/plain",
      csv: "text/csv",
      // Code
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      json: "application/json",
      xml: "application/xml",
      // Archives
      zip: "application/zip",
      rar: "application/x-rar-compressed",
      "7z": "application/x-7z-compressed",
      tar: "application/x-tar",
      gz: "application/gzip",
    }

    return mimeTypes[extension] || "application/octet-stream"
  }

  private generatePlaceholderThumbnail(filename: string): string {
    // In a real implementation, this would generate actual thumbnails
    // For this example, we'll use a placeholder service
    const extension = this.getFileExtension(filename) || ""
    return `/placeholder.svg?height=100&width=100&query=image+file+${extension}`
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
            mimeType: "text/plain",
            metadata: {
              _content: btoa(
                "Welcome to the file explorer demo!\nThis is a sample text file to demonstrate the functionality.",
              ),
            },
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
                mimeType: "text/markdown",
                metadata: {
                  _content: btoa(
                    "# Project 1\n\nThis is a sample markdown file for Project 1.\n\n## Features\n\n- Feature 1\n- Feature 2\n- Feature 3",
                  ),
                },
              },
            ],
          },
          {
            id: "5",
            name: "sample.jpg",
            type: "file",
            path: "/documents/sample.jpg",
            size: 153600,
            lastModified: new Date(),
            mimeType: "image/jpeg",
            thumbnailUrl: "/placeholder.svg?height=100&width=100&query=sample+image",
            previewUrl: "/placeholder.svg?height=400&width=600&query=sample+image",
          },
        ],
      },
      {
        id: "6",
        name: "images",
        type: "directory",
        path: "/images",
        lastModified: new Date(),
        children: [
          {
            id: "7",
            name: "photo1.png",
            type: "file",
            path: "/images/photo1.png",
            size: 204800,
            lastModified: new Date(),
            mimeType: "image/png",
            thumbnailUrl: "/placeholder.svg?height=100&width=100&query=photo+1",
            previewUrl: "/placeholder.svg?height=400&width=600&query=photo+1",
          },
          {
            id: "8",
            name: "photo2.jpg",
            type: "file",
            path: "/images/photo2.jpg",
            size: 307200,
            lastModified: new Date(),
            mimeType: "image/jpeg",
            thumbnailUrl: "/placeholder.svg?height=100&width=100&query=photo+2",
            previewUrl: "/placeholder.svg?height=400&width=600&query=photo+2",
          },
        ],
      },
    ]
  }
}
