import type { IFileImporter, ImportOptions, ImportResult } from "../interfaces/IFileImporter"
import type { FileNode } from "../interfaces/IFileSystemProvider"
import type { IPerformanceMonitor } from "../interfaces/IPerformanceMonitor"

export class FileImporter implements IFileImporter {
  constructor(private performanceMonitor: IPerformanceMonitor) {}

  async importFromFiles(files: FileList, options?: ImportOptions): Promise<ImportResult> {
    const startTime = performance.now()
    const nodes: FileNode[] = []
    const errors: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          const node = await this.fileToNode(file, options)
          nodes.push(node)
        } catch (error) {
          errors.push(`Failed to import ${file.name}: ${error.message || "Unknown error"}`)
        }
      }

      const endTime = performance.now()
      this.performanceMonitor.endTimer("file_import", true, { duration: endTime - startTime })

      return {
        success: errors.length === 0,
        nodes,
        errors,
        totalFiles: files.length,
        importedFiles: nodes.length,
      }
    } catch (error) {
      return {
        success: false,
        nodes: [],
        errors: [error.message || "Unknown error"],
        totalFiles: files.length,
        importedFiles: 0,
      }
    }
  }

  async importFromUrl(url: string, options?: ImportOptions): Promise<ImportResult> {
    const startTime = performance.now()

    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error("Invalid URL format")
      }

      // Fetch data from URL with proper error handling
      let response
      try {
        response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-cache",
        })
      } catch (error) {
        throw new Error(`Network error: ${error.message || "Failed to connect to server"}`)
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
      }

      let data
      try {
        const text = await response.text()
        data = JSON.parse(text)
      } catch (error) {
        throw new Error(`Invalid JSON format: ${error.message || "Could not parse response"}`)
      }

      // Validate and sanitize data
      if (!this.validateImportData(data)) {
        throw new Error("Invalid file structure in the imported data")
      }

      const sanitizedData = this.sanitizeImportData(data)
      const endTime = performance.now()
      this.performanceMonitor.endTimer("url_import", true, { duration: endTime - startTime })

      return {
        success: true,
        nodes: sanitizedData,
        errors: [],
        totalFiles: this.countFiles(sanitizedData),
        importedFiles: this.countFiles(sanitizedData),
      }
    } catch (error) {
      const endTime = performance.now()
      this.performanceMonitor.endTimer("url_import_error", false, {
        duration: endTime - startTime,
        error: error.message || "Unknown error during import",
      })

      return {
        success: false,
        nodes: [],
        errors: [error.message || "Unknown error during import"],
        totalFiles: 0,
        importedFiles: 0,
      }
    }
  }

  async importFromLocalFile(file: File, options?: ImportOptions): Promise<ImportResult> {
    const startTime = performance.now()

    try {
      // Validate file type
      if (!file.name.endsWith(".json")) {
        throw new Error("Only JSON files are supported")
      }

      // Read file content
      const content = await this.readFileContent(file)
      let data

      try {
        data = JSON.parse(content)
      } catch (error) {
        throw new Error(`Invalid JSON format: ${error.message || "Could not parse file"}`)
      }

      // Validate and sanitize data
      if (!this.validateImportData(data)) {
        throw new Error("Invalid file structure in the imported data")
      }

      const sanitizedData = this.sanitizeImportData(data)
      const endTime = performance.now()
      this.performanceMonitor.endTimer("local_file_import", true, { duration: endTime - startTime })

      return {
        success: true,
        nodes: sanitizedData,
        errors: [],
        totalFiles: this.countFiles(sanitizedData),
        importedFiles: this.countFiles(sanitizedData),
      }
    } catch (error) {
      const endTime = performance.now()
      this.performanceMonitor.endTimer("local_file_import_error", false, {
        duration: endTime - startTime,
        error: error.message || "Unknown error during import",
      })

      return {
        success: false,
        nodes: [],
        errors: [error.message || "Unknown error during import"],
        totalFiles: 0,
        importedFiles: 0,
      }
    }
  }

  async importFromDirectory(
    directoryHandle: FileSystemDirectoryHandle,
    options?: ImportOptions,
  ): Promise<ImportResult> {
    const startTime = performance.now()
    const nodes: FileNode[] = []
    const errors: string[] = []

    try {
      const rootNode = await this.directoryToNode(directoryHandle, options)
      nodes.push(rootNode)

      const endTime = performance.now()
      this.performanceMonitor.endTimer("directory_import", true, { duration: endTime - startTime })

      return {
        success: true,
        nodes,
        errors,
        totalFiles: this.countFiles(nodes),
        importedFiles: this.countFiles(nodes),
      }
    } catch (error) {
      return {
        success: false,
        nodes: [],
        errors: [error.message || "Unknown error during directory import"],
        totalFiles: 0,
        importedFiles: 0,
      }
    }
  }

  async importFromJSON(jsonData: string, options?: ImportOptions): Promise<ImportResult> {
    const startTime = performance.now()

    try {
      let data
      try {
        data = JSON.parse(jsonData)
      } catch (error) {
        throw new Error(`Invalid JSON format: ${error.message || "Could not parse JSON string"}`)
      }

      const nodes = Array.isArray(data) ? data : [data]

      // Validate and convert to FileNode format
      const validatedNodes = nodes.map((node) => this.validateNode(node))

      const endTime = performance.now()
      this.performanceMonitor.endTimer("json_import", true, { duration: endTime - startTime })

      return {
        success: true,
        nodes: validatedNodes,
        errors: [],
        totalFiles: this.countFiles(validatedNodes),
        importedFiles: this.countFiles(validatedNodes),
      }
    } catch (error) {
      return {
        success: false,
        nodes: [],
        errors: [error.message || "Unknown error during JSON import"],
        totalFiles: 0,
        importedFiles: 0,
      }
    }
  }

  private validateImportData(data: any): boolean {
    // Check if data is an array (hierarchical structure)
    if (Array.isArray(data)) {
      return data.every((node) => this.isValidFileNode(node))
    }

    // Check if data has the flat file paths format
    if (data && typeof data === "object") {
      // Check for the specific format: { name: string, filepaths: string[] }
      if (typeof data.name === "string" && Array.isArray(data.filepaths)) {
        return data.filepaths.every((path: any) => typeof path === "string" && path.trim() !== "")
      }

      // Check if it's a single file node
      if (this.isValidFileNode(data)) {
        return true
      }
    }

    return false
  }

  private sanitizeImportData(data: any): FileNode[] {
    // Handle flat file paths format
    if (data && typeof data === "object" && data.filepaths && Array.isArray(data.filepaths)) {
      return this.convertFilePathsToTree(data.filepaths, data.name || "Imported")
    }

    // Handle hierarchical structure
    if (Array.isArray(data)) {
      return data.map((node) => this.sanitizeNode(node))
    }

    // Handle single node
    if (this.isValidFileNode(data)) {
      return [this.sanitizeNode(data)]
    }

    throw new Error("Unsupported data format")
  }

  private convertFilePathsToTree(filepaths: string[], rootName?: string): FileNode[] {
    const root: FileNode = {
      id: "root",
      name: rootName || "root",
      type: "directory",
      path: "/",
      children: [],
      lastModified: new Date(),
    }

    // Create a map to store directory nodes for quick lookup
    const nodeMap = new Map<string, FileNode>()
    nodeMap.set("/", root)

    // Sort paths to ensure parent directories are created before children
    const sortedPaths = [...filepaths].sort()

    for (const filepath of sortedPaths) {
      if (!filepath || typeof filepath !== "string" || filepath.trim() === "") continue

      // Normalize the path
      const normalizedPath = this.normalizePath(filepath)
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

          // Add to parent
          const parent = nodeMap.get(parentPath)
          if (parent && parent.children) {
            parent.children.push(dirNode)
          }
        }
      }

      // Create the file node
      const fileName = pathParts[pathParts.length - 1]
      const filePath = normalizedPath
      const parentPath = pathParts.length > 1 ? "/" + pathParts.slice(0, -1).join("/") : "/"

      // Determine file size and type
      const fileSize = this.estimateFileSize(fileName)
      const mimeType = this.getMimeTypeFromFileName(fileName)

      const fileNode: FileNode = {
        id: this.generateId(),
        name: fileName,
        type: "file",
        path: filePath,
        size: fileSize,
        lastModified: new Date(),
        mimeType,
      }

      // Add thumbnail for images
      if (mimeType.startsWith("image/")) {
        fileNode.thumbnailUrl = this.generatePlaceholderThumbnail(fileName)
        fileNode.previewUrl = fileNode.thumbnailUrl
      }

      // Add to parent directory
      const parent = nodeMap.get(parentPath)
      if (parent && parent.children) {
        parent.children.push(fileNode)
      }
    }

    // Return the children of the root (or root itself if it has a custom name)
    return rootName ? [root] : root.children || []
  }

  private async fileToNode(file: File, options?: ImportOptions): Promise<FileNode> {
    const content = options?.includeContent ? await this.readFileContent(file) : undefined

    return {
      id: this.generateId(),
      name: file.name,
      type: "file",
      path: `/${file.name}`,
      size: file.size,
      lastModified: new Date(file.lastModified),
      mimeType: file.type || this.getMimeTypeFromFileName(file.name),
      content,
    }
  }

  private async directoryToNode(
    directoryHandle: FileSystemDirectoryHandle,
    options?: ImportOptions,
    basePath = "",
  ): Promise<FileNode> {
    const children: FileNode[] = []
    const currentPath = basePath ? `${basePath}/${directoryHandle.name}` : `/${directoryHandle.name}`

    try {
      for await (const [name, handle] of directoryHandle.entries()) {
        if (handle.kind === "file") {
          try {
            const file = await handle.getFile()
            const fileNode = await this.fileToNode(file, options)
            fileNode.path = `${currentPath}/${name}`
            children.push(fileNode)
          } catch (error) {
            console.error(`Error processing file ${name}:`, error)
          }
        } else if (handle.kind === "directory") {
          try {
            const dirNode = await this.directoryToNode(handle, options, currentPath)
            children.push(dirNode)
          } catch (error) {
            console.error(`Error processing directory ${name}:`, error)
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory entries:`, error)
    }

    return {
      id: this.generateId(),
      name: directoryHandle.name,
      type: "directory",
      path: currentPath,
      lastModified: new Date(),
      children,
    }
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Failed to read file content"))
      reader.readAsText(file)
    })
  }

  private validateNode(data: any): FileNode {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid node data: must be an object")
    }

    if (!data.name || typeof data.name !== "string") {
      throw new Error("Invalid node data: missing or invalid name property")
    }

    return {
      id: this.generateId(),
      name: data.name || "Unknown",
      type: data.type === "directory" ? "directory" : "file",
      path: data.path || `/${data.name || "unknown"}`,
      size: typeof data.size === "number" ? data.size : this.estimateFileSize(data.name),
      lastModified: data.lastModified ? new Date(data.lastModified) : new Date(),
      mimeType: data.mimeType,
      content: data.content,
      children: data.children?.map((child: any) => this.validateNode(child)),
    }
  }

  private countFiles(nodeOrNodes: FileNode | FileNode[]): number {
    if (!nodeOrNodes) return 0

    if (Array.isArray(nodeOrNodes)) {
      return nodeOrNodes.reduce((count, node) => count + this.countFiles(node), 0)
    }

    const node = nodeOrNodes
    if (node.type === "file") return 1
    if (node.children && Array.isArray(node.children)) {
      return node.children.reduce((count, child) => count + this.countFiles(child), 0)
    }
    return 0
  }

  private isValidFileNode(node: any): boolean {
    if (!node || typeof node !== "object") return false
    if (typeof node.name !== "string" || node.name.trim() === "") return false
    if (node.type !== "file" && node.type !== "directory") return false
    if (typeof node.path !== "string" || node.path.trim() === "") return false

    if (node.type === "directory" && node.children) {
      if (!Array.isArray(node.children)) return false
      return node.children.every((child: any) => this.isValidFileNode(child))
    }

    if (node.type === "file" && node.size !== undefined) {
      if (typeof node.size !== "number" || node.size < 0) return false
    }

    return true
  }

  private sanitizeNode(node: any): FileNode {
    const sanitized: FileNode = {
      id: node.id || this.generateId(),
      name: this.sanitizeString(node.name || "Unknown"),
      type: node.type === "directory" ? "directory" : "file",
      path: this.sanitizePath(node.path || `/${node.name || "unknown"}`),
      lastModified: new Date(),
    }

    if (node.type === "file" && typeof node.size === "number" && node.size >= 0) {
      sanitized.size = node.size
    } else if (sanitized.type === "file") {
      sanitized.size = this.estimateFileSize(sanitized.name)
    }

    if (node.lastModified) {
      try {
        sanitized.lastModified = new Date(node.lastModified)
      } catch (e) {
        sanitized.lastModified = new Date()
      }
    }

    if (node.metadata && typeof node.metadata === "object") {
      sanitized.metadata = { ...node.metadata }
    }

    if (typeof node.permissions === "string") {
      sanitized.permissions = node.permissions
    }

    if (typeof node.mimeType === "string") {
      sanitized.mimeType = node.mimeType
    } else if (sanitized.type === "file") {
      sanitized.mimeType = this.getMimeTypeFromFileName(sanitized.name)
    }

    if (typeof node.thumbnailUrl === "string") {
      sanitized.thumbnailUrl = node.thumbnailUrl
    } else if (sanitized.mimeType?.startsWith("image/")) {
      sanitized.thumbnailUrl = this.generatePlaceholderThumbnail(sanitized.name)
    }

    if (typeof node.previewUrl === "string") {
      sanitized.previewUrl = node.previewUrl
    } else if (sanitized.thumbnailUrl) {
      sanitized.previewUrl = sanitized.thumbnailUrl
    }

    if (node.type === "directory" && Array.isArray(node.children)) {
      sanitized.children = node.children.map((child: any) => this.sanitizeNode(child))
    }

    return sanitized
  }

  private normalizePath(path: string): string {
    if (typeof path !== "string") return "/"

    let normalized = path.trim().replace(/\\/g, "/")
    if (!normalized.startsWith("/")) {
      normalized = "/" + normalized
    }
    normalized = normalized.replace(/\/+/g, "/")
    if (normalized.length > 1 && normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  }

  private estimateFileSize(fileName: string): number {
    const extension = this.getFileExtension(fileName)
    const sizeEstimates: Record<string, number> = {
      txt: 1024,
      md: 2048,
      json: 1536,
      js: 3072,
      ts: 3584,
      html: 2048,
      css: 1536,
      png: 51200,
      jpg: 76800,
      jpeg: 76800,\
