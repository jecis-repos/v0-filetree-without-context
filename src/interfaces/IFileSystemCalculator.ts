import type { FileNode, FileSystemStats } from "./IFileSystemProvider"

export interface IFileSystemCalculator {
  calculateStats(nodes: FileNode[]): FileSystemStats
  calculateDirectorySize(node: FileNode): number
  findLargestFiles(nodes: FileNode[], count: number): FileNode[]
  calculateDepth(nodes: FileNode[]): number
  filterByType(nodes: FileNode[], type: "file" | "directory"): FileNode[]
  searchNodes(nodes: FileNode[], query: string): FileNode[]
}
