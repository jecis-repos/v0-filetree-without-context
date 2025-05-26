import type { FileNode } from "./IFileSystemProvider"

export interface ImportResult {
  success: boolean
  data?: FileNode[]
  error?: string
}

export interface IFileImporter {
  importFromLocalFile(file: File): Promise<ImportResult>
  importFromUrl(url: string): Promise<ImportResult>
  validateImportData(data: any): boolean
  sanitizeImportData(data: any): FileNode[]
}
