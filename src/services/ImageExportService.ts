import type { FileNode } from "../interfaces/IFileSystemProvider"
import type { PhpImageProvider, ImageGenerationOptions, ImageExportResult } from "../providers/PhpImageProvider"
import type { ILoggingService } from "./LoggingService"
import type { IPerformanceMonitor } from "../interfaces/IPerformanceMonitor"

export interface ExportOptions extends ImageGenerationOptions {
  includeStats?: boolean
  showFileTypes?: boolean
  visualizationType?: "tree" | "sunburst" | "treemap" | "list"
  theme?: "light" | "dark"
}

export class ImageExportService {
  constructor(
    private phpImageProvider: PhpImageProvider,
    private logger?: ILoggingService,
    private performanceMonitor?: IPerformanceMonitor,
  ) {
    this.logger?.info("ImageExport", "ImageExportService initialized")
  }

  async exportFileTreeAsImage(fileTree: FileNode[], options: ExportOptions): Promise<ImageExportResult> {
    const timerId = this.performanceMonitor?.startTimer("export_file_tree_image")
    this.logger?.info("ImageExport", "Exporting file tree as image", {
      nodeCount: this.countNodes(fileTree),
      options,
    })

    try {
      // Extract file paths from the tree
      const filePaths = this.extractFilePaths(fileTree)

      // Generate the image using PHP
      const result = await this.phpImageProvider.generateFileTreeImage(filePaths, options)

      if (result.success) {
        this.logger?.info("ImageExport", "File tree image exported successfully", result.metadata)
      } else {
        this.logger?.error("ImageExport", "Failed to export file tree image", { error: result.error })
      }

      this.performanceMonitor?.endTimer(timerId!, result.success)
      return result
    } catch (error) {
      this.logger?.error("ImageExport", "Export failed", { error: error.message })
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async exportDirectoryVisualization(
    fileTree: FileNode[],
    options: ExportOptions & { visualizationType: "tree" | "sunburst" | "treemap" },
  ): Promise<ImageExportResult> {
    const timerId = this.performanceMonitor?.startTimer("export_directory_visualization")
    this.logger?.info("ImageExport", "Exporting directory visualization", {
      nodeCount: this.countNodes(fileTree),
      type: options.visualizationType,
    })

    try {
      const filePaths = this.extractFilePaths(fileTree)

      const result = await this.phpImageProvider.generateDirectoryVisualization(filePaths, options)

      if (result.success) {
        this.logger?.info("ImageExport", "Directory visualization exported successfully", result.metadata)
      } else {
        this.logger?.error("ImageExport", "Failed to export directory visualization", { error: result.error })
      }

      this.performanceMonitor?.endTimer(timerId!, result.success)
      return result
    } catch (error) {
      this.logger?.error("ImageExport", "Visualization export failed", { error: error.message })
      this.performanceMonitor?.endTimer(timerId!, false, { error: error.message })
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async downloadImage(result: ImageExportResult, filename?: string): Promise<void> {
    if (!result.success || !result.data) {
      throw new Error("No image data to download")
    }

    this.logger?.info("ImageExport", "Downloading image", {
      size: result.data.size,
      format: result.metadata?.format,
      filename,
    })

    const url = result.url || URL.createObjectURL(result.data)
    const link = document.createElement("a")
    link.href = url
    link.download = filename || `file-tree-export.${result.metadata?.format || "png"}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up object URL if we created it
    if (!result.url) {
      URL.revokeObjectURL(url)
    }

    this.logger?.info("ImageExport", "Image download initiated", { filename: link.download })
  }

  private extractFilePaths(fileTree: FileNode[]): string[] {
    const paths: string[] = []

    const traverse = (node: FileNode) => {
      paths.push(node.path)
      if (node.children) {
        node.children.forEach(traverse)
      }
    }

    fileTree.forEach(traverse)
    return paths
  }

  private countNodes(fileTree: FileNode[]): number {
    let count = 0
    const traverse = (node: FileNode) => {
      count++
      if (node.children) {
        node.children.forEach(traverse)
      }
    }
    fileTree.forEach(traverse)
    return count
  }
}
