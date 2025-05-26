import type { FileNode } from "./IFileSystemProvider"

export interface ImportOptions {
  includeContent?: boolean
  maxFileSize?: number
  allowedExtensions?: string[]
  preserveStructure?: boolean
}

export interface ImportResult {
  success: boolean
  nodes: FileNode[]
  errors: string[]
  totalFiles: number
  importedFiles: number
}

export interface IFileImporter {
  importFromFiles(files: FileList, options?: ImportOptions): Promise<ImportResult>
  importFromDirectory(directoryHandle: FileSystemDirectoryHandle, options?: ImportOptions): Promise<ImportResult>
  importFromJSON(jsonData: string, options?: ImportOptions): Promise<ImportResult>
}
