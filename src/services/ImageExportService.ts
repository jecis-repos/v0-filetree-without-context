import type { FileNode } from "../interfaces/IFileSystemProvider"
import type { PhpImageProvider, ImageGenerationOptions, ImageExportResult } from "../providers/PhpImageProvider"
import type { ILoggingService } from "./LoggingService"
import type { IPerformanceMonitor } from "../interfaces/IPerformanceMonitor"
import { FilePathParser, type VisualizationOptions } from "../utils/FilePathParser"
import { getTheme, type PreviewTheme } from "../utils/PreviewThemes"

export interface ExportOptions extends ImageGenerationOptions {
  includeStats?: boolean
  showFileTypes?: boolean
  visualizationType?: "tree" | "sunburst" | "treemap" | "list"
  theme?: string
  structure?: "flat" | "hierarchical" | "tree" | "list"
  sortBy?: "name" | "size" | "date" | "type"
  sortOrder?: "asc" | "desc"
  showHidden?: boolean
  maxDepth?: number
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
      // Apply theme settings
      const theme = getTheme(options.theme || "modern")
      const enhancedOptions = this.applyThemeToOptions(options, theme)

      // Parse file structure based on options
      const filePaths = this.extractFilePaths(fileTree)
      const visualizationOptions: VisualizationOptions = {
        structure: options.structure || "hierarchical",
        sortBy: options.sortBy,
        sortOrder: options.sortOrder,
        showHidden: options.showHidden,
        maxDepth: options.maxDepth,
      }

      const parsedStructure = FilePathParser.parseFilePaths(filePaths, visualizationOptions)

      // Generate the image using PHP with parsed structure
      const result = await this.phpImageProvider.generateFileTreeImage(
        parsedStructure.nodes.map((n) => n.path),
        {
          ...enhancedOptions,
          metadata: {
            structure: parsedStructure.type,
            stats: parsedStructure.metadata,
            theme: theme,
          },
        },
      )

      if (result.success) {
        this.logger?.info("ImageExport", "File tree image exported successfully", result.metadata)
      } else {
        this.logger?.error("ImageExport", "Failed to export file tree image", { error: result.error })
      }

      this.performanceMonitor?.endTimer(timerId!, result.success)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger?.error("ImageExport", "Export failed", { error: errorMessage })
      this.performanceMonitor?.endTimer(timerId!, false, { error: errorMessage })
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  private applyThemeToOptions(options: ExportOptions, theme: PreviewTheme): ExportOptions {
    return {
      ...options,
      backgroundColor: options.backgroundColor || theme.colors.background,
      textColor: options.textColor || theme.colors.textPrimary,
      fontSize: options.fontSize || 12,
      fontFamily: options.fontFamily || theme.fonts.primary,
      // Add theme-specific styling
      themeData: {
        colors: theme.colors,
        fonts: theme.fonts,
        spacing: theme.spacing,
        icons: theme.icons,
        layout: theme.layout,
      },
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

      // Apply theme settings
      const theme = getTheme(options.theme || "modern")
      const enhancedOptions = this.applyThemeToOptions(options, theme)

      const result = await this.phpImageProvider.generateDirectoryVisualization(filePaths, enhancedOptions)

      if (result.success) {
        this.logger?.info("ImageExport", "Directory visualization exported successfully", result.metadata)
      } else {
        this.logger?.error("ImageExport", "Failed to export directory visualization", { error: result.error })
      }

      this.performanceMonitor?.endTimer(timerId!, result.success)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger?.error("ImageExport", "Visualization export failed", { error: errorMessage })
      this.performanceMonitor?.endTimer(timerId!, false, { error: errorMessage })
      return {
        success: false,
        error: errorMessage,
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

    try {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger?.error("ImageExport", "Download failed", { error: errorMessage })
      throw new Error(`Failed to download image: ${errorMessage}`)
    }
  }

  private extractFilePaths(fileTree: FileNode[]): string[] {
    const paths: string[] = []

    const traverse = (node: FileNode) => {
      if (node && typeof node.path === "string") {
        paths.push(node.path)
      }

      if (node && node.children && Array.isArray(node.children)) {
        node.children.forEach(traverse)
      }
    }

    if (Array.isArray(fileTree)) {
      fileTree.forEach(traverse)
    }

    return paths
  }

  private countNodes(fileTree: FileNode[]): number {
    let count = 0
    const traverse = (node: FileNode) => {
      count++
      if (node && node.children && Array.isArray(node.children)) {
        node.children.forEach(traverse)
      }
    }

    if (Array.isArray(fileTree)) {
      fileTree.forEach(traverse)
    }

    return count
  }
}
