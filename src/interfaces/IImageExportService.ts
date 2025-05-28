import type { FileNode } from "./IFileSystemProvider"

export interface ExportOptions {
  width?: number
  height?: number
  format?: "jpeg" | "png" | "webp"
  quality?: number
  backgroundColor?: string
  textColor?: string
  fontSize?: number
  includeStats?: boolean
  showFileTypes?: boolean
  visualizationType?: "tree" | "sunburst" | "treemap" | "list"
  theme?: string
}

export interface ImageExportResult {
  success: boolean
  data?: Blob
  url?: string
  metadata?: {
    format?: string
    size?: number
    width?: number
    height?: number
    [key: string]: any
  }
  error?: string
}

export interface IImageExportService {
  exportFileTreeAsImage(fileTree: FileNode[], options: ExportOptions): Promise<ImageExportResult>
  exportDirectoryVisualization(
    fileTree: FileNode[],
    options: ExportOptions & { visualizationType: "tree" | "sunburst" | "treemap" },
  ): Promise<ImageExportResult>
  downloadImage(result: ImageExportResult, filename?: string): Promise<void>
}
