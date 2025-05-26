import { FileSystemRepository } from "../repositories/FileSystemRepository"
import { fileSystemActions } from "../store/fileSystemStore"
import { clientConfig } from "../config/client-config"

export class FileSystemService {
  private repository: FileSystemRepository

  constructor() {
    this.repository = new FileSystemRepository(clientConfig.apiBaseUrl)
  }

  async loadFileTree(): Promise<void> {
    try {
      fileSystemActions.setLoading(true)

      const response = await this.repository.getFileTree()

      if (response.success && response.data) {
        fileSystemActions.setFileTree(response.data)
      } else {
        fileSystemActions.setError(response.error || "Failed to load file tree")
      }
    } catch (error) {
      fileSystemActions.setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      fileSystemActions.setLoading(false)
    }
  }

  async createFile(path: string, content: string): Promise<void> {
    try {
      const response = await this.repository.createFile({ path, content })

      if (response.success) {
        // Reload the file tree
        await this.loadFileTree()
      } else {
        fileSystemActions.setError(response.error || "Failed to create file")
      }
    } catch (error) {
      fileSystemActions.setError(error instanceof Error ? error.message : "Unknown error")
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const response = await this.repository.deleteFile(path)

      if (response.success) {
        // Reload the file tree
        await this.loadFileTree()
      } else {
        fileSystemActions.setError(response.error || "Failed to delete file")
      }
    } catch (error) {
      fileSystemActions.setError(error instanceof Error ? error.message : "Unknown error")
    }
  }

  dispose(): void {
    // Cleanup if needed
  }
}
