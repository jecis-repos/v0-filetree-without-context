import { BaseRepository } from "./BaseRepository"

export interface FileNode {
  id: string
  name: string
  type: "file" | "directory"
  path: string
  size?: number
  children?: FileNode[]
  metadata?: Record<string, any>
}

export interface FileSystemOperation {
  id: string
  operation: "create" | "read" | "update" | "delete"
  path: string
  timestamp: string
  duration: number
  success: boolean
  error?: string
}

export class FileSystemRepository extends BaseRepository<FileNode> {
  constructor(baseUrl: string) {
    super(baseUrl, "/v1/filesystem")
  }

  async getFileTree(path = "/"): Promise<ApiResponse<FileNode[]>> {
    return this.request<FileNode[]>(`/tree?path=${encodeURIComponent(path)}`)
  }

  async createDirectory(path: string, name: string): Promise<ApiResponse<FileNode>> {
    return this.request<FileNode>("/directory", {
      method: "POST",
      body: JSON.stringify({ path, name }),
    })
  }

  async uploadFile(path: string, file: File): Promise<ApiResponse<FileNode>> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("path", path)

    return this.request<FileNode>("/file", {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    })
  }

  async getOperationHistory(): Promise<ApiResponse<FileSystemOperation[]>> {
    return this.request<FileSystemOperation[]>("/operations")
  }
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}
