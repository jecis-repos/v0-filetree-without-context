export interface FileNode {
  id: string
  name: string
  type: "file" | "directory"
  size?: number
  children?: FileNode[]
  path: string
  lastModified?: Date
  permissions?: string
  metadata?: Record<string, any>
  mimeType?: string
  thumbnailUrl?: string
  previewUrl?: string
}

export interface FileSystemStats {
  totalFiles: number
  totalDirectories: number
  totalSize: number
  maxDepth: number
  largestFile?: FileNode
  fileTypes?: Record<string, number>
  averageFileSize?: number
  creationDate?: Date
  lastModifiedDate?: Date
}

export interface FileOperationResult {
  success: boolean
  error?: string
}

export interface FileSearchOptions {
  query: string
  matchCase?: boolean
  matchWholeWord?: boolean
  includeContent?: boolean
  fileTypes?: string[]
  maxResults?: number
}

export interface IFileSystemProvider {
  readonly name: string
  initialize(): Promise<void>
  getFileTree(): Promise<FileNode[]>
  getNode(path: string): Promise<FileNode | null>
  createDirectory(path: string): Promise<FileOperationResult>
  createFile(path: string, content?: string | ArrayBuffer): Promise<FileOperationResult>
  deleteNode(path: string): Promise<FileOperationResult>
  moveNode(fromPath: string, toPath: string): Promise<FileOperationResult>
  copyNode(fromPath: string, toPath: string): Promise<FileOperationResult>
  renameNode(path: string, newName: string): Promise<FileOperationResult>
  getStats(): Promise<FileSystemStats>
  searchFiles(options: FileSearchOptions): Promise<FileNode[]>
  getFileContent(path: string): Promise<string | ArrayBuffer | null>
  setFileContent(path: string, content: string | ArrayBuffer): Promise<FileOperationResult>
  importFileTree(nodes: FileNode[]): Promise<FileOperationResult>
  dispose(): Promise<void>
}
