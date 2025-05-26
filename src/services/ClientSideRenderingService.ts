import type { FileNode } from "../interfaces/IFileSystemProvider"
import type { PreviewTheme } from "../utils/PreviewThemes"
import type { ILoggingService } from "./LoggingService"

export interface ClientRenderOptions {
  width: number
  height: number
  format: "png" | "jpeg" | "webp" | "svg"
  theme: PreviewTheme
  structure: "flat" | "hierarchical" | "tree" | "list"
  quality?: number
  scale?: number
}

export interface ClientRenderResult {
  success: boolean
  data?: Blob
  url?: string
  error?: string
  metadata?: {
    renderTime: number
    size: number
    format: string
    fallbackUsed: boolean
  }
}

export class ClientSideRenderingService {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor(private logger: ILoggingService) {
    this.canvas = document.createElement("canvas")
    this.ctx = this.canvas.getContext("2d")!
    this.logger.info("ClientRender", "Client-side rendering service initialized")
  }

  async renderFileTree(fileTree: FileNode[], options: ClientRenderOptions): Promise<ClientRenderResult> {
    const startTime = performance.now()

    try {
      this.logger.info("ClientRender", "Starting client-side rendering", {
        nodeCount: this.countNodes(fileTree),
        options,
      })

      // Set canvas dimensions
      this.canvas.width = options.width * (options.scale || 1)
      this.canvas.height = options.height * (options.scale || 1)

      // Clear canvas
      this.ctx.fillStyle = options.theme.colors.background
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

      // Render based on structure type
      switch (options.structure) {
        case "hierarchical":
          await this.renderHierarchical(fileTree, options)
          break
        case "flat":
          await this.renderFlat(fileTree, options)
          break
        case "tree":
          await this.renderTree(fileTree, options)
          break
        case "list":
          await this.renderList(fileTree, options)
          break
      }

      // Convert to blob
      const blob = await this.canvasToBlob(options.format, options.quality)
      const url = URL.createObjectURL(blob)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      this.logger.info("ClientRender", "Client-side rendering completed", {
        renderTime,
        size: blob.size,
        format: options.format,
      })

      return {
        success: true,
        data: blob,
        url,
        metadata: {
          renderTime,
          size: blob.size,
          format: options.format,
          fallbackUsed: true,
        },
      }
    } catch (error) {
      this.logger.error("ClientRender", "Client-side rendering failed", { error: error.message })
      return {
        success: false,
        error: error.message,
      }
    }
  }

  private async renderHierarchical(fileTree: FileNode[], options: ClientRenderOptions): Promise<void> {
    const { theme } = options
    const padding = theme.spacing.padding
    const lineHeight = 24
    let y = padding

    // Set font
    this.ctx.font = `${theme.spacing.padding}px ${theme.fonts.primary}`
    this.ctx.textBaseline = "middle"

    const renderNode = (node: FileNode, depth = 0) => {
      const x = padding + depth * theme.spacing.indentation

      // Draw connection lines
      if (theme.layout.showLines && depth > 0) {
        this.ctx.strokeStyle = theme.colors.border
        this.ctx.lineWidth = 1
        this.ctx.beginPath()
        this.ctx.moveTo(x - theme.spacing.indentation / 2, y)
        this.ctx.lineTo(x - theme.spacing.margin, y)
        this.ctx.stroke()
      }

      // Draw icon
      if (theme.layout.showIcons) {
        this.ctx.fillStyle = node.type === "directory" ? theme.colors.directoryIcon : theme.colors.fileIcon
        this.ctx.fillText(node.type === "directory" ? "📁" : "📄", x, y)
      }

      // Draw text
      const textX = x + (theme.layout.showIcons ? 20 : 0)
      this.ctx.fillStyle = node.type === "directory" ? theme.colors.primary : theme.colors.textPrimary
      this.ctx.fillText(node.name, textX, y)

      // Draw file size
      if (theme.layout.showFileSize && node.size) {
        const sizeText = this.formatBytes(node.size)
        const textWidth = this.ctx.measureText(node.name).width
        this.ctx.fillStyle = theme.colors.textSecondary
        this.ctx.font = `${theme.spacing.padding - 2}px ${theme.fonts.mono}`
        this.ctx.fillText(sizeText, textX + textWidth + 10, y)
        this.ctx.font = `${theme.spacing.padding}px ${theme.fonts.primary}`
      }

      y += lineHeight

      // Render children
      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => renderNode(child, depth + 1))
      }
    }

    fileTree.forEach((node) => renderNode(node))
  }

  private async renderFlat(fileTree: FileNode[], options: ClientRenderOptions): Promise<void> {
    const { theme } = options
    const padding = theme.spacing.padding
    const lineHeight = 20
    let y = padding

    this.ctx.font = `${theme.spacing.padding}px ${theme.fonts.primary}`
    this.ctx.textBaseline = "middle"

    const allNodes = this.flattenNodes(fileTree)

    allNodes.forEach((node) => {
      const x = padding

      // Draw icon
      if (theme.layout.showIcons) {
        this.ctx.fillStyle = node.type === "directory" ? theme.colors.directoryIcon : theme.colors.fileIcon
        this.ctx.fillText(node.type === "directory" ? "📁" : "📄", x, y)
      }

      // Draw path
      const textX = x + (theme.layout.showIcons ? 20 : 0)
      this.ctx.fillStyle = theme.colors.textPrimary
      this.ctx.fillText(node.path, textX, y)

      y += lineHeight
    })
  }

  private async renderTree(fileTree: FileNode[], options: ClientRenderOptions): Promise<void> {
    // Similar to hierarchical but with tree-specific styling
    await this.renderHierarchical(fileTree, options)
  }

  private async renderList(fileTree: FileNode[], options: ClientRenderOptions): Promise<void> {
    const { theme } = options
    const padding = theme.spacing.padding
    const lineHeight = 22
    let y = padding

    this.ctx.font = `${theme.spacing.padding}px ${theme.fonts.primary}`
    this.ctx.textBaseline = "middle"

    // Group by directory
    const directories = new Map<string, FileNode[]>()

    const collectNodes = (nodes: FileNode[], parentPath = "") => {
      nodes.forEach((node) => {
        const dirPath = parentPath || "/"
        if (!directories.has(dirPath)) {
          directories.set(dirPath, [])
        }
        directories.get(dirPath)!.push(node)

        if (node.children) {
          collectNodes(node.children, node.path)
        }
      })
    }

    collectNodes(fileTree)

    // Render each directory
    for (const [dirPath, nodes] of directories) {
      // Directory header
      this.ctx.fillStyle = theme.colors.primary
      this.ctx.font = `bold ${theme.spacing.padding + 2}px ${theme.fonts.primary}`
      this.ctx.fillText(dirPath, padding, y)
      y += lineHeight + 5

      // Files in directory
      this.ctx.font = `${theme.spacing.padding}px ${theme.fonts.primary}`
      nodes.forEach((node) => {
        const x = padding + 20

        if (theme.layout.showIcons) {
          this.ctx.fillStyle = node.type === "directory" ? theme.colors.directoryIcon : theme.colors.fileIcon
          this.ctx.fillText(node.type === "directory" ? "📁" : "📄", x, y)
        }

        const textX = x + (theme.layout.showIcons ? 20 : 0)
        this.ctx.fillStyle = theme.colors.textPrimary
        this.ctx.fillText(node.name, textX, y)

        y += lineHeight
      })

      y += 10 // Space between directories
    }
  }

  private async canvasToBlob(format: string, quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const mimeType = `image/${format}`
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to create blob from canvas"))
          }
        },
        mimeType,
        quality ? quality / 100 : undefined,
      )
    })
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

  private flattenNodes(fileTree: FileNode[]): FileNode[] {
    const nodes: FileNode[] = []
    const traverse = (node: FileNode) => {
      nodes.push(node)
      if (node.children) {
        node.children.forEach(traverse)
      }
    }
    fileTree.forEach(traverse)
    return nodes
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }
}
