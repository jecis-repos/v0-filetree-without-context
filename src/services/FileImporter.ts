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
    // Check if data is an array
    if (!Array.isArray(data) && !this.isValidFileNode(data)) {
      return false
    }

    // If it's a single node, convert to array for validation
    const nodes = Array.isArray(data) ? data : [data]

    // Validate each node recursively
    return nodes.every((node) => this.isValidFileNode(node))
  }

  sanitizeImportData(data: any): FileNode[] {
    // If data is a single node, convert to array
    const nodes = Array.isArray(data) ? data : [data]

    // Sanitize each node recursively
    return nodes.map((node) => this.sanitizeNode(node))
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
