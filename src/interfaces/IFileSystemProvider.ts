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
}

export interface FileSystemStats {
  totalFiles: number
  totalDirectories: number
  totalSize: number
  maxDepth: number
  largestFile?: FileNode
}

export interface IFileSystemProvider {
  readonly name: string
  initialize(): Promise<void>
  getFileTree(): Promise<FileNode[]>
  getNode(path: string): Promise<FileNode | null>
  createDirectory(path: string): Promise<void>
  deleteNode(path: string): Promise<void>
  moveNode(fromPath: string, toPath: string): Promise<void>
  copyNode(fromPath: string, toPath: string): Promise<void>
  getStats(): Promise<FileSystemStats>
  dispose(): Promise<void>
}
