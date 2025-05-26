import type { FileNode } from "../interfaces/IFileSystemProvider"

export interface ParsedFileStructure {
  type: "flat" | "hierarchical" | "tree" | "list"
  nodes: FileNode[]
  metadata: {
    totalFiles: number
    totalDirectories: number
    maxDepth: number
    fileTypes: Record<string, number>
  }
}

export interface VisualizationOptions {
  structure: "flat" | "hierarchical" | "tree" | "list"
  groupBy?: "type" | "extension" | "size" | "date"
  sortBy?: "name" | "size" | "date" | "type"
  sortOrder?: "asc" | "desc"
  showHidden?: boolean
  maxDepth?: number
  filterExtensions?: string[]
}

export class FilePathParser {
  static parseFilePaths(
    filePaths: string[],
    options: VisualizationOptions = { structure: "hierarchical" },
  ): ParsedFileStructure {
    const nodes: FileNode[] = []
    const metadata = {
      totalFiles: 0,
      totalDirectories: 0,
      maxDepth: 0,
      fileTypes: {} as Record<string, number>,
    }

    switch (options.structure) {
      case "flat":
        return this.parseFlatStructure(filePaths, options, metadata)
      case "hierarchical":
        return this.parseHierarchicalStructure(filePaths, options, metadata)
      case "tree":
        return this.parseTreeStructure(filePaths, options, metadata)
      case "list":
        return this.parseListStructure(filePaths, options, metadata)
      default:
        return this.parseHierarchicalStructure(filePaths, options, metadata)
    }
  }

  private static parseFlatStructure(
    filePaths: string[],
    options: VisualizationOptions,
    metadata: any,
  ): ParsedFileStructure {
    const nodes: FileNode[] = []

    filePaths.forEach((path, index) => {
      if (!this.shouldIncludePath(path, options)) return

      const pathParts = path.split("/").filter(Boolean)
      const fileName = pathParts[pathParts.length - 1]
      const isFile = this.isFilePath(path)

      if (isFile) {
        metadata.totalFiles++
        const extension = this.getFileExtension(fileName)
        if (extension) {
          metadata.fileTypes[extension] = (metadata.fileTypes[extension] || 0) + 1
        }
      } else {
        metadata.totalDirectories++
      }

      metadata.maxDepth = Math.max(metadata.maxDepth, pathParts.length)

      const node: FileNode = {
        id: `flat-${index}`,
        name: fileName,
        type: isFile ? "file" : "directory",
        path,
        size: isFile ? this.estimateFileSize(fileName) : undefined,
        lastModified: new Date(),
        mimeType: isFile ? this.getMimeType(fileName) : undefined,
      }

      nodes.push(node)
    })

    // Apply sorting
    this.sortNodes(nodes, options)

    return {
      type: "flat",
      nodes,
      metadata,
    }
  }

  private static parseHierarchicalStructure(
    filePaths: string[],
    options: VisualizationOptions,
    metadata: any,
  ): ParsedFileStructure {
    const root: FileNode = {
      id: "root",
      name: "root",
      type: "directory",
      path: "/",
      children: [],
      lastModified: new Date(),
    }

    const nodeMap = new Map<string, FileNode>()
    nodeMap.set("/", root)

    // Sort paths to ensure parent directories are created first
    const sortedPaths = [...filePaths].sort()

    for (const path of sortedPaths) {
      if (!this.shouldIncludePath(path, options)) continue

      const normalizedPath = this.normalizePath(path)
      const pathParts = normalizedPath.split("/").filter(Boolean)

      // Create all parent directories
      let currentPath = ""
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i]
        const parentPath = currentPath || "/"
        currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`

        if (!nodeMap.has(currentPath)) {
          const dirNode: FileNode = {
            id: this.generateId(),
            name: part,
            type: "directory",
            path: currentPath,
            children: [],
            lastModified: new Date(),
          }

          nodeMap.set(currentPath, dirNode)
          metadata.totalDirectories++

          // Add to parent
          const parent = nodeMap.get(parentPath)
          if (parent && parent.children) {
            parent.children.push(dirNode)
          }
        }
      }

      // Create the final node (file or directory)
      const fileName = pathParts[pathParts.length - 1]
      const isFile = this.isFilePath(path)
      const parentPath = pathParts.length > 1 ? "/" + pathParts.slice(0, -1).join("/") : "/"

      if (isFile) {
        metadata.totalFiles++
        const extension = this.getFileExtension(fileName)
        if (extension) {
          metadata.fileTypes[extension] = (metadata.fileTypes[extension] || 0) + 1
        }
      }

      metadata.maxDepth = Math.max(metadata.maxDepth, pathParts.length)

      const fileNode: FileNode = {
        id: this.generateId(),
        name: fileName,
        type: isFile ? "file" : "directory",
        path: normalizedPath,
        size: isFile ? this.estimateFileSize(fileName) : undefined,
        lastModified: new Date(),
        mimeType: isFile ? this.getMimeType(fileName) : undefined,
        children: isFile ? undefined : [],
      }

      if (!isFile) {
        metadata.totalDirectories++
        nodeMap.set(normalizedPath, fileNode)
      }

      // Add to parent directory
      const parent = nodeMap.get(parentPath)
      if (parent && parent.children) {
        parent.children.push(fileNode)
      }
    }

    // Apply sorting recursively
    this.sortNodesRecursively(root, options)

    return {
      type: "hierarchical",
      nodes: root.children || [],
      metadata,
    }
  }

  private static parseTreeStructure(
    filePaths: string[],
    options: VisualizationOptions,
    metadata: any,
  ): ParsedFileStructure {
    // Tree structure is similar to hierarchical but optimized for tree visualization
    const hierarchical = this.parseHierarchicalStructure(filePaths, options, metadata)

    // Flatten for tree visualization while maintaining hierarchy info
    const treeNodes: FileNode[] = []

    const flatten = (node: FileNode, depth = 0, parentPath = "") => {
      const treeNode: FileNode = {
        ...node,
        metadata: {
          ...node.metadata,
          depth,
          parentPath,
          hasChildren: node.children && node.children.length > 0,
        },
      }

      treeNodes.push(treeNode)

      if (node.children) {
        node.children.forEach((child) => {
          flatten(child, depth + 1, node.path)
        })
      }
    }

    hierarchical.nodes.forEach((node) => flatten(node))

    return {
      type: "tree",
      nodes: treeNodes,
      metadata,
    }
  }

  private static parseListStructure(
    filePaths: string[],
    options: VisualizationOptions,
    metadata: any,
  ): ParsedFileStructure {
    const nodes: FileNode[] = []

    // Group files by directory
    const directoryGroups = new Map<string, string[]>()

    filePaths.forEach((path) => {
      if (!this.shouldIncludePath(path, options)) return

      const pathParts = path.split("/").filter(Boolean)
      const directory = pathParts.length > 1 ? "/" + pathParts.slice(0, -1).join("/") : "/"

      if (!directoryGroups.has(directory)) {
        directoryGroups.set(directory, [])
      }
      directoryGroups.get(directory)!.push(path)
    })

    // Create directory nodes with file lists
    Array.from(directoryGroups.entries()).forEach(([directory, files], index) => {
      const dirParts = directory.split("/").filter(Boolean)
      const dirName = dirParts.length > 0 ? dirParts[dirParts.length - 1] : "root"

      metadata.totalDirectories++

      const children: FileNode[] = files.map((filePath, fileIndex) => {
        const fileName = filePath.split("/").filter(Boolean).pop() || ""
        const isFile = this.isFilePath(filePath)

        if (isFile) {
          metadata.totalFiles++
          const extension = this.getFileExtension(fileName)
          if (extension) {
            metadata.fileTypes[extension] = (metadata.fileTypes[extension] || 0) + 1
          }
        }

        return {
          id: `list-${index}-${fileIndex}`,
          name: fileName,
          type: isFile ? "file" : "directory",
          path: filePath,
          size: isFile ? this.estimateFileSize(fileName) : undefined,
          lastModified: new Date(),
          mimeType: isFile ? this.getMimeType(fileName) : undefined,
        }
      })

      // Sort children
      this.sortNodes(children, options)

      const dirNode: FileNode = {
        id: `list-dir-${index}`,
        name: dirName,
        type: "directory",
        path: directory,
        children,
        lastModified: new Date(),
        metadata: {
          fileCount: children.filter((c) => c.type === "file").length,
          directoryCount: children.filter((c) => c.type === "directory").length,
        },
      }

      nodes.push(dirNode)
    })

    // Sort directories
    this.sortNodes(nodes, options)

    metadata.maxDepth = Math.max(...filePaths.map((p) => p.split("/").filter(Boolean).length))

    return {
      type: "list",
      nodes,
      metadata,
    }
  }

  private static shouldIncludePath(path: string, options: VisualizationOptions): boolean {
    // Check hidden files
    if (!options.showHidden && path.includes("/.")) {
      return false
    }

    // Check max depth
    if (options.maxDepth) {
      const depth = path.split("/").filter(Boolean).length
      if (depth > options.maxDepth) {
        return false
      }
    }

    // Check file extensions
    if (options.filterExtensions && options.filterExtensions.length > 0) {
      const extension = this.getFileExtension(path)
      if (extension && !options.filterExtensions.includes(extension)) {
        return false
      }
    }

    return true
  }

  private static sortNodes(nodes: FileNode[], options: VisualizationOptions): void {
    if (!options.sortBy) return

    nodes.sort((a, b) => {
      let comparison = 0

      switch (options.sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "size":
          comparison = (a.size || 0) - (b.size || 0)
          break
        case "date":
          comparison = (a.lastModified?.getTime() || 0) - (b.lastModified?.getTime() || 0)
          break
        case "type":
          comparison = a.type.localeCompare(b.type)
          break
      }

      return options.sortOrder === "desc" ? -comparison : comparison
    })
  }

  private static sortNodesRecursively(node: FileNode, options: VisualizationOptions): void {
    if (node.children) {
      this.sortNodes(node.children, options)
      node.children.forEach((child) => this.sortNodesRecursively(child, options))
    }
  }

  private static isFilePath(path: string): boolean {
    const fileName = path.split("/").pop() || ""
    return fileName.includes(".") && !fileName.startsWith(".")
  }

  private static getFileExtension(fileName: string): string | null {
    const parts = fileName.split(".")
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null
  }

  private static getMimeType(fileName: string): string {
    const extension = this.getFileExtension(fileName)
    const mimeTypes: Record<string, string> = {
      js: "application/javascript",
      ts: "application/typescript",
      json: "application/json",
      html: "text/html",
      css: "text/css",
      md: "text/markdown",
      txt: "text/plain",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      svg: "image/svg+xml",
      pdf: "application/pdf",
    }
    return mimeTypes[extension || ""] || "application/octet-stream"
  }

  private static estimateFileSize(fileName: string): number {
    const extension = this.getFileExtension(fileName)
    const sizeEstimates: Record<string, number> = {
      js: 3072,
      ts: 3584,
      json: 1536,
      html: 2048,
      css: 1536,
      md: 2048,
      txt: 1024,
      png: 51200,
      jpg: 76800,
      jpeg: 76800,
      gif: 25600,
      svg: 2048,
      pdf: 204800,
    }
    return sizeEstimates[extension || ""] || 1024
  }

  private static normalizePath(path: string): string {
    let normalized = path.trim().replace(/\\/g, "/")
    if (!normalized.startsWith("/")) {
      normalized = "/" + normalized
    }
    return normalized.replace(/\/+/g, "/").replace(/\/$/, "") || "/"
  }

  private static generateId(): string {
    return Math.random().toString(36).substring(2, 15)
  }
}
