import type { IFileImporter, ImportResult } from "../interfaces/IFileImporter"
import type { FileNode } from "../interfaces/IFileSystemProvider"
import type { IPerformanceMonitor } from "../interfaces/IPerformanceMonitor"

export class FileImporter implements IFileImporter {
  constructor(private performanceMonitor?: IPerformanceMonitor) {}

  async importFromLocalFile(file: File): Promise<ImportResult> {
    const timerId = this.performanceMonitor?.startTimer("import_local_file")

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
        throw new Error("Invalid JSON format")
      }

      // Validate and sanitize data
      if (!this.validateImportData(data)) {
        throw new Error("Invalid file structure")
      }

      const sanitizedData = this.sanitizeImportData(data)
      this.performanceMonitor?.endTimer(timerId!, true)

      return {
        success: true,
        data: sanitizedData,
      }
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async importFromUrl(url: string): Promise<ImportResult> {
    const timerId = this.performanceMonitor?.startTimer("import_url")

    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error("Invalid URL format")
      }

      // Fetch data from URL
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`)
      }

      let data
      try {
        data = await response.json()
      } catch (error) {
        throw new Error("Invalid JSON format")
      }

      // Validate and sanitize data
      if (!this.validateImportData(data)) {
        throw new Error("Invalid file structure")
      }

      const sanitizedData = this.sanitizeImportData(data)
      this.performanceMonitor?.endTimer(timerId!, true)

      return {
        success: true,
        data: sanitizedData,
      }
    } catch (error) {
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return {
        success: false,
        error: error.message,
      }
    }
  }

  validateImportData(data: any): boolean {
    // Check if data is an array (hierarchical structure)
    if (Array.isArray(data)) {
      return data.every((node) => this.isValidFileNode(node))
    }

    // Check if data has the flat file paths format (like the example URL)
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

  sanitizeImportData(data: any): FileNode[] {
    // Handle flat file paths format (like the example URL)
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
      if (!filepath || filepath.trim() === "") continue

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

  private normalizePath(path: string): string {
    // Remove leading/trailing whitespace
    let normalized = path.trim()

    // Convert backslashes to forward slashes
    normalized = normalized.replace(/\\/g, "/")

    // Ensure path starts with /
    if (!normalized.startsWith("/")) {
      normalized = "/" + normalized
    }

    // Remove duplicate slashes
    normalized = normalized.replace(/\/+/g, "/")

    // Remove trailing slash (except for root)
    if (normalized.length > 1 && normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1)
    }

    return normalized
  }

  private estimateFileSize(fileName: string): number {
    const extension = this.getFileExtension(fileName)

    // Estimate file sizes based on common file types
    const sizeEstimates: Record<string, number> = {
      // Text files
      txt: 1024,
      md: 2048,
      json: 1536,
      xml: 2048,
      csv: 4096,

      // Code files
      js: 3072,
      ts: 3584,
      jsx: 4096,
      tsx: 4608,
      html: 2048,
      css: 1536,
      scss: 2048,
      py: 2560,
      java: 4096,
      cpp: 3584,
      c: 2560,
      h: 1024,

      // Config files
      gitignore: 512,
      editorconfig: 256,
      prettierrc: 128,

      // Package files
      "package.json": 2048,
      "yarn.lock": 51200, // Usually larger
      "package-lock.json": 102400, // Usually much larger

      // Documentation
      readme: 4096,

      // Images
      png: 51200,
      jpg: 76800,
      jpeg: 76800,
      gif: 25600,
      svg: 2048,

      // Archives
      zip: 1048576,
      tar: 2097152,
      gz: 524288,
    }

    // Check for specific filenames first
    const lowerFileName = fileName.toLowerCase()
    if (lowerFileName === "package.json") return sizeEstimates["package.json"]
    if (lowerFileName === "yarn.lock") return sizeEstimates["yarn.lock"]
    if (lowerFileName === "package-lock.json") return sizeEstimates["package-lock.json"]
    if (lowerFileName.includes("readme")) return sizeEstimates.readme
    if (lowerFileName === ".gitignore") return sizeEstimates.gitignore
    if (lowerFileName === ".editorconfig") return sizeEstimates.editorconfig
    if (lowerFileName === ".prettierrc") return sizeEstimates.prettierrc

    // Use extension-based estimation
    if (extension && sizeEstimates[extension]) {
      return sizeEstimates[extension]
    }

    // Default size for unknown files
    return 1024
  }

  private getMimeTypeFromFileName(fileName: string): string {
    const extension = this.getFileExtension(fileName)
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
      md: "text/markdown",
      csv: "text/csv",

      // Code
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      jsx: "application/javascript",
      ts: "application/typescript",
      tsx: "application/typescript",
      json: "application/json",
      xml: "application/xml",
      py: "text/x-python",
      java: "text/x-java-source",
      cpp: "text/x-c++src",
      c: "text/x-csrc",
      h: "text/x-chdr",

      // Archives
      zip: "application/zip",
      rar: "application/x-rar-compressed",
      "7z": "application/x-7z-compressed",
      tar: "application/x-tar",
      gz: "application/gzip",
    }

    return mimeTypes[extension] || "application/octet-stream"
  }

  private getFileExtension(fileName: string): string | null {
    const parts = fileName.split(".")
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null
  }

  private generatePlaceholderThumbnail(fileName: string): string {
    const extension = this.getFileExtension(fileName) || ""
    return `/placeholder.svg?height=100&width=100&query=image+file+${extension}`
  }

  private isValidFileNode(node: any): boolean {
    // Check required properties
    if (!node || typeof node !== "object") return false
    if (typeof node.name !== "string" || node.name.trim() === "") return false
    if (node.type !== "file" && node.type !== "directory") return false

    // Validate path
    if (typeof node.path !== "string" || node.path.trim() === "") return false

    // Validate children if it's a directory
    if (node.type === "directory" && node.children) {
      if (!Array.isArray(node.children)) return false
      return node.children.every((child: any) => this.isValidFileNode(child))
    }

    // Validate size if it's a file
    if (node.type === "file" && node.size !== undefined) {
      if (typeof node.size !== "number" || node.size < 0) return false
    }

    return true
  }

  private sanitizeNode(node: any): FileNode {
    const sanitized: FileNode = {
      id: node.id || this.generateId(),
      name: this.sanitizeString(node.name),
      type: node.type === "directory" ? "directory" : "file",
      path: this.sanitizePath(node.path),
    }

    // Add size for files
    if (node.type === "file" && typeof node.size === "number" && node.size >= 0) {
      sanitized.size = node.size
    }

    // Add lastModified if valid
    if (node.lastModified) {
      try {
        sanitized.lastModified = new Date(node.lastModified)
      } catch (e) {
        // Ignore invalid dates
      }
    }

    // Add metadata if present
    if (node.metadata && typeof node.metadata === "object") {
      sanitized.metadata = { ...node.metadata }
    }

    // Add permissions if present
    if (typeof node.permissions === "string") {
      sanitized.permissions = node.permissions
    }

    // Add MIME type if present
    if (typeof node.mimeType === "string") {
      sanitized.mimeType = node.mimeType
    }

    // Add thumbnail URLs if present
    if (typeof node.thumbnailUrl === "string") {
      sanitized.thumbnailUrl = node.thumbnailUrl
    }

    if (typeof node.previewUrl === "string") {
      sanitized.previewUrl = node.previewUrl
    }

    // Process children recursively
    if (node.type === "directory" && Array.isArray(node.children)) {
      sanitized.children = node.children.map((child: any) => this.sanitizeNode(child))
    }

    return sanitized
  }

  private sanitizeString(str: string): string {
    return str.trim().replace(/[<>]/g, "")
  }

  private sanitizePath(path: string): string {
    // Normalize path format
    let sanitized = path.trim().replace(/\\/g, "/")

    // Remove any potential path traversal attempts
    sanitized = sanitized.replace(/\.\.\//g, "")

    // Ensure path starts with /
    if (!sanitized.startsWith("/")) {
      sanitized = "/" + sanitized
    }

    // Remove duplicate slashes
    sanitized = sanitized.replace(/\/+/g, "/")

    return sanitized
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch (e) {
      return false
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string)
        } else {
          reject(new Error("Failed to read file"))
        }
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsText(file)
    })
  }
}
